package com.basistheory.threeds.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class UpdateThreeDsSessionRequest(
    @SerialName("device_info")
    val deviceInfo: ThreeDSDeviceInfo
)

@Serializable
data class ThreeDSDeviceInfo(
    @SerialName("sdk_transaction_id")
    var sdkTransactionId: String?,

    @SerialName("sdk_application_id")
    var sdkApplicationId: String?,

    @SerialName("sdk_encryption_data")
    var sdkEncryptionData: String?,

    @SerialName("sdk_ephemeral_public_key")
    var sdkEphemeralPublicKey: String?,

    @SerialName("sdk_max_timeout")
    var sdkMaxTimeout: String?,

    @SerialName("sdk_reference_number")
    var sdkReferenceNumber: String?,

    @SerialName("sdk_render_options")
    var sdkRenderOptions: ThreeDSMobileSdkRenderOptions?
)

@Serializable
data class ThreeDSMobileSdkRenderOptions(
    @SerialName("sdk_interface")
    var sdkInterface: String?,

    @SerialName("sdk_ui_type")
    var sdkUiType: List<String>?
)
