//
//  ThreeDSSerivice+initialize.swift
//  ThreeDS
//
//  Created by kevin on 9/10/24.
//
import Foundation
import Ravelin3DS

@available(iOS 15.0, *)
extension ThreeDSService {
    public func initialize(completion: @escaping ([ThreeDSWarning]?) -> Void) async throws {
        let endpoint = "https://cdn.basistheory.com/keys/3ds.json"

        guard let url = URL(string: endpoint) else {
            throw ThreeDSServiceError.invalidURL
        }

        let (data, response) = try await URLSession.shared.data(from: url)

        guard let response = response as? HTTPURLResponse, response.statusCode == 200 else {
            throw ThreeDSServiceError.invalidResponse((response as? HTTPURLResponse)!.statusCode)
        }

        let keys = try self.decoder.decode(RavelinKeys.self, from: data)

        let configParameters = ConfigParameters()
        try configParameters.addParam(
            paramType: .publishableApiKey,
            paramValue: self.sandbox ? keys.test : keys.live)

        do {
            try self.service.initialize(
                configParameters: configParameters, locale: self.locale, uiCustomization: nil
            ) { success in
                guard success else {
                    completion(nil)
                    return
                }

                do {
                    let warnings: [ThreeDSWarning] = try self.service.getWarnings().map {
                        ThreeDSWarning(message: $0.getMessage())
                    }

                    completion(warnings)
                } catch {
                    completion(nil)
                }
            }
        } catch {
            throw ThreeDSServiceError.initializationError
        }
    }
}
