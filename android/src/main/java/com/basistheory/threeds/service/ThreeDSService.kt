package com.basistheory.threeds.service

import android.app.Activity
import android.content.Context
import android.util.Log
import com.basistheory.threeds.model.AuthenticationResponse
import com.basistheory.threeds.model.ChallengeResponse
import com.basistheory.threeds.model.CreateThreeDsSessionResponse
import com.basistheory.threeds.model.RavelinKeys
import com.basistheory.threeds.model.ThreeDSAuthenticationError
import com.basistheory.threeds.model.ThreeDSDeviceInfo
import com.basistheory.threeds.model.ThreeDSInitializationError
import com.basistheory.threeds.model.ThreeDSMobileSdkRenderOptions
import com.basistheory.threeds.model.ThreeDSServiceError
import com.basistheory.threeds.model.ThreeDSSessionCreationError
import com.basistheory.threeds.model.UpdateThreeDsSessionRequest
import com.ravelin.core.configparameters.ConfigParametersBuilder
import com.ravelin.core.transaction.challenge.ChallengeParameters
import com.ravelin.threeDS2Service.instantiation.ThreeDS2ServiceInstance
import com.ul.emvco3ds.sdk.spec.AuthenticationRequestParameters
import com.ul.emvco3ds.sdk.spec.ChallengeStatusReceiver
import com.ul.emvco3ds.sdk.spec.CompletionEvent
import com.ul.emvco3ds.sdk.spec.ConfigParameters
import com.ul.emvco3ds.sdk.spec.ProtocolErrorEvent
import com.ul.emvco3ds.sdk.spec.RuntimeErrorEvent
import com.ul.emvco3ds.sdk.spec.Transaction
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import okhttp3.Headers
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

enum class Region {
    US,
    EU
}

class ThreeDSServiceBuilder {
    /** Default to EU, according to Ravelin our account was setup to work in the EU
     * US is reserved for "big holdings" in the US
     */
    private val regionMap = mapOf(Region.EU to "EuLive", Region.US to "USLive")

    private var apiKey: String? = null
    private var context: Context? = null
    private var region: String = regionMap[Region.EU]!!
    private var locale: String? = null
    private var scope: CoroutineScope? = null
    private var sandbox: Boolean = false
    private var authenticationEndpoint: String? = null
    private var apiBaseUrl: String = "api.basistheory.com"
    private var headers: Headers? = null

    fun withApiKey(apiKey: String) = apply {
        this.apiKey = apiKey
    }

    fun withApplicationContext(value: Context) = apply {
        this.context = value
    }

    fun withAuthenticationEndpoint(authenticationEndpoint: String, headers: Headers? = null) = apply {
        this.authenticationEndpoint = authenticationEndpoint
        this.headers = headers
    }

    fun withLocale(_locale: String?) = apply { this.locale = _locale }

    fun withSandbox() = apply {
        this.sandbox = true
    }

    /**
     * Internal use only
     */
    fun withBaseUrl(apiBaseUrl: String) = apply {
        require(apiBaseUrl == "api.flock-dev.com")

        this.apiBaseUrl = apiBaseUrl
    }

    fun build(): ThreeDSService {
        requireNotNull(apiKey)
        requireNotNull(context)
        requireNotNull(authenticationEndpoint)

        val localeOrDefault: String = context!!.let {
            locale
                ?: "${it.resources.configuration.locale.language}-${it.resources.configuration.locale.country}"
        }

        return ThreeDSService(
            apiKey = apiKey!!,
            context = context!!,
            authenticationEndpoint = authenticationEndpoint!!,
            authenticationEndpointHeaders = headers ?: Headers.Builder().build(),
            region = region,
            scope = scope,
            locale = localeOrDefault,
            sandbox = sandbox,
            apiBaseUrl = apiBaseUrl
        )
    }
}

