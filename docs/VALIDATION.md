# Validation record

Last updated: 2026-09-16

This record distinguishes source and dependency checks completed in this
worktree from native builds that remain manual.

## Completed checks

| Check | Result |
| --- | --- |
| Root Yarn 3 workspace install | Passed for package, both POC apps, and backend |
| Registry contamination scan | Passed; no internal npm registry URLs in `yarn.lock` |
| Shared package Jest suite | 38 tests passed across 6 suites |
| Shared package TypeScript | Passed |
| Bridge example TypeScript | Passed |
| TurboModules example TypeScript | Passed |
| Shared package ESLint | Passed |
| Shared package Bob build | Passed |
| Bridge Metro export | iOS, Android, and Web passed |
| TurboModules Metro export | iOS, Android, and Web passed |
| Backend and podspec syntax | Passed |
| Bridge CocoaPods resolution | RN 0.74.5, `fmt` 9.1.0, ThreeDS 1.2.1 |
| TurboModules CocoaPods resolution | RN 0.86.3, Codegen contract, ThreeDS 1.2.1 |
| Android TurboModule Codegen | Generated successfully |
| Bare Android TurboModules workspace | React Native CLI 0.81.5 host, local SDK composite, official RN host pattern, and explicit Codegen package registration configured |
| Bare Android Metro and Babel configuration | Parsed successfully |
| Bare Android TypeScript | Passed |
| React Native autolinking config | Correct Bridge and TurboModule package classes detected |
| Bridge Android Gradle configuration | Gradle 8.6 + Java 21 `help` task passed with the isolated SDK `:lib` composite (upstream Compose example excluded) |
| Bridge Ravelin Android 3DS dependency | `threeds2service-sdk:2.0.2` resolved from Ravelin Maven in the local SDK compile classpath |
| Bridge Android metadata and manifest | `checkDebugAarMetadata` and `processDebugMainManifest` passed with API 24 and core-library desugaring |
| Strict JSON and Maestro YAML | Passed |
| POC launcher script syntax | Passed |
| Root-level POC start aliases | Both Expo commands resolve correctly |
| Git whitespace check | Passed |

CocoaPods project inspection also confirms that the Bridge workspace contains
only `BasisTheoryThreeDSBridge.m` and `BasisTheoryThreeDS.swift`, while the
TurboModules workspace contains only `BasisTheoryThreeDSTurbo.h/.mm` and
`BasisTheoryThreeDSSwift.swift`.

All mobile and backend `.env` files, generated Pods, native SDK checkouts,
Gradle state, Codegen output, and Xcode-local Node configuration remain ignored.
The private key variable appears only at the merchant-backend boundary and in
security documentation.

## Intentionally not run

No Xcode or Gradle application build was executed during this validation. The
Basis Theory workstation policy prohibits running locally generated native
verification binaries on the host, and the user also needs to observe the real
challenge UI manually. CocoaPods resolution, Metro bundles, JavaScript
contracts, autolinking, and Codegen provide build-wiring evidence but do not
replace simulator/emulator execution.

## Manual results and Android reproduction

The following results were manually observed during the POC:

1. Bridge on iOS: passed.
2. Bridge on Android: passed.
3. TurboModule on iOS: passed.
4. TurboModule on Expo Android: the package initialized, but the bridgeless
   Expo host did not expose `global.__turboModuleProxy`.
5. TurboModule on the original bare RN 0.86.3 Android host: the package also
   registered, created, and initialized, while JavaScript still reported
   `turboModuleProxyAvailable: false`. The bare host was then aligned to RN
   0.81.5 for a controlled follow-up experiment; see
   `docs/ANDROID-TURBOMODULE-INVESTIGATION.md`.

The RN 0.81.5 bare React Native Android host was executed and did not pass the
TurboModule runtime acceptance gate:
the native package initialized and `useTurboModules=true`, but JavaScript still
reported `turboModuleProxyAvailable: false` after a two-second retry. This
closes the standard Android TurboModule experiment as not demonstrated; see
`docs/ANDROID-TURBOMODULE-INVESTIGATION.md`.
To reproduce the Android runtime result:

1. Copy `poc-examples/turbo-modules-android-bare/.env.example` to `.env` and
   use `http://10.0.2.2:3333/3ds/authenticate` as the backend endpoint.
2. Start `yarn poc:backend`.
3. Start `yarn poc:turbo-modules-android-bare` in a second terminal.
4. Open Android Studio through
   `./poc-support/scripts/open-android-studio.sh turbo-modules-android-bare`.
5. Run the `app` configuration on an Android emulator and try both cards.

The bare host deliberately has no WebView selector. It remains a diagnostic
reproduction rather than an Android acceptance app because its screen reports
the missing proxy. Do not attempt 3DS card scenarios there unless a future
runtime change makes the initial proxy check pass.
