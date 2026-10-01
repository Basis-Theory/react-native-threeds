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

A build compiles exactly one adapter, chosen by the architecture flag, so the
app starts on that one and the selector in `src/App.tsx` disables the other.

## Per-platform status

| | Bridge | TurboModule |
| --- | --- | --- |
| iOS | Works | Works (`ios/Podfile.properties.json` sets `newArchEnabled: true`) |
| Android | Works | Not exposed — see "Choosing the native strategy" in the root README. `android/gradle.properties` keeps `newArchEnabled=false`; the library's own `android/build.gradle` always compiles the Bridge adapter on Android regardless of this app's architecture flag. |

- Expo 54 (bare workflow, `android/`/`ios/` committed)
- React Native 0.81.5

Native 3DS is enabled the same way a customer app enables it: `package.json`
sets `"@basis-theory/react-native-threeds": { "native": true }`, and
`android/app/build.gradle` enables core library desugaring, which Ravelin's SDK
requires. `android/app/src/main/res/xml/network_security_config.xml` allows
cleartext HTTP only to the local merchant backend.

## Running it

Re-run `pod install` under `ios/` after changing `newArchEnabled` if you have
not already.

The Maestro flows in `.maestro/tests` need the strategy the build compiled,
so each run passes it explicitly and asserts it:

```sh
maestro test -e STRATEGY=turboModule .maestro/tests  # iOS, newArchEnabled true
maestro test -e STRATEGY=bridge .maestro/tests       # iOS legacy, or Android
```
