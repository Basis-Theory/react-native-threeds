package com.basistheory.threeds.model

class ThreeDSInitializationError(e: String) : Exception("Failed to initialize 3DS Service, $e")

class ThreeDSSessionCreationError(e: String) : Exception("Unable to create session, $e")

class ThreeDSAuthenticationError(e: String) : Exception("Unable to authenticate, $e")

class ThreeDSServiceError(e: Int) : Exception("3DS service responded $e")