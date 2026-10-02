// BasisTheoryThreeDS is the smart default: it must resolve to the TurboModule
// only on iOS when the client's build actually compiled it, and to Bridge
// everywhere else — see src/index.tsx for the full rationale.
const mockConfigure = jest.fn();
const mockTurboConfigure = jest.fn();

// index.tsx also re-exports the WebView-based provider, which needs far more
// of react-native (StyleSheet, View, ...) than this suite cares about. Stub
// both provider modules out so the minimal react-native mock below is enough.
jest.mock('../BasisTheory3dsProvider', () => ({
  BasisTheory3dsProvider: () => null,
}));
jest.mock('../useBasisTheory3ds', () => ({
  useBasisTheory3ds: () => ({}),
}));

const mockReactNative = (platform: 'ios' | 'android') => ({
  NativeModules: {
    BasisTheoryThreeDS: { configure: mockConfigure },
  },
  Platform: { OS: platform, constants: {} },
  TurboModuleRegistry: {
    get: () => ({ configure: mockTurboConfigure }),
  },
});

// jest.isolateModules gives each test its own module registry, so the
// require() below picks up the react-native mock registered just above it
// rather than a stale copy from a previous test.
const requireIndex = (): typeof import('../index') =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../index') as typeof import('../index');
const requireBridge = (): typeof import('../native/BasisTheoryThreeDS') =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../native/BasisTheoryThreeDS') as typeof import('../native/BasisTheoryThreeDS');
const requireTurbo = (): typeof import('../native/BasisTheoryThreeDSTurbo') =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../native/BasisTheoryThreeDSTurbo') as typeof import('../native/BasisTheoryThreeDSTurbo');

beforeEach(() => {
  jest.clearAllMocks();
});

test('prefers the TurboModule on iOS when it is available', () => {
  jest.isolateModules(() => {
    jest.doMock('react-native', () => mockReactNative('ios'));

    expect(requireIndex().BasisTheoryThreeDS).toBe(
      requireTurbo().BasisTheoryThreeDSTurbo
    );
  });
});

test('falls back to Bridge on Android regardless of TurboModule compilation', () => {
  jest.isolateModules(() => {
    jest.doMock('react-native', () => mockReactNative('android'));

    expect(requireIndex().BasisTheoryThreeDS).toBe(
      requireBridge().BasisTheoryThreeDSNative
    );
  });
});
