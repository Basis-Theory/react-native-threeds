# Unified consumer example

This example demonstrates what an actual customer app looks like after
`yarn add @basis-theory/react-native-threeds`: `src/App.tsx` contains zero
custom Kotlin/Swift/Objective-C — it only imports the published TypeScript
facade. The `android/` and `ios/` folders in this example are the same
generic React Native boilerplate every bare app needs (`MainActivity.kt`,
`AppDelegate.swift`); autolinking pulls the real 3DS native code from the
package root (`../../android`, `../../ios`), exactly like it would for a
customer's app.

`BasisTheoryThreeDSStrategies` (exported from the package root) lets the app
pick an integration explicitly instead of relying on an implicit default:

```ts
BasisTheoryThreeDSStrategies.ios.bridge
BasisTheoryThreeDSStrategies.ios.turboModule
BasisTheoryThreeDSStrategies.android.bridge
BasisTheoryThreeDSStrategies.android.turboModule
```

The UI in `src/App.tsx` exposes a Bridge/TurboModule selector so you can flip
between them without restarting Metro.

## Per-platform status

| | Bridge | TurboModule |
| --- | --- | --- |
| iOS | Works | Works (`ios/Podfile.properties.json` sets `newArchEnabled: true`) |
| Android | Works | Throws a clear, actionable error — see `docs/ANDROID-TURBOMODULE-INVESTIGATION.md` at the repository root. `android/gradle.properties` keeps `newArchEnabled=false` and `react-native.config.js` pins autolinking to the Bridge package for this reason. |

Selecting TurboModule on Android is intentionally left available in the UI:
it demonstrates the failure message a customer would actually see, rather
than hiding the option.

- Expo 54 (bare workflow, `android/`/`ios/` committed)
- React Native 0.81.5

## Running it

Re-run `pod install` under `ios/` after changing `newArchEnabled` if you have
not already (this repository does not build or execute native binaries on
this host — see `docs/LOCAL-RUNBOOK.md` at the repository root for setup and
execution commands, which apply here the same way they do for
`poc-examples/bridge` and `poc-examples/turbo-modules`).
