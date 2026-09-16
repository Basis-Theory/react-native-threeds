package com.basistheory.reactnativethreeds

import com.basistheory.threeds.model.ChallengeResponse
import com.basistheory.threeds.service.ThreeDSService
import com.basistheory.threeds.service.ThreeDSServiceBuilder
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import okhttp3.Headers
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Handwritten Android NativeModules bridge used only by the legacy comparison.
 * It mirrors the Swift bridge and delegates 3DS behavior to the Android SDK.
 */
class BasisTheoryThreeDSBridgeModule(
    reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var service: ThreeDSService? = null
    private var activeSessionId: String? = null
    private var isCreatingSession = false

    override fun getName() = NAME

    @ReactMethod
    fun configure(configuration: ReadableMap, promise: Promise) {
        val apiKey = configuration.optionalString("apiKey")
        val authenticationEndpoint = configuration.optionalString("authenticationEndpoint")
        if (apiKey.isNullOrBlank() || authenticationEndpoint.isNullOrBlank()) {
            promise.reject("INVALID_CONFIGURATION", "apiKey and authenticationEndpoint are required.")
            return
        }

        try {
            val builder = ThreeDSService.Builder()
                .withApiKey(apiKey)
                .withApplicationContext(reactApplicationContext.applicationContext)
                .withAuthenticationEndpoint(
                    authenticationEndpoint,
                    headersFromMap(configuration.optionalMap("authenticationEndpointHeaders")),
                )

            configuration.optionalString("locale")?.let(builder::withLocale)
            if (configuration.hasKey("sandbox") && configuration.getBoolean("sandbox")) {
                builder.withSandbox()
            }

            configureBaseUrl(builder, configuration.optionalString("apiBaseUrl"))

            val configuredService = builder.build()
            scope.launch {
                runCatching { configuredService.initialize() }
                    .onSuccess { warnings ->
                        service = configuredService
                        activeSessionId = null
                        isCreatingSession = false
                        promise.resolve(Arguments.fromList(warnings?.filterNotNull().orEmpty()))
                    }
                    .onFailure { promise.reject("INITIALIZATION_FAILED", it.message, it) }
            }
        } catch (error: Exception) {
            promise.reject("INVALID_CONFIGURATION", error.message, error)
        }
    }

    @ReactMethod
    fun createSession(request: ReadableMap, promise: Promise) {
        val configuredService = service
        if (configuredService == null) {
            promise.reject("NOT_CONFIGURED", "Call configure before createSession.")
            return
        }
        if (activeSessionId != null || isCreatingSession) {
            promise.reject("SESSION_IN_PROGRESS", "Complete the active 3DS session first.")
            return
        }

        val tokenId = request.optionalString("tokenId")
        val tokenIntentId = request.optionalString("tokenIntentId")
        if ((tokenId == null) == (tokenIntentId == null)) {
            promise.reject("INVALID_REQUEST", "Provide exactly one of tokenId or tokenIntentId.")
            return
        }

        // The SDK supports one active transaction. Mark the asynchronous creation
        // immediately so two fast JavaScript calls cannot create competing sessions.
        isCreatingSession = true
        scope.launch {
            runCatching { requireNotNull(configuredService.createSession(tokenId, tokenIntentId)) }
                .onSuccess { session ->
                    isCreatingSession = false
                    activeSessionId = session.id
                    promise.resolve(
                        Arguments.createMap().apply {
                            putString("id", session.id)
                            putString("cardBrand", session.cardBrand)
                            putArray(
                                "additionalCardBrands",
                                Arguments.fromList(session.additionalCardBrands.orEmpty()),
                            )
                        },
                    )
                }
                .onFailure {
                    isCreatingSession = false
                    promise.reject("SESSION_CREATION_FAILED", it.message, it)
                }
        }
    }

    @ReactMethod
    fun startAuthentication(sessionId: String, promise: Promise) {
        val configuredService = service
        val activity = reactApplicationContext.currentActivity
        if (configuredService == null) {
            promise.reject("NOT_CONFIGURED", "Call configure before startAuthentication.")
            return
        }
        if (activeSessionId != sessionId) {
            promise.reject("INVALID_SESSION", "The session is not active in the Android SDK.")
            return
        }
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "A foreground Android Activity is required.")
            return
        }

        val settled = AtomicBoolean(false)
        scope.launch {
            runCatching {
                configuredService.startChallenge(
                    sessionId,
                    activity,
                    { result -> resolveOnce(promise, settled, result) },
                    { result -> resolveOnce(promise, settled, result) },
                )
            }.onFailure {
                if (settled.compareAndSet(false, true)) {
                    activeSessionId = null
                    promise.reject("AUTHENTICATION_FAILED", it.message, it)
                }
            }
        }
    }

    override fun invalidate() {
        scope.cancel()
        service = null
        activeSessionId = null
        isCreatingSession = false
        super.invalidate()
    }

    private fun resolveOnce(promise: Promise, settled: AtomicBoolean, result: ChallengeResponse) {
        if (!settled.compareAndSet(false, true)) return
        activeSessionId = null
        promise.resolve(
            Arguments.createMap().apply {
                putString("id", result.id)
                putString("status", result.status)
                result.details?.let { putString("details", it) }
            },
        )
    }

    private fun headersFromMap(values: ReadableMap?): Headers = Headers.Builder().apply {
        values?.keySetIterator()?.let { keys ->
            while (keys.hasNextKey()) {
                val name = keys.nextKey()
                values.getString(name)?.let { add(name, it) }
            }
        }
    }.build()

    private fun configureBaseUrl(builder: ThreeDSServiceBuilder, value: String?) {
        val host = value?.removePrefix("https://")?.trimEnd('/') ?: return
        when (host) {
            "api.basistheory.com" -> Unit
            "api.flock-dev.com" -> builder.withBaseUrl(host)
            else -> throw IllegalArgumentException(
                "apiBaseUrl must target api.basistheory.com or api.flock-dev.com.",
            )
        }
    }

    private fun ReadableMap.optionalString(name: String): String? =
        if (hasKey(name) && !isNull(name)) getString(name)?.takeIf(String::isNotBlank) else null

    private fun ReadableMap.optionalMap(name: String): ReadableMap? =
        if (hasKey(name) && !isNull(name)) getMap(name) else null

    companion object {
        const val NAME = "BasisTheoryThreeDS"
    }
}
