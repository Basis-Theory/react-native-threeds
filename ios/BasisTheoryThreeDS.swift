import Foundation
import React
import ThreeDS

/// A deliberately thin React Native adapter around the Basis Theory iOS 3DS SDK.
///
/// The bridge accepts token references and session identifiers, never raw card
/// data or challenge credentials. Business decisions and private-key operations
/// remain on the merchant backend, while the iOS SDK owns device collection and
/// native challenge presentation.
@available(iOS 15.0, *)
@objc(BasisTheoryThreeDS)
final class BasisTheoryThreeDS: NSObject {
    /// The configured iOS SDK instance. Configuration must complete before a
    /// session can be created.
    private var service: ThreeDSService?

    /// Guards the iOS SDK's current single-transaction model. A production API
    /// could replace this with an explicit state machine if the SDK later
    /// supports concurrent transactions or cancellation.
    private var activeSessionId: String?

    /// Covers the short asynchronous window before the SDK returns a session
    /// identifier, when `activeSessionId` alone cannot reject duplicate calls.
    private var isCreatingSession = false

    /// React Native creates this module on the main queue because it eventually
    /// interacts with UIKit to present the native challenge.
    @objc
    static func requiresMainQueueSetup() -> Bool {
        true
    }

    /// Serializes bridge calls and mutable SDK state on the main queue. If
    /// expensive native work is added later, move only that work off-main and
    /// keep state transitions and UIKit calls isolated here.
    @objc
    var methodQueue: DispatchQueue {
        DispatchQueue.main
    }

    /// Builds and initializes the native SDK from public mobile configuration.
    /// `authenticationEndpoint` points to the merchant backend; it must perform
    /// private-key authentication without exposing that key to the app.
    @objc(configure:resolver:rejecter:)
    func configure(
        _ configuration: NSDictionary,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard let apiKey = configuration["apiKey"] as? String, !apiKey.isEmpty else {
            reject("INVALID_CONFIGURATION", "apiKey is required.", nil)
            return
        }

        guard
            let authenticationEndpoint = configuration["authenticationEndpoint"] as? String,
            !authenticationEndpoint.isEmpty
        else {
            reject("INVALID_CONFIGURATION", "authenticationEndpoint is required.", nil)
            return
        }

        let authenticationEndpointHeaders =
            configuration["authenticationEndpointHeaders"] as? [String: String] ?? [:]
        let locale = configuration["locale"] as? String
        let sandbox = configuration["sandbox"] as? Bool ?? false
        let apiBaseUrl = configuration["apiBaseUrl"] as? String

        // The SDK initialization is asynchronous, but the resulting service and
        // React Native promise are coordinated on the main actor.
        Task { @MainActor in
            do {
                let builder = ThreeDSService.builder()
                    .withApiKey(apiKey)
                    .withAuthenticationEndpoint(
                        authenticationEndpoint,
                        authenticationEndpointHeaders
                    )

                if let locale {
                    builder.withLocale(locale)
                }

                if sandbox {
                    builder.withSandbox()
                }

                if let apiBaseUrl {
                    // The iOS SDK accepts a host rather than a complete URL.
                    // Restricting the host prevents arbitrary endpoints from
                    // being introduced through JavaScript configuration.
                    let apiHost = try self.validatedApiHost(apiBaseUrl)
                    if apiHost == "api.flock-dev.com" {
                        builder.withBaseUrl(apiHost)
                    }
                }

                let service = try builder.build()
                try await service.initialize { warnings in
                    // Publish the service only after the underlying Ravelin SDK
                    // invokes its initialization callback.
                    self.service = service
                    self.activeSessionId = nil
                    self.isCreatingSession = false
                    resolve(warnings?.map(\.message) ?? [])
                }
            } catch {
                reject("INITIALIZATION_FAILED", error.localizedDescription, error)
            }
        }
    }

