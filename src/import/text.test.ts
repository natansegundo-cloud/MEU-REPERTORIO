import { describe, expect, it } from 'vitest';

import { readTextFile } from './text';

describe('importacao TXT', () => {
  it('le UTF-8 com BOM e usa fallback Latin-1', async () => {
    expect(await readTextFile(new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), 'Pétala']))).toBe(
      'Pétala',
    );
    expect(await readTextFile(new Blob([new Uint8Array([0x5a, 0xf3, 0x69, 0x6f])]))).toBe('Zóio');
  });
});
