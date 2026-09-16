package com.basistheory.reactnativethreeds

import android.util.Log
import com.basistheory.threeds.model.ChallengeResponse
import com.basistheory.threeds.service.ThreeDSService
import com.basistheory.threeds.service.ThreeDSServiceBuilder
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import okhttp3.Headers
import org.json.JSONObject
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Android implementation of the interface generated from
 * src/specs/NativeBasisTheoryThreeDS.ts. Business logic stays in the native
 * Basis Theory SDK; this class only converts React Native values and results.
 */
@ReactModule(name = BasisTheoryThreeDSTurboModule.NAME)
class BasisTheoryThreeDSTurboModule(
    reactContext: ReactApplicationContext,
) : NativeBasisTheoryThreeDSSpec(reactContext) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var service: ThreeDSService? = null
    private var activeSessionId: String? = null
    private var isCreatingSession = false

    override fun getName() = NAME

    override fun initialize() {
        super.initialize()
        Log.i(LOG_TAG, "NativeBasisTheoryThreeDS TurboModule initialized")
    }

    override fun configure(
        apiKey: String,
        authenticationEndpoint: String,
        apiBaseUrl: String,
        sandbox: Boolean,
        locale: String,
        authenticationEndpointHeadersJson: String,
        promise: Promise,
    ) {
        if (apiKey.isBlank() || authenticationEndpoint.isBlank()) {
            promise.reject("INVALID_CONFIGURATION", "apiKey and authenticationEndpoint are required.")
            return
        }

        try {
            val builder = ThreeDSService.Builder()
                .withApiKey(apiKey)
                .withApplicationContext(reactApplicationContext.applicationContext)
                .withAuthenticationEndpoint(
                    authenticationEndpoint,
                    headersFromJson(authenticationEndpointHeadersJson),
                )

            if (locale.isNotBlank()) builder.withLocale(locale)
            if (sandbox) builder.withSandbox()
            configureBaseUrl(builder, apiBaseUrl)

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

    override fun createSession(tokenId: String, tokenIntentId: String, promise: Promise) {
        val configuredService = service
        if (configuredService == null) {
            promise.reject("NOT_CONFIGURED", "Call configure before createSession.")
            return
        }
        if (activeSessionId != null || isCreatingSession) {
            promise.reject("SESSION_IN_PROGRESS", "Complete the active 3DS session first.")
            return
        }
        if (tokenId.isBlank() == tokenIntentId.isBlank()) {
            promise.reject("INVALID_REQUEST", "Provide exactly one of tokenId or tokenIntentId.")
            return
        }

        // The SDK supports one active transaction. Mark the asynchronous creation
        // immediately so two fast JavaScript calls cannot create competing sessions.
        isCreatingSession = true
        scope.launch {
            runCatching {
                requireNotNull(
                    configuredService.createSession(
                        tokenId = tokenId.ifBlank { null },
                        tokenIntentId = tokenIntentId.ifBlank { null },
                    ),
                )
            }.onSuccess { session ->
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
            }.onFailure {
                isCreatingSession = false
                promise.reject("SESSION_CREATION_FAILED", it.message, it)
            }
        }
    }

    override fun startAuthentication(sessionId: String, promise: Promise) {
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
                    sessionId = sessionId,
                    activity = activity,
                    onCompleted = { result -> resolveOnce(promise, settled, result) },
                    onFailure = { result -> resolveOnce(promise, settled, result) },
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

    private fun headersFromJson(value: String): Headers {
        val json = JSONObject(value.ifBlank { "{}" })
        return Headers.Builder().apply {
            json.keys().forEach { name -> add(name, json.getString(name)) }
        }.build()
    }

    private fun configureBaseUrl(builder: ThreeDSServiceBuilder, value: String) {
        if (value.isBlank()) return
        when (val host = value.removePrefix("https://").trimEnd('/')) {
            "api.basistheory.com" -> Unit
            "api.flock-dev.com" -> builder.withBaseUrl(host)
            else -> throw IllegalArgumentException(
                "apiBaseUrl must target api.basistheory.com or api.flock-dev.com.",
            )
        }
    }

    companion object {
        const val NAME = "NativeBasisTheoryThreeDS"
        private const val LOG_TAG = "BT3DSTurbo"
    }
}
