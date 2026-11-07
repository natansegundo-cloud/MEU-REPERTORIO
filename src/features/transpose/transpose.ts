import type { ChordPlacement } from '@/types';

import { parseChord, type ParsedChord } from './chords';
import { parseTonality, preferredSpellingForKey, type Tonality } from './keys';
import { noteNameForPitchClass, type NoteSpelling, parseNote, transposePitchClass } from './notes';

export interface TransposeOptions {
  readonly spelling?: NoteSpelling;
  readonly key?: string | Tonality;
}

export class InvalidChordError extends Error {
  constructor(symbol: string) {
    super(`Cifra inválida para transposição: ${symbol}`);
    this.name = 'InvalidChordError';
  }
}

function resolveSpelling(
  options: TransposeOptions,
  chord: ParsedChord,
): Exclude<NoteSpelling, 'auto'> | 'auto' {
  if (options.spelling && options.spelling !== 'auto') return options.spelling;

  if (options.key) {
    const key = typeof options.key === 'string' ? parseTonality(options.key) : options.key;
    if (key) return preferredSpellingForKey(key);
  }

  if (chord.root.accidental === 'b' || chord.bass?.accidental === 'b') return 'flat';
  if (chord.root.accidental === '#' || chord.bass?.accidental === '#') return 'sharp';
  return 'auto';
}

export function transposeNoteName(
  value: string,
  semitones: number,
  spelling: NoteSpelling = 'auto',
): string | null {
  const note = parseNote(value);
  if (!note) return null;

  return noteNameForPitchClass(transposePitchClass(note.pitchClass, semitones), spelling);
}

export function transposeChord(
  value: string | ParsedChord,
  semitones: number,
  options: TransposeOptions = {},
): string | null {
  const chord = typeof value === 'string' ? parseChord(value) : value;
  if (!chord) return null;

  const spelling = resolveSpelling(options, chord);
  const root = noteNameForPitchClass(
    transposePitchClass(chord.root.pitchClass, semitones),
    spelling,
  );
  const bass = chord.bass
    ? `/${noteNameForPitchClass(transposePitchClass(chord.bass.pitchClass, semitones), spelling)}`
    : '';

  return `${root}${chord.suffix}${bass}`;
}

export function transposeChordOrThrow(
  value: string,
  semitones: number,
  options: TransposeOptions = {},
): string {
  const result = transposeChord(value, semitones, options);
  if (!result) throw new InvalidChordError(value);
  return result;
}

export function transposeChordSymbols(
  symbols: readonly string[],
  semitones: number,
  options: TransposeOptions = {},
): string[] {
  return symbols.map((symbol) => transposeChordOrThrow(symbol, semitones, options));
}

export function transposeChordPlacements<T extends ChordPlacement>(
  placements: readonly T[],
  semitones: number,
  options: TransposeOptions = {},
): Array<Omit<T, 'symbol'> & ChordPlacement> {
  return placements.map((placement) => ({
    ...placement,
    symbol: transposeChordOrThrow(placement.symbol, semitones, options),
  }));
}
