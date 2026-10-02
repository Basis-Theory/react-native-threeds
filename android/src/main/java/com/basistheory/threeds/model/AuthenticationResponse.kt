package com.basistheory.threeds.model

import kotlinx.serialization.Serializable


@Serializable
data class AuthenticationResponse(
    val panTokenId: String,

    val threedsVersion: String,

    val acsTransactionId: String,

    val dsTransactionId: String,

    val sdkTransactionId: String,

    val acsReferenceNumber: String,

    val dsReferenceNumber: String,

    val authenticationValue: String = "",

    val authenticationStatus: String,

    val authenticationStatusCode: String,

    val eci: String = "",

    val purchaseAmount: String,

    val merchantName: String,

    val currency: String?,

    val acsChallengeMandated: String? = null,

    val authenticationChallengeType: String? = null,

    val authenticationStatusReason: String? = null,

    val acsSignedContent: String? = null,

    val messageExtensions: List<String> = emptyList(),

    val acsRenderingType: AcsRenderingType? = null
)

@Serializable
data class AcsRenderingType(
    val acsInterface: String,
    val acsUiTemplate: String
)