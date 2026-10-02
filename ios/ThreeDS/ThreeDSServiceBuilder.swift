//
//  ThreeDSServiceBuilder.swift
//  ThreeDS
//
//  Created by kevin on 9/10/24.
//
import Foundation

@available(iOS 15.0, *)
public class ThreeDSServiceBuilder {
    private let regionMap: [RegionEnum: String] = [.EU: "EuLive", .US: "USLive"]
    private var apiKey: String?
    private var region: String
    private var locale: String?
    private var sandbox: Bool = false
    private var authenticationEndpoint: String?
    private var authenticationEndpointHeaders: [String: String] = [:]
    private var apiBaseUrl: String = "api.basistheory.com"

    init() {
        self.region = regionMap[.EU]!  // Default to EU
    }

    @discardableResult
    public func withApiKey(_ apiKey: String) -> ThreeDSServiceBuilder {
        self.apiKey = apiKey
        return self
    }

    @discardableResult
    public func withAuthenticationEndpoint(_ authenticationEndpoint: String, _ authenticationEndpointHeaders: [String: String]? = [:])
        -> ThreeDSServiceBuilder
    {
        self.authenticationEndpoint = authenticationEndpoint
        self.authenticationEndpointHeaders = authenticationEndpointHeaders ?? [:]
        return self
    }

    @discardableResult
    public func withLocale(_ _locale: String?) -> ThreeDSServiceBuilder {
        self.locale = _locale
        return self
    }

    @discardableResult
    public func withSandbox() -> ThreeDSServiceBuilder {
        self.sandbox = true
        return self
    }

    /***
     ** Internal use only*
     **/
    @discardableResult
    public func withBaseUrl(_ apiBaseUrl: String) -> ThreeDSServiceBuilder {
        assert(apiBaseUrl == "api.flock-dev.com", "Invalid base URL")
        self.apiBaseUrl = apiBaseUrl
        return self
    }

    public func build() throws -> ThreeDSService {
        guard let apiKey = apiKey else {
            throw ThreeDSServiceError.missingApiKey
        }
        guard let authenticationEndpoint = authenticationEndpoint else {
            throw ThreeDSServiceError.missingAuthenticationEndpoint
        }

        let localeOrDefault: String =
            locale != nil
            ? locale!
            : (NSLocale.autoupdatingCurrent.languageCode ?? "en") + "-"
                + (NSLocale.autoupdatingCurrent.regionCode ?? "US")

        return ThreeDSService(
            apiKey: apiKey,
            region: region,
            locale: localeOrDefault,
            sandbox: sandbox,
            apiBaseUrl: apiBaseUrl,
            authenticationEndpoint: authenticationEndpoint,
            authenticationEndpointHeaders: authenticationEndpointHeaders
        )
    }
}
