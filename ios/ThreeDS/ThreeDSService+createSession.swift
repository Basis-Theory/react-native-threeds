//
//  ThreeDSService+createSession.swift
//  ThreeDS
//
//  Created by kevin on 9/10/24.
//
import Foundation
import Ravelin3DS

@available(iOS 15.0, *)
extension ThreeDSService {
    public func createSession(
        tokenId: String? = nil,
        tokenIntentId: String? = nil
    ) async throws -> CreateThreeDsSessionResponse {
        guard (tokenId == nil) != (tokenIntentId == nil) else {
            throw ThreeDSServiceError.invalidParameters(
                "Either tokenId or tokenIntentId must be provided, but not both."
            )
        }

        do {
            let session = try await _createSession(tokenId: tokenId, tokenIntentId: tokenIntentId)

            self.transaction = try service.createTransaction(
                directoryServerID: session.directoryServerId,
                messageVersion: session.recommendedVersion)

            let authRequestParams = try self.transaction.getAuthenticationRequestParameters()

            let updatedSession = try await _updateSession(
                authRequestParams: authRequestParams, sessionId: session.id)

            return updatedSession
        } catch let error as ThreeDSServiceError {
            if case .invalidResponse = error {
                throw ThreeDSServiceError.sessionCreationError(error.localizedDescription)
            }
            Logger.log("Unknown error: \(error)")
            throw error
        }
    }

    func _createSession(
        tokenId: String? = nil,
        tokenIntentId: String? = nil
    ) async throws -> CreateThreeDsSessionResponse {
        var jsonBody: [String: String] = ["device": "app"]

        if let tokenId = tokenId {
            jsonBody["token_id"] = tokenId
        }

        if let tokenIntentId = tokenIntentId {
            jsonBody["token_intent_id"] = tokenIntentId
        }

        let requestBody = try JSONSerialization.data(withJSONObject: jsonBody, options: [])

        guard let createSessionEndpoint = URL(string: "https://\(apiBaseUrl)/3ds/sessions") else {
            throw ThreeDSServiceError.invalidURL
        }

        return try await makeRequest(
            url: createSessionEndpoint,
            method: "POST",
            body: requestBody,
            expectedStatusCodes: [200, 201]
        )
    }

    func _updateSession(
        authRequestParams: AuthenticationRequestParameters, sessionId: String
    )
        async throws -> CreateThreeDsSessionResponse
    {
        let updateSessionRequestPayload = UpdateThreeDsSessionRequest(
            deviceInfo: ThreeDSDeviceInfo(
                sdkTransactionId: authRequestParams.getSDKTransactionID(),
                sdkApplicationId: authRequestParams.getSDKAppID(),
                sdkEncryptionData: authRequestParams.getDeviceData(),
                sdkEphemeralPublicKey: authRequestParams.getSDKEphemeralPublicKey(),
                sdkMaxTimeout: "05",  // 5 minutes seems to be default
                sdkReferenceNumber: authRequestParams.getSDKReferenceNumber(),
                sdkRenderOptions: ThreeDSMobileSdkRenderOptions(
                    sdkInterface: RenderOptions.native.toRavelinCode(),
                    sdkUiType: [
                        UiTypes.textField.toRavelinCode(),
                        UiTypes.singleSelectField.toRavelinCode(),
                        UiTypes.multiSelectField.toRavelinCode(),
                        UiTypes.oob.toRavelinCode(),
                    ]
                )
            )
        )

        let payload = try JSONEncoder().encode(updateSessionRequestPayload)

        guard
            let updateSessionEndpoint = URL(
                string: "https://\(apiBaseUrl)/3ds/sessions/\(sessionId)")
        else {
            throw ThreeDSServiceError.invalidURL
        }

        return try await makeRequest(
            url: updateSessionEndpoint,
            method: "PUT",
            body: payload,
            expectedStatusCodes: [200]
        )

    }
}
