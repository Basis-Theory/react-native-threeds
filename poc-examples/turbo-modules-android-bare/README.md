# Bare React Native Android TurboModules POC

This target validates the Android Codegen TurboModule adapter without Expo. It
uses React Native 0.81.5 with the New Architecture enabled and the same local
Android 3DS SDK checkout as the other POC applications.

It intentionally has no WebView renderer. The Expo TurboModules example keeps
that comparison; this app isolates whether the standard React Native Android
host exposes the native Codegen module to JavaScript.

RN 0.86.3 was tested here first. Its Kotlin package registered, created, and
initialized, but its JavaScript runtime did not expose
`global.__turboModuleProxy`; the standard Codegen lookup therefore returned
`null`. This target now uses RN 0.81.5 and its official
`DefaultReactNativeHost` host pattern as a controlled compatibility experiment.
It produced the same absent-proxy result even though the module registered and
`useTurboModules=true`. This target is retained as a diagnostic reproduction,
not as an Android integration recommendation. Read
`../../docs/ANDROID-TURBOMODULE-INVESTIGATION.md` for the evidence and decision.

After the RN baseline changes, close Android Studio completely and reopen this
project with `../../poc-support/scripts/open-android-studio.sh turbo-bare` so
it imports the matching Gradle wrapper and the launcher-provided JDK 21.

See `../../docs/LOCAL-RUNBOOK.md` for setup, Metro, backend, and Android Studio
instructions.
