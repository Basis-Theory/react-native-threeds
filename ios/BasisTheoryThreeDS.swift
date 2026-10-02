import Foundation
import React
// ThreeDS's own source is vendored directly into this pod's target by
// BasisTheoryReactNativeThreeDS.podspec's prepare_command (it has no
// CocoaPods podspec of its own), so its types are already part of this
// module — no `import ThreeDS` needed or possible.

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

    /// The session the SDK's single transaction belongs to. A new session
    /// replaces it until its authentication starts.
    private var activeSessionId: String?

    /// The iOS SDK holds one transaction, so a new session or configuration
    /// waits while one is being created or authenticated.
    private var isCreatingSession = false
    private var isAuthenticating = false

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
        guard let apiKey = nonBlank(configuration["apiKey"]) else {
            reject("INVALID_CONFIGURATION", "apiKey is required.", nil)
            return
        }

        guard let authenticationEndpoint = nonBlank(configuration["authenticationEndpoint"]) else {
            reject("INVALID_CONFIGURATION", "authenticationEndpoint is required.", nil)
            return
        }

        let authenticationEndpointHeaders =
            configuration["authenticationEndpointHeaders"] as? [String: String] ?? [:]
        let locale = nonBlank(configuration["locale"])
        let sandbox = configuration["sandbox"] as? Bool ?? false
        let apiBaseUrl = nonBlank(configuration["apiBaseUrl"])

        // The iOS SDK accepts a host rather than a complete URL. Restricting the
        // host prevents arbitrary endpoints from being introduced through
        // JavaScript configuration.
        let apiHost: String?
        do {
            apiHost = try apiBaseUrl.map(self.validatedApiHost)
        } catch {
            reject("INVALID_CONFIGURATION", error.localizedDescription, error)
            return
        }

        guard !isCreatingSession, !isAuthenticating else {
            reject("SESSION_IN_PROGRESS", "Wait for the active 3DS session to finish first.", nil)
            return
        }

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

                if apiHost == "api.flock-dev.com" {
                    builder.withBaseUrl("api.flock-dev.com")
                }

                let service = try builder.build()
                try await service.initialize { warnings in
                    // The iOS SDK reports a failed Ravelin initialization as nil
                    // warnings instead of throwing.
                    guard let warnings else {
                        reject("INITIALIZATION_FAILED", "The native 3DS SDK failed to initialize.", nil)
                        return
                    }

                    self.service = service
                    self.activeSessionId = nil
                    self.isCreatingSession = false
                    resolve(warnings.map(\.message))
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

        guard !isCreatingSession, !isAuthenticating else {
            reject("SESSION_IN_PROGRESS", "Wait for the active 3DS session to finish first.", nil)
            return
        }

        let tokenId = nonBlank(request["tokenId"])
        let tokenIntentId = nonBlank(request["tokenIntentId"])

        // XOR ensures the caller supplies exactly one supported card reference.
        guard (tokenId == nil) != (tokenIntentId == nil) else {
            reject(
                "INVALID_SESSION_REQUEST",
                "Provide exactly one of tokenId or tokenIntentId.",
                nil
            )
            return
        }

        // A session that was never authenticated, for example after the user
        // left checkout, is replaced by this one.
        isCreatingSession = true
        activeSessionId = nil
        Task { @MainActor in
            do {
                let session = try await service.createSession(
                    tokenId: tokenId,
                    tokenIntentId: tokenIntentId
                )
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

        guard !isAuthenticating else {
            reject("SESSION_IN_PROGRESS", "Wait for the active 3DS session to finish first.", nil)
            return
        }

        // Resolving the presented controller at call time avoids retaining
        // a stale controller across React Native navigation changes.
        guard let viewController = RCTPresentedViewController() else {
            reject("NO_VIEW_CONTROLLER", "Unable to present the native 3DS challenge.", nil)
            return
        }

        isAuthenticating = true
        Task { @MainActor in
            do {
                try await service.startChallenge(
                    sessionId: sessionId,
                    viewController: viewController,
                    onCompleted: { result in
                        self.finishAuthentication()
                        resolve(self.dictionary(from: result))
                    },
                    onFailure: { result in
                        // Challenge failures are valid 3DS outcomes, so return
                        // them to JavaScript. Promise rejection is reserved for
                        // bridge, transport, or SDK execution errors.
                        self.finishAuthentication()
                        resolve(self.dictionary(from: result))
                    }
                )
            } catch {
                self.finishAuthentication()
                reject("AUTHENTICATION_FAILED", error.localizedDescription, error)
            }
        }
    }

    private func finishAuthentication() {
        activeSessionId = nil
        isAuthenticating = false
    }

    /// Converts the SDK value type into JSON-compatible primitives understood
    /// by React Native's legacy bridge.
    private func dictionary(from result: ChallengeResponse) -> [String: Any] {
        var dictionary: [String: Any] = [
            "id": result.id,
            "status": publicStatus(result.status),
        ]

        if let details = result.details {
            dictionary["details"] = details
        }

        return dictionary
    }

    /// Maps every status the SDK returns to a `ThreeDSAuthenticationStatus`.
    /// The iOS SDK returns the raw EMV "N" for cancelled, timed-out, and
    /// errored challenges, and both SDKs return "challenge" when the challenge
    /// can't start. Unknown values also count as failed.
    private func publicStatus(_ status: String) -> String {
        let publicStatuses: Set = [
            "successful", "attempted", "failed", "unavailable", "rejected",
            "decoupled_challenge", "informational",
        ]
        let emvStatuses = [
            "Y": "successful",
            "A": "attempted",
            "N": "failed",
            "U": "unavailable",
            "R": "rejected",
        ]

        if publicStatuses.contains(status) {
            return status
        }

        return emvStatuses[status] ?? "failed"
    }

    /// Allows only the production API and Basis Theory's internal development
    /// API, so JavaScript can't point the SDK at an arbitrary host.
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

/// Blank and whitespace-only strings count as missing, as on Android.
private func nonBlank(_ value: Any?) -> String? {
    guard
        let string = value as? String,
        !string.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    else {
        return nil
    }

    return string
}

private enum NativeThreeDSError: LocalizedError {
    case invalidApiBaseUrl

    var errorDescription: String? {
        "apiBaseUrl must target api.basistheory.com or api.flock-dev.com."
    }
}
