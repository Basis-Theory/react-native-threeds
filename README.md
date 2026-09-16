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

## ENG-12518 native integration POC

The `ENG-12518` branch contains two local, non-production example apps under
`poc-examples`: one validates the React Native Bridge and one validates a
Codegen TurboModule. Both keep the existing WebView renderer for side-by-side
comparison on iOS and Android.

Start with the [local runbook](docs/LOCAL-RUNBOOK.md), then use the
[architecture overview](docs/ARCHITECTURE.md), [code map](docs/CODE-MAP.md), and
[test matrix](docs/TESTING.md). Native SDK source checkouts and the merchant
authentication backend are prepared through `poc-support`; private keys remain
outside the mobile apps.


## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.
