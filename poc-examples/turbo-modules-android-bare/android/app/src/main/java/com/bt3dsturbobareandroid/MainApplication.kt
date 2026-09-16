package com.bt3dsturbobareandroid

import android.app.Application
import android.util.Log
import com.basistheory.reactnativethreeds.BasisTheoryThreeDSTurboPackage
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.internal.featureflags.ReactNativeFeatureFlags

class MainApplication : Application(), ReactApplication {

  // RN 0.81's official host creates the bridgeless ReactHost from this native
  // host. The manual package remains in the canonical package list, which is
  // the list the TurboModule manager receives during initialization.
  override val reactNativeHost: ReactNativeHost =
    object : DefaultReactNativeHost(this) {
      override fun getPackages(): List<ReactPackage> =
        PackageList(this).packages.apply {
          // The SDK source is linked from the repository root for this POC.
          // Register its Codegen package explicitly to isolate the bare-host path.
          add(BasisTheoryThreeDSTurboPackage())
        }

      override fun getJSMainModuleName(): String = "index"

      override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

      override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
    }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    // This marker confirms that the installed application is the bare POC and
    // that its ReactHost is constructed with the manually linked Turbo package.
    Log.i("BT3DSTurbo", "Starting bare Android host with BasisTheoryThreeDSTurboPackage")
    loadReactNative(this)
    // This flag determines whether RN installs the JSI TurboModule proxy. It
    // distinguishes a host-bootstrap problem from module registration failure.
    Log.i("BT3DSTurbo", "React Native useTurboModules=${ReactNativeFeatureFlags.useTurboModules()}")
  }
}
