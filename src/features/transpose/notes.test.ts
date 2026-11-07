import { describe, expect, it } from 'vitest';

import {
  intervalBetweenNotes,
  normalizeNoteName,
  noteNameForPitchClass,
  parseNote,
  pitchClassForNote,
  signedIntervalBetweenNotes,
  transposePitchClass,
} from './notes';

describe('notas musicais', () => {
  it('identifica as doze classes cromáticas e equivalências enarmônicas', () => {
    expect(pitchClassForNote('C')).toBe(0);
    expect(pitchClassForNote('C#')).toBe(1);
    expect(pitchClassForNote('Db')).toBe(1);
    expect(pitchClassForNote('D')).toBe(2);
    expect(pitchClassForNote('Eb')).toBe(3);
    expect(pitchClassForNote('E')).toBe(4);
    expect(pitchClassForNote('F')).toBe(5);
    expect(pitchClassForNote('F#')).toBe(6);
    expect(pitchClassForNote('Gb')).toBe(6);
    expect(pitchClassForNote('G')).toBe(7);
    expect(pitchClassForNote('Ab')).toBe(8);
    expect(pitchClassForNote('A')).toBe(9);
    expect(pitchClassForNote('Bb')).toBe(10);
    expect(pitchClassForNote('B')).toBe(11);
  });

  it('normaliza símbolos Unicode sem perder a classe da nota', () => {
    expect(normalizeNoteName(' c♯ ')).toBe('C#');
    expect(normalizeNoteName('g♭')).toBe('Gb');
    expect(parseNote('H')).toBeNull();
    expect(parseNote('C##')).toBeNull();
  });

  it('gera grafias sustenida, bemol e automática', () => {
    expect(noteNameForPitchClass(10, 'sharp')).toBe('A#');
    expect(noteNameForPitchClass(10, 'flat')).toBe('Bb');
    expect(noteNameForPitchClass(10)).toBe('Bb');
    expect(noteNameForPitchClass(-1, 'sharp')).toBe('B');
  });

  it('calcula intervalos cromáticos ascendentes e assinados', () => {
    expect(intervalBetweenNotes('A', 'C#')).toBe(4);
    expect(intervalBetweenNotes('C#', 'A')).toBe(8);
    expect(signedIntervalBetweenNotes('C', 'F#')).toBe(6);
    expect(signedIntervalBetweenNotes('C', 'G')).toBe(-5);
    expect(intervalBetweenNotes('C', 'H')).toBeNull();
  });

  it('transpõe classes com semitons negativos e positivos', () => {
    expect(transposePitchClass(0, 1)).toBe(1);
    expect(transposePitchClass(0, -1)).toBe(11);
    expect(transposePitchClass(11, 13)).toBe(0);
  });
});
