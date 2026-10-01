//
//  ChallengeResponse.swift
//  ThreeDS
//
//  Created by kevin on 9/10/24.
//

public struct ChallengeResponse: Codable {
    public let id: String
    public let status: String
    public let details: String?

    init(id: String, status: String, details: String? = nil) {
        self.id = id
        self.status = status
        self.details = details
    }
}


