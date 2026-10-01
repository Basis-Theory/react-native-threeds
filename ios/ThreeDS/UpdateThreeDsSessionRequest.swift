//
//  UpdateThreeDsSessionRequest.swift
//  ThreeDS
//
//  Created by kevin on 9/10/24.
//

struct UpdateThreeDsSessionRequest: Codable {
    let deviceInfo: ThreeDSDeviceInfo

    enum CodingKeys: String, CodingKey {
        case deviceInfo = "device_info"
    }
}

struct ThreeDSDeviceInfo: Codable {
    var sdkTransactionId: String?
    var sdkApplicationId: String?
    var sdkEncryptionData: String?
    var sdkEphemeralPublicKey: String?
    var sdkMaxTimeout: String?
    var sdkReferenceNumber: String?
    var sdkRenderOptions: ThreeDSMobileSdkRenderOptions?

    enum CodingKeys: String, CodingKey {
        case sdkTransactionId = "sdk_transaction_id"
        case sdkApplicationId = "sdk_application_id"
        case sdkEncryptionData = "sdk_encryption_data"
        case sdkEphemeralPublicKey = "sdk_ephemeral_public_key"
        case sdkMaxTimeout = "sdk_max_timeout"
        case sdkReferenceNumber = "sdk_reference_number"
        case sdkRenderOptions = "sdk_render_options"
    }
}

struct ThreeDSMobileSdkRenderOptions: Codable {
    var sdkInterface: String?
    var sdkUiType: [String]?

    enum CodingKeys: String, CodingKey {
        case sdkInterface = "sdk_interface"
        case sdkUiType = "sdk_ui_type"
    }
}
