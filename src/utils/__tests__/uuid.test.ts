import { v4 } from '../uuid';

const mockMathRandom = jest.fn();
const originalCrypto = global.crypto;

describe('UUID v4 utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMathRandom.mockReturnValue(0.5);
    Object.defineProperty(Math, 'random', {
      value: mockMathRandom,
      writable: true
    });
  });

  afterEach(() => {
    Object.defineProperty(Math, 'random', {
      value: Math.random,
      writable: true
    });
 
    Object.defineProperty(global, 'crypto', {
      value: originalCrypto,
      writable: true,
      configurable: true
    });
  });

  describe('v4() function', () => {
    it('should generate a valid UUID v4 format', () => {
      const uuid = v4();

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      expect(uuid).toMatch(uuidRegex);
      expect(uuid).toHaveLength(36);
    });

    it('should generate unique UUIDs', () => {
      const uuids = new Set();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        uuids.add(v4());
      }

      expect(uuids.size).toBe(iterations);
    });

    it('should set correct version bits (version 4)', () => {
      const uuid = v4();
      const versionChar = uuid.charAt(14);

      expect(versionChar).toBe('4');
    });

    it('should set correct variant bits', () => {
      const uuid = v4();
      const variantChar = uuid.charAt(19);

      expect(['8', '9', 'a', 'b', 'A', 'B']).toContain(variantChar);
    });

    it('should generate different UUIDs on consecutive calls', () => {
      const uuid1 = v4();
      const uuid2 = v4();

      expect(uuid1).not.toBe(uuid2);
    });
  });

  describe('stringifyUUID function (internal)', () => {
    it('should correctly format known byte arrays', () => {
      const mockBytes = new Uint8Array([
        0x12, 0x34, 0x56, 0x78,
        0x9a, 0xbc,
        0xde, 0xf0,
        0x12, 0x34,
        0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0
      ]);

      Object.defineProperty(global, 'crypto', {
        value: {
          getRandomValues: jest.fn((arr: Uint8Array) => {
            for (let i = 0; i < arr.length && i < mockBytes.length; i++) {
              arr[i] = mockBytes[i]!;
            }
            return arr;
          })
        },
        writable: true
      });

      const uuid = v4();

      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('byteToHex lookup table (internal)', () => {
    it('should correctly convert bytes to hex strings', () => {
      const uuid = v4();

      const validChars = /^[0-9a-fA-F-]+$/;
      expect(uuid).toMatch(validChars);

      const hyphens = uuid.match(/-/g);
      expect(hyphens).toHaveLength(4);
    });
  });

  describe('crypto.randomUUID (internal)', () => {
    it('should use crypto.randomUUID when available', () => {
      const mockRandomUUID = jest.fn(() => '550e8400-e29b-41d4-a716-446655440000');

      Object.defineProperty(global, 'crypto', {
        value: {
          randomUUID: mockRandomUUID
        },
        writable: true
      });

      const uuid = v4();

      expect(mockRandomUUID).toHaveBeenCalled();
      expect(uuid).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
  });

  describe('edge cases', () => {
    it('should handle all zero bytes correctly', () => {
      Object.defineProperty(global, 'crypto', {
        value: {
          getRandomValues: jest.fn((arr: Uint8Array) => {
            arr.fill(0);
            return arr;
          })
        },
        writable: true
      });

      const uuid = v4();

      expect(uuid.charAt(14)).toBe('4');
      expect(['8', '9', 'a', 'b', 'A', 'B']).toContain(uuid.charAt(19));
    });

    it('should handle all max bytes correctly', () => {
      Object.defineProperty(global, 'crypto', {
        value: {
          getRandomValues: jest.fn((arr: Uint8Array) => {
            arr.fill(255);
            return arr;
          })
        },
        writable: true
      });

      const uuid = v4();

      expect(uuid.charAt(14)).toBe('4');
      expect(['8', '9', 'a', 'b', 'A', 'B']).toContain(uuid.charAt(19));
    });
  });

  describe('performance', () => {
    it('should generate UUIDs efficiently', () => {
      const start = Date.now();
      const iterations = 10000;

      for (let i = 0; i < iterations; i++) {
        v4();
      }

      const end = Date.now();
      const duration = end - start;

      expect(duration).toBeLessThan(1000);
    });
  });
});

describe('UUID v4 utility - Math.random fallback', () => {
  beforeAll(() => {
    Object.defineProperty(global, 'crypto', {
      value: undefined,
      writable: true,
      configurable: true
    });
  });

  afterAll(() => {
    // Restore crypto
    Object.defineProperty(global, 'crypto', {
      value: originalCrypto,
      writable: true,
      configurable: true
    });
  });

  it('should fall back to Math.random when crypto is not available', async () => {
    const mockMathRandom = jest.fn().mockReturnValue(0.5);
    Object.defineProperty(Math, 'random', {
      value: mockMathRandom,
      writable: true
    });

    // Dynamically import to get fresh module with undefined crypto
    const { v4: v4Fallback } = await import('../uuid');
    v4Fallback();

    expect(mockMathRandom).toHaveBeenCalled();

    // Restore Math.random
    Object.defineProperty(Math, 'random', {
      value: Math.random,
      writable: true
    });
  });
});
