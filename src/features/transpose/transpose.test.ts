import { describe, expect, it } from 'vitest';

import type { ChordPlacement } from '@/types';

import { parseTonality, preferredSpellingForKey, transposeTonality } from './keys';
import {
  InvalidChordError,
  transposeChord,
  transposeChordPlacements,
  transposeChordSymbols,
  transposeNoteName,
} from './transpose';

describe('transposição', () => {
  it('transpõe raízes e baixos sem alterar a qualidade do acorde', () => {
    expect(transposeChord('A', 1)).toBe('Bb');
    expect(transposeChord('Am', 1)).toBe('Bbm');
    expect(transposeChord('A7M', 2)).toBe('B7M');
    expect(transposeChord('A/C#', 2, { spelling: 'sharp' })).toBe('B/D#');
    expect(transposeChord('E7(9)', -2, { spelling: 'flat' })).toBe('D7(9)');
    expect(transposeChord('E7(9)/G#', -2, { spelling: 'flat' })).toBe('D7(9)/Gb');
  });

  it('mantém a grafia enarmônica explícita e suporta subida e descida', () => {
    expect(transposeNoteName('A', 1)).toBe('Bb');
    expect(transposeNoteName('A', 4)).toBe('C#');
    expect(transposeNoteName('C', -1, 'flat')).toBe('B');
    expect(transposeChord('D', -2, { spelling: 'sharp' })).toBe('C');
    expect(transposeChord('Bm', -2, { spelling: 'sharp' })).toBe('Am');
  });

  it('transpõe sequências e preserva propriedades que não pertencem ao motor', () => {
    const sequence = [
      { position: 0, symbol: 'A7M', label: 'primeiro' },
      { position: 8, symbol: 'A/C#', label: 'baixo' },
    ] as const;

    const result = transposeChordPlacements(sequence, 2, { spelling: 'sharp' });
    expect(result).toEqual([
      { position: 0, symbol: 'B7M', label: 'primeiro' },
      { position: 8, symbol: 'B/D#', label: 'baixo' },
    ]);
    expect(sequence[0].symbol).toBe('A7M');
  });

  it('transpõe listas simples e rejeita itens inválidos explicitamente', () => {
    expect(transposeChordSymbols(['A', 'Bm7', 'E7(9)'], 2, { spelling: 'sharp' })).toEqual([
      'B',
      'C#m7',
      'F#7(9)',
    ]);
    expect(transposeChord('not-a-chord', 2)).toBeNull();
    expect(() => transposeChordSymbols(['A', 'not-a-chord'], 1)).toThrow(InvalidChordError);
  });

  it('retorna ao tom original após transposição reversível', () => {
    const original = ['A', 'C#m7', 'D7M', 'E7(9)/G#'];
    const raised = transposeChordSymbols(original, 5, { spelling: 'sharp' });
    const restored = transposeChordSymbols(raised, -5, { spelling: 'sharp' });
    expect(restored).toEqual(original);
  });

  it('preserva a estrutura de uma colocação tipada de acorde', () => {
    const placement: ChordPlacement = { position: 4, symbol: 'G7M' };
    expect(transposeChordPlacements([placement], 1, { spelling: 'flat' })).toEqual([
      { position: 4, symbol: 'Ab7M' },
    ]);
  });
});

describe('tonalidades', () => {
  it('identifica tonalidades maiores e menores', () => {
    expect(parseTonality('Am')).toMatchObject({ mode: 'minor', name: 'Am' });
    expect(parseTonality('Bb menor')).toMatchObject({ mode: 'minor', name: 'Bbm' });
    expect(parseTonality('C major')).toMatchObject({ mode: 'major', name: 'C' });
    expect(parseTonality('H')).toBeNull();
  });

  it('escolhe preferência de acidentes e transpõe tonalidades', () => {
    const bb = parseTonality('Bb');
    const a = parseTonality('A');

    expect(bb && preferredSpellingForKey(bb)).toBe('flat');
    expect(a && preferredSpellingForKey(a)).toBe('sharp');
    expect(transposeTonality('A', 1)).toBe('Bb');
    expect(transposeTonality('Am', 2, 'sharp')).toBe('Bm');
  });
});