class ThreeDSService(
    private val apiKey: String,
    private val context: Context,
    private val region: String,
    private val scope: CoroutineScope?,
    private val locale: String,
    private val sandbox: Boolean,
    private val apiBaseUrl: String,
    private val authenticationEndpoint: String,
    private val authenticationEndpointHeaders: Headers
) {
    /**
     * Change builder to ignore new keys to allow updates to the API without breaking
     */
    private val json = Json {
        ignoreUnknownKeys = true
    }

    private val sdk = ThreeDS2ServiceInstance.get()
    private val client = OkHttpClient()
    private var transaction: Transaction? = null

    companion object {
        fun Builder() = ThreeDSServiceBuilder()
    }

    suspend fun initialize(): List<String?>? {
        var warnings: List<String>? = null

        withContext(Dispatchers.IO) {
            runCatching {
                val req = Request.Builder()
                    .url("https://cdn.basistheory.com/keys/3ds.json")
                    .get()
                    .build()

                val keysResponseBody = client.newCall(req)
                    .execute().use {
                        val responseBody = requireNotNull(it.body?.string())
                        it.body?.close()
                        if (!it.isSuccessful) throw ThreeDSServiceError(it.code)

                        responseBody
                    }

                val ravelinApiKeys =
                    json.decodeFromString<RavelinKeys>(keysResponseBody)

                val configParameters: ConfigParameters = ConfigParametersBuilder
                    .Builder()
                    .setEnvironment(region)
                    .setApiToken("Bearer ${if (sandbox) ravelinApiKeys.test else ravelinApiKeys.live}")
                    .build()


                sdk.initialize(
                    context,
                    configParameters,
                    locale,
                    null, // UI customization not supported for V1
                    scope
                )
            }
        }.onSuccess {
            Log.i("3ds_service", "3DS Service initialized correctly, running security checks")

            /**  (Security Warnings)[https://developer.ravelin.com/merchant/libraries-and-sdks/android/3ds-sdk/android/#warnings]
             *  We leverage Ravelin SDKs to perform checks
             * SW01	The device is jailbroken.	HIGH
             * SW02	The integrity of the SDK has been tampered.	HIGH
             * SW03	An emulator is being used to run the App.	HIGH
             * SM04	A debugger is attached to the App.	MEDIUM
             * SW05	The OS or the OS version is not supported.	HIGH
             */
            warnings = sdk.getWarnings()
                ?.filter { it?.getID() in setOf("SW01", "SW02", "SW03", "SW04", "SW05") }
                ?.mapNotNull { it?.getMessage().toString().trim() }

        }.onFailure {
            Log.e("3DS_service", "${it.message}")
            throw ThreeDSInitializationError("${it.message}")
        }

        return warnings
    }

    suspend fun createSession(tokenId: String? = null, tokenIntentId: String? = null): CreateThreeDsSessionResponse? {
        require((tokenId == null) != (tokenIntentId == null)) {
            "Either tokenId or tokenIntentId must be provided, but not both"
        }

        var session: CreateThreeDsSessionResponse? = null

        withContext(Dispatchers.IO) {
            runCatching {
                val createSessionResponse = create3dsSession(tokenId=tokenId, tokenIntentId=tokenIntentId)

                transaction = sdk.createTransaction(
                    createSessionResponse.directoryServerId,
                    createSessionResponse.recommendedVersion
                )

                val authRequestParams = transaction!!.getAuthenticationRequestParameters()

                update3dsSession(createSessionResponse.id, requireNotNull(authRequestParams))
            }.onSuccess {
                Log.i("3ds_service", "3DS session ${it.id} created")
                session = it
            }.onFailure {
                Log.e("3DS_service", "${it.message}")
                throw ThreeDSSessionCreationError("${it.message}")
            }
        }

        return session
    }

    private fun create3dsSession(tokenId: String? = null, tokenIntentId: String? = null): CreateThreeDsSessionResponse {
        val createSessionBody = JSONObject().apply {
            tokenId?.let { put("token_id", tokenId) }
            tokenIntentId?.let { put("token_intent_id", tokenIntentId)}
            put("device", "app")
        }.toString().toRequestBody("application/json".toMediaType())

        val request = Request.Builder()
            .url("https://$apiBaseUrl/3ds/sessions")
            .addHeader("BT-API-KEY", apiKey)
            .post(createSessionBody)
            .build()

        val responseBody = client.newCall(request).execute().use { it ->
            val responseBody = requireNotNull(it.body?.string())
            it.body?.close()
            if (!it.isSuccessful) throw ThreeDSServiceError(it.code)
            responseBody
        }

        return json.decodeFromString<CreateThreeDsSessionResponse>(responseBody)
    }

    private fun update3dsSession(
        sessionId: String,
        authRequestParams: AuthenticationRequestParameters
    ): CreateThreeDsSessionResponse {
        val updateSessionBody = json.encodeToString(
            UpdateThreeDsSessionRequest(
                deviceInfo = ThreeDSDeviceInfo(
                    sdkEphemeralPublicKey = authRequestParams.getSDKEphemeralPublicKey(),
                    sdkReferenceNumber = authRequestParams.getSDKReferenceNumber(),
                    sdkApplicationId = authRequestParams.getSDKAppID(),
                    sdkMaxTimeout = "05", // 5 minutes seems to be default
                    sdkRenderOptions = ThreeDSMobileSdkRenderOptions(
                        sdkInterface = RenderOptions.Native.toRavelinCode(),
                        sdkUiType = listOf(
                            UiTypes.TextField.toRavelinCode(),
                            UiTypes.SingleSelectField.toRavelinCode(),
                            UiTypes.MultiSelectField.toRavelinCode(),
                            UiTypes.OOB.toRavelinCode()
                        )
                    ),
                    sdkTransactionId = authRequestParams.getSDKTransactionID(),
                    sdkEncryptionData = authRequestParams.getDeviceData()
                )
            )
        ).toRequestBody("application/json".toMediaType())

        val updateSessionRequest = Request.Builder()
            .url("https://${apiBaseUrl}/3ds/sessions/${sessionId}")
            .addHeader("BT-API-KEY", apiKey)
            .put(updateSessionBody)
            .build()

        val updateSessionResponseBody = client.newCall(updateSessionRequest).execute().use {
            val responseBody = requireNotNull(it.body?.string())
            it.body?.close()
            if (!it.isSuccessful) throw ThreeDSServiceError(it.code)
            responseBody
        }

        return json.decodeFromString<CreateThreeDsSessionResponse>(updateSessionResponseBody)
    }


    suspend fun startChallenge(
        sessionId: String,
        activity: Activity,
        onCompleted: (ChallengeResponse) -> Unit,
        onFailure: (ChallengeResponse) -> Unit
    ) {
        requireNotNull(transaction)

        val authenticationResponse = authenticateSession(sessionId)
        try {
            if (authenticationResponse.authenticationStatus == "challenge") {
                val params = ChallengeParameters(
                    threeDSServerTransactionID = sessionId,
                    acsRefNumber = authenticationResponse.acsReferenceNumber,
                    acsSignedContent = authenticationResponse.acsSignedContent,
                    acsTransactionID = authenticationResponse.acsTransactionId,
                    threeDSRequestorAppURL = "https://www.ravelin.com/?transID=${
                        transaction!!
                            .authenticationParameters
                            ?.getSDKTransactionID()
                    }",
                    merchantName = authenticationResponse.merchantName,
                    purchaseCurrency = authenticationResponse.currency,
                    purchaseAmount = authenticationResponse.purchaseAmount
                )

                transaction!!.doChallenge(
                    currentActivity = activity,
                    challengeParameters = params,
                    timeOut = 5,
                    challengeStatusReceiver = object : ChallengeStatusReceiver {
                        override fun completed(completionEvent: CompletionEvent?) {
                            val transactionStatus =
                                transactionStatusMap[completionEvent?.getTransactionStatus()]

                            transactionStatus
                                ?.let {
                                    onCompleted(
                                        ChallengeResponse(
                                            sessionId,
                                            it,
                                            authenticationResponse.authenticationStatusReason
                                        )
                                    )
                                }


                            closeTransaction()
                        }

                        override fun cancelled() {
                            closeTransaction()
                            onFailure(ChallengeResponse(sessionId, transactionStatusMap["N"]!!, "Challenge cancelled"))
                        }

                        override fun timedout() {
                            closeTransaction()
                            onFailure(ChallengeResponse(sessionId, transactionStatusMap["N"]!!, "Challenge timed out"))
                        }

                        override fun protocolError(protocolErrorEvent: ProtocolErrorEvent?) {
                            closeTransaction()
                            onFailure(
                                ChallengeResponse(
                                    sessionId,
                                    transactionStatusMap["N"]!!,
                                    "ProtocolError ${protocolErrorEvent?.getErrorMessage()}"
                                )
                            )
                        }

                        override fun runtimeError(runtimeErrorEvent: RuntimeErrorEvent?) {
                            closeTransaction()
                            onFailure(
                                ChallengeResponse(
                                    sessionId,
                                    transactionStatusMap["N"]!!,
                                    "RuntimeError ${runtimeErrorEvent?.getErrorMessage()}"
                                )
                            )
                        }
                    })
            } else {
                onCompleted(
                    ChallengeResponse(
                        sessionId,
                        authenticationResponse.authenticationStatus,
                        authenticationResponse.authenticationStatusReason
                    )
                )
            }

        } catch (e: Exception) {
            onFailure(
                ChallengeResponse(
                    sessionId,
                    authenticationResponse.authenticationStatus,
                    e.message
                )
            )
        }
    }

    private fun closeTransaction() = try {
        transaction?.transactionClosed?.takeIf { closed -> !closed }?.let {
            synchronized(this) {
                transaction?.close()
            }
        }
    } catch (ex: Exception) {
        throw Error("Unable to close transaction | ${ex.message}")
    }


    private suspend fun authenticateSession(sessionId: String): AuthenticationResponse {

        var response: String? = null

        withContext(Dispatchers.IO) {
            runCatching {
                val payload = JSONObject().apply {
                    put("sessionId", sessionId)
                }.toString()

                val req = Request.Builder()
                    .url(authenticationEndpoint)
                    .post(payload.toRequestBody("application/json".toMediaType()))
                    .headers(authenticationEndpointHeaders)
                    .build()

                client.newCall(req)
                    .execute().use {
                        val responseBody = requireNotNull(it.body?.string())
                        it.body?.close()
                        if (!it.isSuccessful) {
                            throw ThreeDSServiceError(it.code)
                        }
                        response = responseBody
                    }
            }.onSuccess {
                Log.i("3ds_service", "3DS session $sessionId authenticated")
            }.onFailure {
                Log.e("3DS_service", "${it.message}")
                throw ThreeDSAuthenticationError("${it.message}")
            }
        }
        return json.decodeFromString<AuthenticationResponse>(requireNotNull(response))
    }
}

enum class RenderOptions(val code: String) {
    Native("01")
}

fun RenderOptions.toRavelinCode(): String = code

enum class UiTypes(val code: String) {
    TextField("01"),
    SingleSelectField("02"),
    MultiSelectField("03"),
    OOB("04"),
}

fun UiTypes.toRavelinCode(): String = code

val transactionStatusMap: Map<String, String> = mapOf(
    "Y" to "successful",
    "A" to "attempted",
    "N" to "failed",
    "U" to "unavailable",
    "R" to "rejected",
)