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
 * Android NativeModules bridge, the only native strategy on Android. It mirrors
 * the Swift bridge and delegates 3DS behavior to the Android SDK.
 */
class BasisTheoryThreeDSBridgeModule(
    reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
    // React methods arrive on the native-modules thread, so every read and write
    // of the state below happens inside `scope`, on Main.
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var service: ThreeDSService? = null

    // The SDK holds one transaction. A new session replaces an unauthenticated
    // one, but nothing starts while a session is being created or authenticated.
    private var activeSessionId: String? = null
    private var isCreatingSession = false
    private var isAuthenticating = false

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
                if (isSessionInProgress()) {
                    rejectSessionInProgress(promise)
                    return@launch
                }

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
        val tokenId = request.optionalString("tokenId")
        val tokenIntentId = request.optionalString("tokenIntentId")
        if ((tokenId == null) == (tokenIntentId == null)) {
            promise.reject("INVALID_SESSION_REQUEST", "Provide exactly one of tokenId or tokenIntentId.")
            return
        }

        scope.launch {
            val configuredService = service
            if (configuredService == null) {
                promise.reject("NOT_CONFIGURED", "Call configure before createSession.")
                return@launch
            }
            if (isSessionInProgress()) {
                rejectSessionInProgress(promise)
                return@launch
            }

            // A session that was never authenticated, for example after the user
            // left checkout, is replaced by this one.
            isCreatingSession = true
            activeSessionId = null
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
        scope.launch {
            val configuredService = service
            val activity = reactApplicationContext.currentActivity
            if (configuredService == null) {
                promise.reject("NOT_CONFIGURED", "Call configure before startAuthentication.")
                return@launch
            }
            if (activeSessionId != sessionId) {
                promise.reject("INVALID_SESSION", "The session is not active in the Android SDK.")
                return@launch
            }
            if (isAuthenticating) {
                rejectSessionInProgress(promise)
                return@launch
            }
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "A foreground Android Activity is required.")
                return@launch
            }

            isAuthenticating = true
            val settled = AtomicBoolean(false)
            runCatching {
                configuredService.startChallenge(
                    sessionId,
                    activity,
                    { result -> resolveOnce(promise, settled, result) },
                    { result -> resolveOnce(promise, settled, result) },
                )
            }.onFailure {
                if (settled.compareAndSet(false, true)) {
                    finishAuthentication()
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
        isAuthenticating = false
        super.invalidate()
    }

    private fun isSessionInProgress() = isCreatingSession || isAuthenticating

    private fun rejectSessionInProgress(promise: Promise) =
        promise.reject("SESSION_IN_PROGRESS", "Wait for the active 3DS session to finish first.")

    private fun finishAuthentication() {
        activeSessionId = null
        isAuthenticating = false
    }

    private fun resolveOnce(promise: Promise, settled: AtomicBoolean, result: ChallengeResponse) {
        if (!settled.compareAndSet(false, true)) return
        // The SDK may call back off Main; the state change must happen on Main.
        scope.launch { finishAuthentication() }
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
