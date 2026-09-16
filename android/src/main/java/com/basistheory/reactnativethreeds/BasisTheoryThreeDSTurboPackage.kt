package com.basistheory.reactnativethreeds

import android.util.Log
import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

/** Registers the generated TurboModule implementation with React Native. */
class BasisTheoryThreeDSTurboPackage : BaseReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
        if (name == BasisTheoryThreeDSTurboModule.NAME) {
            Log.i(LOG_TAG, "Creating NativeBasisTheoryThreeDS TurboModule")
            BasisTheoryThreeDSTurboModule(reactContext)
        } else {
            null
        }

    override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
        Log.i(LOG_TAG, "Registering NativeBasisTheoryThreeDS TurboModule")
        mapOf(
            BasisTheoryThreeDSTurboModule.NAME to ReactModuleInfo(
                name = BasisTheoryThreeDSTurboModule.NAME,
                className = BasisTheoryThreeDSTurboModule.NAME,
                canOverrideExistingModule = false,
                // Expo's bridgeless host starts JS quickly. Eager loading makes
                // the native contract available before this POC evaluates it.
                needsEagerInit = true,
                isCxxModule = false,
                isTurboModule = true,
            ),
        )
    }

    private companion object {
        const val LOG_TAG = "BT3DSTurbo"
    }
}
