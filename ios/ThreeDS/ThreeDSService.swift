//
//  ThreeDSService+createSession.swift
//  ThreeDS
//
//  Created by kevin on 9/10/24.
//
import Foundation
import OSLog
import Ravelin3DS

@available(iOS 15.0, *)
public class ThreeDSService {
    let region: String
    let locale: String
    let sandbox: Bool
    let authenticationEndpoint: String
    let decoder = JSONDecoder()

    var apiBaseUrl: String = "api.basistheory.com"
    var service: ThreeDS2Service!
    var transaction: Transaction!
    var challengeReceiver: ChallengeHandler!
    var authenticationEndpointHeaders: [String: String]
    var apiKey: String

    public init(
        apiKey: String, region: String, locale: String, sandbox: Bool, apiBaseUrl: String,
        authenticationEndpoint: String, authenticationEndpointHeaders: [String: String]
    ) {
        self.apiKey = apiKey
        self.region = region
        self.locale = locale
        self.sandbox = sandbox
        self.apiBaseUrl = apiBaseUrl
        self.authenticationEndpoint = authenticationEndpoint
        self.authenticationEndpointHeaders = authenticationEndpointHeaders
        self.service = ThreeDS2SDK()
        self.decoder.keyDecodingStrategy = .convertFromSnakeCase
    }

    public static func builder() -> ThreeDSServiceBuilder {
        return ThreeDSServiceBuilder()
    }
}
