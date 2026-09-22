package com.basistheory.reactnativethreeds

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * Registers the handwritten NativeModules bridge with React Native.
 *
 * Only compiled in when the client's `newArchEnabled` Gradle property is
 * false — see android/build.gradle's source-set exclusion and
 * docs/REGISTRATION-AND-PACKAGING.md.
 */
class BasisTheoryThreeDSBridgePackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(BasisTheoryThreeDSBridgeModule(reactContext))

    override fun createViewManagers(
        reactContext: ReactApplicationContext,
    ): List<ViewManager<*, *>> = emptyList()
}
