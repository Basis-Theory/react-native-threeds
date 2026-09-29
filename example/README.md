# React Native 3DS example

This is the SDK's standard `example/` app. `src/App.tsx` contains zero custom
Kotlin/Swift/Objective-C — it only imports the published TypeScript facade.
The `android/` and `ios/` folders here are the same generic React Native
boilerplate every bare app needs (`MainActivity.kt`, `AppDelegate.swift`);
autolinking pulls the real 3DS native code from the package root (`../android`,
`../ios`), exactly like it would for a customer's app.

`BasisTheoryThreeDSStrategies` (exported from the package root) lets the app
pick an integration explicitly instead of relying on an implicit default:

```ts
BasisTheoryThreeDSStrategies.ios.bridge
BasisTheoryThreeDSStrategies.ios.turboModule
BasisTheoryThreeDSStrategies.android.bridge
```

The UI in `src/App.tsx` exposes a Bridge/TurboModule selector so you can flip
between them without restarting Metro.

## Per-platform status

| | Bridge | TurboModule |
| --- | --- | --- |
| iOS | Works | Works (`ios/Podfile.properties.json` sets `newArchEnabled: true`) |
| Android | Works | Not exposed — see the "Native integration" section of the root README. `android/gradle.properties` keeps `newArchEnabled=false`; the library's own `android/build.gradle` always compiles the Bridge adapter on Android regardless of this app's architecture flag. |

- Expo 54 (bare workflow, `android/`/`ios/` committed)
- React Native 0.81.5

## Known follow-ups

- The Xcode project (`BT3DSBridgePOC.xcodeproj`/`.xcworkspace`) and Gradle
  `rootProject.name` still carry naming from when this was a POC-comparison
  app. The bundle identifier, Android package/namespace, `package.json` name,
  and `app.json` name/slug were already updated to drop that naming; renaming
  the Xcode project/scheme/workspace files themselves is cosmetic and left as
  a follow-up, since it requires hand-editing `project.pbxproj` structure
  rather than a simple text substitution.
- `com.basistheory:android-threeds` and the `ThreeDS` pod resolve from a
  local checkout today. See the `TODO(ENG-12926)` comments in
  `android/settings.gradle`, `ios/Podfile`, `../android/build.gradle`, and
  `../BasisTheoryReactNativeThreeDS.podspec` for exactly what needs to change
  once Basis Theory's private registry URLs are confirmed.

## Running it

Re-run `pod install` under `ios/` after changing `newArchEnabled` if you have
not already.
