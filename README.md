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

To use the React Native SDK methods, you need to wrap your app with the `BasisTheory3dsProvider` component. This component will provide the SDK methods to the rest of your app.

```jsx
import { BasisTheoryProvider } from '@basis-theory/react-native-threeds';

const App = () => {
  return (
    <BasisTheoryProvider>
      <YourApp />
    </BasisTheoryProvider>
  );
};
```

After that, you can access the SDK methods using the `useBasisTheory3ds` hook.

```jsx
import { BasisTheory3dsProvider, useBasisTheory3ds } from '@basis-theory/react-native-threeds';

const App = () => {
  const { createSession, startChallenge } = useBasisTheory3ds();

  return (
    <BasisTheoryProvider>
      <YourApp />
    </BasisTheoryProvider>
  );
};
```

## Documentation

For a complete list of endpoints and examples, please refer to our [official documentation](https://developers.basistheory.com/docs/sdks/mobile/3ds-react-native/)

## Native integration

Besides the default WebView renderer, this SDK supports native 3DS on iOS and
Android:

| Strategy | iOS | Android |
| --- | --- | --- |
| WebView (default) | ✅ | ✅ |
| Bridge | ✅ | ✅ |
| TurboModule | ✅ | not available — see below |

```ts
import { BasisTheoryThreeDS } from '@basis-theory/react-native-threeds';

// Picks TurboModule on iOS when compiled, Bridge everywhere else.
await BasisTheoryThreeDS.configure({ apiKey, authenticationEndpoint });
```

To force a specific strategy instead of the default, use
`BasisTheoryThreeDSStrategies.{ios,android}.{bridge,turboModule}`.

Android does not expose a TurboModule strategy: React Native's Bridgeless
runtime does not reach a registered Android TurboModule regardless of the
architecture flag, so `android/build.gradle` always compiles and autolinks
the Bridge adapter instead. The full investigation (two independent hosts,
logs, and external references) lives in the `ENG-12518` branch/PR history.

See [`example/`](example) for a runnable reference app, and
[developers.basistheory.com](https://developers.basistheory.com/docs/sdks/mobile/3ds-react-native/)
for the full setup guide.


## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.
