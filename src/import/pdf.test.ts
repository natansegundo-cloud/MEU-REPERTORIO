import { describe, expect, it } from 'vitest';

import { reconstructPdfText } from './pdf';

describe('reconstrução de texto PDF', () => {
  it('agrupa por Y, ordena por X e preserva espaços horizontais', () => {
    const text = reconstructPdfText([
      { str: 'C', transform: [1, 0, 0, 1, 10, 100], width: 6 },
      { str: 'Letra', transform: [1, 0, 0, 1, 10, 80], width: 25 },
      { str: 'G', transform: [1, 0, 0, 1, 55, 100], width: 6 },
    ]);
    expect(text).toMatch(/C\s+G/);
    expect(text).toContain('Letra');
  });
});
