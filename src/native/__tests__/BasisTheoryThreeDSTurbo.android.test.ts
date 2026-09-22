// TurboModule reachability is confirmed absent on Android Bridgeless hosts
// even when the Kotlin module registers successfully (see
// docs/ANDROID-TURBOMODULE-INVESTIGATION.md). This suite pins the resulting
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
  ).toThrow(/not reachable on Android/);

  expect(() => BasisTheoryThreeDSTurbo.startAuthentication('session-id')).toThrow(
    'docs/ANDROID-TURBOMODULE-INVESTIGATION.md'
  );
});
