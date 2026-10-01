package com.basistheory.threeds.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable


@Serializable
data class CreateThreeDsSessionResponse(
    val id: String,

    @SerialName("method_url")
    val methodUrl: String,

    val cardBrand: String,

    @SerialName("method_notification_url")
    val methodNotificationUrl: String,

    @SerialName("directory_server_id")
    val directoryServerId: String,

    @SerialName("recommended_version")
    val recommendedVersion: String,

    @SerialName("additional_card_brands")
    val additionalCardBrands: List<String>? = null
)