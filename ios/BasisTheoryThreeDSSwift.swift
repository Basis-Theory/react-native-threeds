import Foundation
import React
// ThreeDS is vendored into this same module — see BasisTheoryThreeDS.swift.

/// The Swift implementation behind the generated TurboModule interface.
///
/// The Objective-C++ adapter only forwards Codegen calls to this class. Token
/// references and session identifiers cross the module boundary, while raw card
/// data, challenge credentials, and private-key operations remain outside it.
@available(iOS 15.0, *)
@objcMembers
public final class BasisTheoryThreeDSSwift: NSObject {
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

    /// Builds and initializes the native SDK from public mobile configuration.
    /// `authenticationEndpoint` points to the merchant backend; it must perform
    /// private-key authentication without exposing that key to the app.
    public func configure(
        _ apiKey: String,
        authenticationEndpoint: String,
        apiBaseUrl: String,
        sandbox: Bool,
        locale: String,
        authenticationEndpointHeadersJson: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard !apiKey.isEmpty else {
            reject("INVALID_CONFIGURATION", "apiKey is required.", nil)
            return
        }

        guard !authenticationEndpoint.isEmpty else {
            reject("INVALID_CONFIGURATION", "authenticationEndpoint is required.", nil)
            return
        }

        let authenticationEndpointHeaders: [String: String]
        do {
            authenticationEndpointHeaders = try self.decodeHeaders(
                authenticationEndpointHeadersJson
            )
        } catch {
            reject("INVALID_CONFIGURATION", "Authentication headers must be valid JSON.", error)
            return
        }

        // The iOS SDK accepts a host rather than a complete URL. Restricting the
        // host prevents arbitrary endpoints from being introduced through
        // JavaScript configuration.
        let apiHost: String?
        do {
            apiHost = apiBaseUrl.isEmpty ? nil : try self.validatedApiHost(apiBaseUrl)
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

                if !locale.isEmpty {
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
    /// module boundary, preserving the intended PCI/security boundary.
    public func createSession(
        _ tokenIdValue: String,
        tokenIntentId tokenIntentIdValue: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard let service else {
            reject("NOT_CONFIGURED", "Configure the native 3DS SDK first.", nil)
            return
        }

        guard !isCreatingSession, !isAuthenticating else {
            reject("SESSION_IN_PROGRESS", "Wait for the active 3DS session to finish first.", nil)
            return
        }

        let tokenId = tokenIdValue.isEmpty ? nil : tokenIdValue
        let tokenIntentId = tokenIntentIdValue.isEmpty ? nil : tokenIntentIdValue

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
    public func startAuthentication(
        _ sessionId: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
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

    /// Converts the SDK value type into primitives supported by Codegen.
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

    /// The iOS SDK returns the raw EMV status ("N") for cancelled, timed-out,
    /// and errored challenges, while every other path and the Android SDK
    /// return `ThreeDSAuthenticationStatus` names.
    private func publicStatus(_ status: String) -> String {
        let emvStatuses = [
            "Y": "successful",
            "A": "attempted",
            "N": "failed",
            "U": "unavailable",
            "R": "rejected",
        ]

        return emvStatuses[status] ?? status
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

    private func decodeHeaders(_ json: String) throws -> [String: String] {
        guard !json.isEmpty else {
            return [:]
        }

        let value = try JSONSerialization.jsonObject(with: Data(json.utf8))
        guard let headers = value as? [String: String] else {
            throw NativeThreeDSError.invalidHeaders
        }

        return headers
    }
}

private enum NativeThreeDSError: LocalizedError {
    case invalidApiBaseUrl
    case invalidHeaders

    var errorDescription: String? {
        switch self {
        case .invalidApiBaseUrl:
            return "apiBaseUrl must target api.basistheory.com or api.flock-dev.com."
        case .invalidHeaders:
            return "Authentication endpoint headers must be a string dictionary."
        }
    }
}
