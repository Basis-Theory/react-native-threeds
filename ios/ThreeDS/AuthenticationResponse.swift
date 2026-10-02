//
//  AuthenticationResponse.swift
//  ThreeDS
//
//  Created by kevin on 9/10/24.
//

struct AuthenticationResponse: Codable {
    let panTokenId: String
    let threedsVersion: String
    let acsTransactionId: String
    let dsTransactionId: String
    let sdkTransactionId: String
    let acsReferenceNumber: String
    let dsReferenceNumber: String
    let authenticationValue: String?
    let authenticationStatus: String
    let authenticationStatusCode: String
    let eci: String?
    let purchaseAmount: String
    let merchantName: String
    let currency: String?
    let acsChallengeMandated: String?
    let authenticationChallengeType: String?
    let authenticationStatusReason: String?
    let acsSignedContent: String?
    let messageExtensions: [String]?
    let acsRenderingType: AcsRenderingType?
}

struct AcsRenderingType: Codable {
    let acsInterface: String
    let acsUiTemplate: String
}
