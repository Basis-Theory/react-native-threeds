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


## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.
