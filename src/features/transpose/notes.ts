import type { Accidental, NoteLetter, PitchClass } from '@/types';

export type NoteSpelling = 'sharp' | 'flat' | 'auto';

export interface ParsedNote {
  readonly name: string;
  readonly letter: NoteLetter;
  readonly accidental: Accidental | null;
  readonly pitchClass: PitchClass;
}

const LETTER_PITCH: Record<NoteLetter, PitchClass> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

const SHARP_NAMES: readonly string[] = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];

const FLAT_NAMES: readonly string[] = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
];

/** Grafia cromática equilibrada para o modo automático. */
const AUTO_NAMES: readonly string[] = [
  'C',
  'C#',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
];

function normalizeAccidental(value: string): Accidental | null {
  if (value === '#' || value === '♯' || value === '＃') return '#';
  if (value === 'b' || value === '♭') return 'b';
  return null;
}

function normalizeInput(value: string): string {
  return value
    .normalize('NFC')
    .replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, '')
    .trim();
}

function asPitchClass(value: number): PitchClass {
  return (((value % 12) + 12) % 12) as PitchClass;
}

export function parseNote(value: string): ParsedNote | null {
  const input = normalizeInput(value);
  const match = /^([A-Ga-g])([#b♯♭＃]?)$/.exec(input);

  if (!match) return null;

  const letterText = match[1];
  if (!letterText) return null;

  const letter = letterText.toUpperCase() as NoteLetter;
  const accidental = normalizeAccidental(match[2] ?? '');
  const offset = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
  const pitchClass = asPitchClass(LETTER_PITCH[letter] + offset);
  const name = `${letter}${accidental ?? ''}`;

  return { name, letter, accidental, pitchClass };
}

export function pitchClassForNote(value: string): PitchClass | null {
  return parseNote(value)?.pitchClass ?? null;
}

export function normalizeNoteName(value: string): string | null {
  return parseNote(value)?.name ?? null;
}

export function noteNameForPitchClass(pitchClass: number, spelling: NoteSpelling = 'auto'): string {
  const names = spelling === 'sharp' ? SHARP_NAMES : spelling === 'flat' ? FLAT_NAMES : AUTO_NAMES;

  return names[asPitchClass(pitchClass)] ?? 'C';
}

export function transposePitchClass(pitchClass: PitchClass, semitones: number): PitchClass {
  return asPitchClass(pitchClass + Math.trunc(semitones));
}

/** Distância cromática ascendente de `from` até `to`, sempre entre 0 e 11. */
export function intervalBetweenNotes(from: string, to: string): number | null {
  const fromPitch = pitchClassForNote(from);
  const toPitch = pitchClassForNote(to);

  if (fromPitch === null || toPitch === null) return null;
  return (toPitch - fromPitch + 12) % 12;
}

/** Distância assinada mais curta entre duas notas, entre -6 e 6 semitons. */
export function signedIntervalBetweenNotes(from: string, to: string): number | null {
  const interval = intervalBetweenNotes(from, to);

  if (interval === null) return null;
  return interval > 6 ? interval - 12 : interval;
}

export function isFlatNote(value: string | ParsedNote): boolean {
  const parsed = typeof value === 'string' ? parseNote(value) : value;
  return parsed?.accidental === 'b';
}

export const NOTE_NAMES = {
  sharp: SHARP_NAMES,
  flat: FLAT_NAMES,
  auto: AUTO_NAMES,
} as const;