    /// Creates an app-based 3DS session and lets the iOS SDK attach native
    /// device information. Only a token or token-intent reference crosses the
    /// bridge, preserving the intended PCI/security boundary.
    @objc(createSession:resolver:rejecter:)
    func createSession(
        _ request: NSDictionary,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard let service else {
            reject("NOT_CONFIGURED", "Configure the native 3DS SDK first.", nil)
            return
        }

        guard activeSessionId == nil, !isCreatingSession else {
            reject("SESSION_IN_PROGRESS", "Complete the active 3DS session first.", nil)
            return
        }

        let tokenId = request["tokenId"] as? String
        let tokenIntentId = request["tokenIntentId"] as? String

        // XOR ensures the caller supplies exactly one supported card reference.
        guard (tokenId == nil) != (tokenIntentId == nil) else {
            reject(
                "INVALID_SESSION_REQUEST",
                "Provide either tokenId or tokenIntentId, but not both.",
                nil
            )
            return
        }

        isCreatingSession = true
        Task { @MainActor in
            do {
                let session = try await service.createSession(
                    tokenId: tokenId,
                    tokenIntentId: tokenIntentId
                )
                // Keep the native transaction paired with the session returned
                // to JavaScript. The current iOS SDK stores only one transaction.
                self.isCreatingSession = false
                self.activeSessionId = session.id
                resolve([
                    "id": session.id,
                    "cardBrand": session.cardBrand,
                    "additionalCardBrands": session.additionalCardBrands ?? [],
                ])
            } catch {
                self.isCreatingSession = false
                reject("SESSION_CREATION_FAILED", error.localizedDescription, error)
            }
        }
    }

    /// Authenticates the active session through the merchant endpoint and, when
    /// required, presents the Ravelin challenge from React Native's currently
    /// visible view controller.
    @objc(startAuthentication:resolver:rejecter:)
    func startAuthentication(
        _ sessionId: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard let service else {
            reject("NOT_CONFIGURED", "Configure the native 3DS SDK first.", nil)
            return
        }

        guard activeSessionId == sessionId else {
            reject("INVALID_SESSION", "The session is not active in the native SDK.", nil)
            return
        }

        Task { @MainActor in
            // Resolving the presented controller at call time avoids retaining
            // a stale controller across React Native navigation changes.
            guard let viewController = RCTPresentedViewController() else {
                reject("NO_VIEW_CONTROLLER", "Unable to present the native 3DS challenge.", nil)
                return
            }

            do {
                try await service.startChallenge(
                    sessionId: sessionId,
                    viewController: viewController,
                    onCompleted: { result in
                        self.activeSessionId = nil
                        resolve(self.dictionary(from: result))
                    },
                    onFailure: { result in
                        // Challenge failures are valid 3DS outcomes, so return
                        // them to JavaScript. Promise rejection is reserved for
                        // bridge, transport, or SDK execution errors.
                        self.activeSessionId = nil
                        resolve(self.dictionary(from: result))
                    }
                )
            } catch {
                self.activeSessionId = nil
                reject("AUTHENTICATION_FAILED", error.localizedDescription, error)
            }
        }
    }

    /// Converts the SDK value type into JSON-compatible primitives understood
    /// by React Native's legacy bridge.
    private func dictionary(from result: ChallengeResponse) -> [String: Any] {
        var dictionary: [String: Any] = [
            "id": result.id,
            "status": result.status,
        ]

        if let details = result.details {
            dictionary["details"] = details
        }

        return dictionary
    }

    /// Allows only the production API and the internal development API used by
    /// this POC. A productionized configuration could make environments a typed
    /// enum instead of accepting a free-form string.
    private func validatedApiHost(_ value: String) throws -> String {
        let normalizedValue = value.contains("://") ? value : "https://\(value)"
        guard
            let host = URL(string: normalizedValue)?.host,
            ["api.basistheory.com", "api.flock-dev.com"].contains(host)
        else {
            throw NativeThreeDSError.invalidApiBaseUrl
        }

        return host
    }
}

private enum NativeThreeDSError: LocalizedError {
    case invalidApiBaseUrl

    var errorDescription: String? {
        "apiBaseUrl must target api.basistheory.com or api.flock-dev.com."
    }
}
