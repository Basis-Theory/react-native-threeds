# 3DS React Native SDK

[![Version](https://img.shields.io/npm/v/@basis-theory/react-native-threeds.svg)](https://www.npmjs.org/package/@basis-theory/react-native-threeds)

The [Basis Theory](https://basistheory.com) 3DS React Native SDK.

## Installation

Using [Node Package Manager](https://docs.npmjs.com/)

```sh
npm install @basis-theory/react-native-threeds
```

Using [Yarn](https://classic.yarnpkg.com/en/docs/)

```sh
yarn add @basis-theory/react-native-threeds
```

## Usage

The SDK offers three strategies. They share the same flow: tokenize the card, create a 3DS session, and let your backend authenticate it with your private API key.

| Strategy | iOS | Android | Expo Go |
| --- | --- | --- | --- |
| WebView | ✅ | ✅ | ✅ |
| Bridge | ✅ | ✅ | ❌ |
| TurboModule | ✅ | ❌ | ❌ |

The native strategies (Bridge and TurboModule) need a development build (`expo prebuild` or a bare React Native app). Expo Go can only use the WebView.

The examples below take a `tokenId` for a card token you already created, for example with [React Native Elements](https://developers.basistheory.com/docs/sdks/mobile/react-native/).

### WebView

Wrap your app with `BasisTheory3dsProvider` and use `useBasisTheory3ds` in any component below it. The provider renders the challenge as an overlay on top of its children, so mount it at the root of your app.

```tsx
import { Button } from 'react-native';
import {
  BasisTheory3dsProvider,
  useBasisTheory3ds,
} from '@basis-theory/react-native-threeds';

const App = () => (
  <BasisTheory3dsProvider apiKey="<PUBLIC_API_KEY>">
    <Checkout tokenId="<TOKEN_ID>" />
  </BasisTheory3dsProvider>
);

const Checkout = ({ tokenId }: { tokenId: string }) => {
  const { createSession, startChallenge } = useBasisTheory3ds();

  const pay = async () => {
    const session = await createSession({ tokenId });

    // Your backend authenticates the session with your private API key.
    const authentication = await yourBackend.authenticate(session.id);

    if (authentication.authentication_status_code === 'C') {
      await startChallenge({
        sessionId: session.id,
        acsChallengeUrl: authentication.acs_challenge_url,
        acsTransactionId: authentication.acs_transaction_id,
        threeDSVersion: authentication.threeds_version,
      });
    }
  };

  return <Button title="Pay" onPress={pay} />;
};
```

### Enabling native 3DS

Native 3DS is off by default, so WebView-only apps build exactly as before: no native code, no extra SDKs, no extra setup. To enable it, add this to your app's `package.json`:

```json
{
  "@basis-theory/react-native-threeds": {
    "native": true
  }
}
```

Then rebuild the app.

- **iOS:** run `pod install`. It downloads Ravelin's 3DS SDK, which the native integration uses. Requires iOS 15 or later.
- **Android:** Ravelin's 3DS SDK needs two changes in your app module that a library can't make for you: [core library desugaring](https://developer.android.com/studio/write/java8-support#library-desugaring), and excluding a `META-INF` file that Ravelin's okhttp dependency and AndroidX both ship.
  - **Expo (`expo prebuild`):** add the config plugin to `app.json` and it adds both on every prebuild:
    ```json
    { "expo": { "plugins": ["@basis-theory/react-native-threeds"] } }
    ```
  - **Bare React Native, or Expo with a committed `android/`:** add these lines to `android/app/build.gradle`:
    ```groovy
    android {
        compileOptions {
            coreLibraryDesugaringEnabled true
        }
        packagingOptions {
            resources {
                excludes += "META-INF/versions/9/OSGI-INF/MANIFEST.MF"
            }
        }
    }

    dependencies {
        coreLibraryDesugaring 'com.android.tools:desugar_jdk_libs:2.1.5'
    }
    ```

  The library adds Ravelin's Maven repository to your build automatically. If your `settings.gradle` sets `repositoriesMode` to `PREFER_SETTINGS` or `FAIL_ON_PROJECT_REPOS`, Gradle ignores or rejects that repository, so add `https://maven.ravelin.com/public/repositories/threeds2service/` to `dependencyResolutionManagement.repositories` in `settings.gradle` instead.

Only enable `native` if you use `BasisTheoryThreeDS` or `BasisTheoryThreeDSStrategies`. Desugaring on its own is harmless in a WebView-only app: it adds Google's `desugar_jdk_libs` to the build and doesn't link any native 3DS code.

### Native

`BasisTheoryThreeDS` uses the TurboModule on iOS when your build compiled it, and the Bridge everywhere else. No provider is needed. The native SDK calls your `authenticationEndpoint` with the session ID and, if the bank requires a challenge, presents it on top of your app.

```tsx
import { useEffect, useState } from 'react';
import { Button } from 'react-native';
import { BasisTheoryThreeDS } from '@basis-theory/react-native-threeds';

const Checkout = ({ tokenId }: { tokenId: string }) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    BasisTheoryThreeDS.configure({
      apiKey: '<PUBLIC_API_KEY>',
      // Your backend: receives the session ID and authenticates it with your private API key.
      authenticationEndpoint: 'https://your-backend.example.com/3ds/authenticate',
    }).then(() => setReady(true));
  }, []);

  const pay = async () => {
    const session = await BasisTheoryThreeDS.createSession({ tokenId });
    const result = await BasisTheoryThreeDS.startAuthentication(session.id);
    // result.status: 'successful' | 'attempted' | 'failed' | 'unavailable' | 'rejected'
  };

  return <Button title="Pay" disabled={!ready} onPress={pay} />;
};
```

A failed or cancelled challenge resolves with `status: 'failed'` and the reason in `result.details`. The promise only rejects on configuration, transport, or SDK errors.

To force one strategy, use `BasisTheoryThreeDSStrategies.ios.bridge`, `BasisTheoryThreeDSStrategies.ios.turboModule`, or `BasisTheoryThreeDSStrategies.android.bridge`. They expose the same methods. `ios.turboModule` needs a build with the new architecture; check with `isThreeDSTurboModuleAvailable()`.

### Choosing the native strategy

The Bridge is always compiled. The TurboModule is added on iOS builds with the new architecture:

- **iOS:** on React Native 0.82 and later, the TurboModule is always compiled. On 0.81, `newArchEnabled` chooses: in `app.json` for Expo, or in `ios/Podfile.properties.json` for bare apps (or `RCT_NEW_ARCH_ENABLED=1 pod install`). `true` compiles the TurboModule alongside the Bridge, and `false` compiles only the Bridge. Run `pod install` again after changing it.
- **Android:** nothing to configure. Only the Bridge is compiled; the Android TurboModule isn't supported in this package.

Tested with React Native 0.81.5 (see [`example/`](example)).

## Documentation

For a complete list of endpoints and examples, please refer to our [official documentation](https://developers.basistheory.com/docs/sdks/mobile/3ds-react-native/).

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.
