const configure = jest.fn();
const createSession = jest.fn();
const startAuthentication = jest.fn();

// Model the native registration boundary without loading an iOS binary. These
// tests verify the JavaScript contract; Swift behavior needs native unit/E2E
// coverage before this bridge is productionized.
jest.mock('react-native', () => ({
  NativeModules: {
    BasisTheoryThreeDS: {
      configure,
      createSession,
      startAuthentication,
    },
  },
  Platform: { OS: 'ios' },
}));

import {
  BasisTheoryThreeDSNative,
  isNativeThreeDSAvailable,
} from '../BasisTheoryThreeDS';

beforeEach(() => {
  jest.clearAllMocks();
});

test('reports the native module as available on iOS', () => {
  expect(isNativeThreeDSAvailable).toBe(true);
});

test('configures the native SDK', async () => {
  configure.mockResolvedValue([]);

  const configuration = {
    apiKey: 'public-api-key',
    authenticationEndpoint: 'http://localhost:3333/3ds/authenticate',
    apiBaseUrl: 'api.flock-dev.com',
    sandbox: true,
  };

  await expect(
    BasisTheoryThreeDSNative.configure(configuration)
  ).resolves.toEqual([]);
  expect(configure).toHaveBeenCalledWith(configuration);
});

test('creates a native session with a token', async () => {
  const session = { id: 'session-id', cardBrand: 'visa' };
  createSession.mockResolvedValue(session);

  await expect(
    BasisTheoryThreeDSNative.createSession({ tokenId: 'token-id' })
  ).resolves.toEqual(session);
  expect(createSession).toHaveBeenCalledWith({ tokenId: 'token-id' });
});

test('rejects ambiguous native session input', async () => {
  await expect(
    BasisTheoryThreeDSNative.createSession({
      tokenId: 'token-id',
      tokenIntentId: 'token-intent-id',
    })
  ).rejects.toThrow('Provide either tokenId or tokenIntentId, but not both.');
  expect(createSession).not.toHaveBeenCalled();
});

test('starts native authentication', async () => {
  const result = { id: 'session-id', status: 'successful' };
  startAuthentication.mockResolvedValue(result);

  await expect(
    BasisTheoryThreeDSNative.startAuthentication('session-id')
  ).resolves.toEqual(result);
  expect(startAuthentication).toHaveBeenCalledWith('session-id');
});
