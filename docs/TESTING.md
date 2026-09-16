# Test matrix

## Sandbox scenarios

| Scenario | Card | Expected UI | OTP |
| --- | --- | --- | --- |
| Frictionless success | `4200000000000002` | No challenge screen | None |
| Successful challenge | `4200000000000004` | Native or WebView purchase authentication | `1234` |

Changing the card picker updates the input immediately. Reusing the same token
scenario will naturally keep returning that scenario's result.

Use the renderer selector shown above the card picker to change paths at
runtime. The Bridge app offers WebView and Bridge; the TurboModules app offers
WebView and TurboModule. The identity card and `Active renderer` label are the source
of truth for the current selection.

## Minimum manual matrix

| Platform | Bridge WebView | Bridge native | TurboModules WebView | TurboModule native |
| --- | --- | --- | --- | --- |
| iOS simulator | Frictionless + challenge | Frictionless + challenge | Frictionless + challenge | Frictionless + challenge |
| Android emulator | Frictionless + challenge | Frictionless + challenge | Frictionless + challenge | Frictionless + challenge |

For each challenge, verify the purchase-authentication screen appears, submit
`1234`, and confirm the app reports `successful`. For frictionless cards,
success should return without another screen.

## Automated checks currently available

- Shared package: Jest tests, TypeScript, ESLint, and package build.
- Both executable examples: TypeScript and Metro bundle validation.
- TurboModules contract: Codegen generation for both platforms.
- CocoaPods dependency resolution and workspace generation for both apps.
- Two Maestro smoke flows per native-module app under each `.maestro/tests`.

The Maestro flows require a built and installed native app, Metro on `8081`,
and the merchant backend on `3333`. They are smoke tests, not the full native
SDK scenario suite.

## Confidence boundary

The JavaScript and generated interfaces have been validated without executing a
locally built native binary on the workstation. Xcode/Android Studio compilation
and simulator/emulator runs remain required. The POC should not be treated as a
publishable SDK until those runs pass and native lifecycle/error tests exist.
