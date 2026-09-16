const mockConfigure = jest.fn();
const mockCreateSession = jest.fn();
const mockStartAuthentication = jest.fn();

const mockNativeModule = {
  configure: mockConfigure,
  createSession: mockCreateSession,
  startAuthentication: mockStartAuthentication,
};

// Codegen creates native protocol/class files, but JavaScript still discovers
// the installed implementation through TurboModuleRegistry at runtime.
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  TurboModuleRegistry: { get: () => mockNativeModule },
}));

import {
  BasisTheoryThreeDSTurbo,
  isThreeDSTurboModuleAvailable,
} from '../BasisTheoryThreeDSTurbo';

beforeEach(() => {
  jest.clearAllMocks();
});

test('reports the generated module as available', () => {
  expect(isThreeDSTurboModuleAvailable()).toBe(true);
});

test('flattens configuration into Codegen-supported primitives', async () => {
  mockConfigure.mockResolvedValue([]);

  await expect(
    BasisTheoryThreeDSTurbo.configure({
      apiKey: 'public-api-key',
      authenticationEndpoint: 'http://localhost:3333/3ds/authenticate',
      apiBaseUrl: 'https://api.flock-dev.com',
      sandbox: true,
      locale: 'en-US',
      authenticationEndpointHeaders: { 'X-Test': 'value' },
    })
  ).resolves.toEqual([]);

  expect(mockConfigure).toHaveBeenCalledWith(
    'public-api-key',
    'http://localhost:3333/3ds/authenticate',
    'https://api.flock-dev.com',
    true,
    'en-US',
    '{"X-Test":"value"}'
  );
});

test('creates a session with exactly one token reference', async () => {
  const session = { id: 'session-id', cardBrand: 'visa' };
  mockCreateSession.mockResolvedValue(session);

  await expect(
    BasisTheoryThreeDSTurbo.createSession({ tokenId: 'token-id' })
  ).resolves.toEqual(session);
  expect(mockCreateSession).toHaveBeenCalledWith('token-id', '');
});

test('rejects an ambiguous session request before native code', async () => {
  await expect(
    BasisTheoryThreeDSTurbo.createSession({
      tokenId: 'token-id',
      tokenIntentId: 'token-intent-id',
    })
  ).rejects.toThrow('Provide exactly one of tokenId or tokenIntentId.');
  expect(mockCreateSession).not.toHaveBeenCalled();
});

test('starts authentication with a session identifier', async () => {
  const result = { id: 'session-id', status: 'successful' };
  mockStartAuthentication.mockResolvedValue(result);

  await expect(
    BasisTheoryThreeDSTurbo.startAuthentication('session-id')
  ).resolves.toEqual(result);
  expect(mockStartAuthentication).toHaveBeenCalledWith('session-id');
});
