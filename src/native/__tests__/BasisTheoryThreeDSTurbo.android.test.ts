// This package doesn't build an Android TurboModule. This suite pins the
// JavaScript contract: a clear, actionable error instead of a silent no-op.
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  TurboModuleRegistry: { get: () => null },
}));

import {
  BasisTheoryThreeDSTurbo,
  isThreeDSTurboModuleAvailable,
} from '../BasisTheoryThreeDSTurbo';

test('reports the TurboModule as unavailable on Android', () => {
  expect(isThreeDSTurboModuleAvailable()).toBe(false);
});

test('fails fast with an actionable message instead of a silent no-op', () => {
  expect(() =>
    BasisTheoryThreeDSTurbo.configure({
      apiKey: 'public-api-key',
      authenticationEndpoint: 'http://localhost:3333/3ds/authenticate',
    })
  ).toThrow('The Android TurboModule is not supported in this package');

  expect(() => BasisTheoryThreeDSTurbo.startAuthentication('session-id')).toThrow(
    'use BasisTheoryThreeDSNative (Bridge) on Android'
  );
});
