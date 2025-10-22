const byteToHex = Array.from({ length: 256 }, (_, i) => (i + 0x100).toString(16).slice(1));

// Non-secure fallback (only used if no crypto available)
const getRandomValues = (arr: Uint8Array): Uint8Array =>
    Uint8Array.from({ length: arr.length }, () => Math.floor(Math.random() * 256));

const stringifyUUID = (bytes: Uint8Array): string => {
    // Convert raw bytes to an array of 2-char hex strings
    const hexes = Array.from(bytes, b => byteToHex[b]);

    // UUIDs are 16 bytes = 32 hex chars, formatted as 8-4-4-4-12:
    //   xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    // Each byte = 2 hex chars, so we need [4, 2, 2, 2, 6] hex strings
    const groups = [4, 2, 2, 2, 6];

    // Slice hexes into groups, join each group, then join all with dashes
    let i = 0;
    return groups.map(len => hexes.slice(i, (i += len)).join('')).join('-');
};

export function v4(): string {
    if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID();
    }

    const rnds = new Uint8Array(16);
    getRandomValues(rnds);

    rnds[6] = (rnds[6]! & 0x0f) | 0x40;
    rnds[8] = (rnds[8]! & 0x3f) | 0x80;

    return stringifyUUID(rnds);
}
