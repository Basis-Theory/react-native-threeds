import { resolveApiBaseUrl } from '../urls';

describe('resolveApiBaseUrl', () => {
  it('uses the compatibility host when nothing is configured', () => {
    expect(resolveApiBaseUrl()).toBe('https://api.basistheory.com');
    expect(resolveApiBaseUrl({})).toBe('https://api.basistheory.com');
  });

  it.each([
    ['us', 'https://api.us.basistheory.com'],
    ['eu', 'https://api.eu.basistheory.com'],
    ['US', 'https://api.us.basistheory.com'],
    ['Eu', 'https://api.eu.basistheory.com'],
  ])('resolves the %s region', (region, expected) => {
    expect(resolveApiBaseUrl({ region })).toBe(expected);
  });

  it('prefers an explicit apiBaseUrl over a region', () => {
    expect(
      resolveApiBaseUrl({
        apiBaseUrl: 'https://api.flock-dev.com',
        region: 'eu',
      })
    ).toBe('https://api.flock-dev.com');
  });

  it.each(['apac', 'unknown', ''])(
    'falls back to the compatibility host for the unrecognized region %s',
    (region) => {
      expect(resolveApiBaseUrl({ region })).toBe('https://api.basistheory.com');
    }
  );
});
