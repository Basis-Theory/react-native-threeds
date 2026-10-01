//
//  CreateThreeDsSessionResponse.swift
//  ThreeDS
//
//  Created by kevin on 9/10/24.
//

public struct CreateThreeDsSessionResponse: Decodable, Encodable, Sendable {
    public let id: String
    public let methodUrl: String
    public let cardBrand: String
    public let methodNotificationUrl: String
    public let directoryServerId: String
    public let recommendedVersion: String
    public let additionalCardBrands: [String]?
}
