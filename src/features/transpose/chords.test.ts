import { describe, expect, it } from 'vitest';

import { isChordSymbol, normalizeChordSymbol, parseChord } from './chords';

describe('acordes', () => {
  it.each([
    'A',
    'Am',
    'A7',
    'A7M',
    'A9',
    'A4',
    'Asus4',
    'Aadd9',
    'A/C#',
    'Bb',
    'Bbº',
    'Bm7',
    'C#m7',
    'D7M',
    'Dm7',
    'E7(9)',
    'E7(9)/G#',
    'F#m7',
    'G7M',
    'C(add9)',
    'G13',
  ])('reconhece %s sem depender de uma lista fixa', (symbol) => {
    expect(isChordSymbol(symbol)).toBe(true);
    expect(parseChord(symbol)?.symbol).toBe(symbol);
  });

  it('preserva a cifra original e expõe a estrutura musical interpretada', () => {
    const chord = parseChord('E7(9)/G#');

    expect(chord).not.toBeNull();
    expect(chord?.original).toBe('E7(9)/G#');
    expect(chord?.root.name).toBe('E');
    expect(chord?.bass?.name).toBe('G#');
    expect(chord?.quality.kind).toBe('dominant');
    expect(chord?.quality.seventh).toBe(10);
    expect(chord?.quality.extensions.map((extension) => extension.degree)).toContain(9);
  });

  it('normaliza apenas a grafia das notas e preserva a qualidade', () => {
    expect(normalizeChordSymbol(' c♯m7 ')).toBe('C#m7');
    expect(normalizeChordSymbol('e7(9)/g♯')).toBe('E7(9)/G#');
    expect(normalizeChordSymbol('A7M')).toBe('A7M');
  });

  it('rejeita símbolos inválidos ou malformados', () => {
    for (const symbol of ['H', 'Cfoo', 'C(', 'C)', 'C/G#extra', 'C?', '']) {
      expect(parseChord(symbol)).toBeNull();
    }
  });

  it('classifica diminutos, aumentados e suspensos', () => {
    expect(parseChord('Bbº')?.quality.kind).toBe('diminished');
    expect(parseChord('Cø7')?.quality.kind).toBe('half-diminished');
    expect(parseChord('D+')?.quality.kind).toBe('augmented');
    expect(parseChord('Asus4')?.quality.kind).toBe('suspended');
    expect(parseChord('Asus2')?.quality.suspension).toBe(2);
    expect(parseChord('A4')?.quality.suspension).toBe(5);
    expect(parseChord('A-7')?.quality.kind).toBe('minor');
    expect(parseChord('A5')?.quality.kind).toBe('power');
  });
});
