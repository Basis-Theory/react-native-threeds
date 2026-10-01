package com.basistheory.threeds.model

import kotlinx.serialization.Serializable

@Serializable
data class ChallengeResponse(
    val id: String,
    val status: String,
    val details: String? = null
)