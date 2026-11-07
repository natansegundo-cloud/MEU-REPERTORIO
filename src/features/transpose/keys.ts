import { noteNameForPitchClass, parseNote, type NoteSpelling, type ParsedNote } from './notes';

export type KeyMode = 'major' | 'minor';

export interface Tonality {
  readonly tonic: ParsedNote;
  readonly mode: KeyMode;
  readonly name: string;
}

const FLAT_MAJOR = new Set([1, 3, 5, 6, 8, 10]);
const FLAT_MINOR = new Set([0, 2, 3, 5, 7, 8, 10]);

export function identifyTonality(tonic: string | ParsedNote, mode: KeyMode): Tonality | null {
  const parsed = typeof tonic === 'string' ? parseNote(tonic) : tonic;
  if (!parsed) return null;

  return {
    tonic: parsed,
    mode,
    name: `${parsed.name}${mode === 'minor' ? 'm' : ''}`,
  };
}

export function parseTonality(value: string): Tonality | null {
  const match = /^\s*([A-Ga-g][#b♯♭＃]?)(?:\s*(m|min|minor|menor|M|maj|major|maior))?\s*$/i.exec(
    value,
  );
  if (!match) return null;

  const tonic = match[1] ?? '';
  const modeToken = match[2] ?? '';
  const mode = /^(?:m|min|minor|menor)$/i.test(modeToken) ? 'minor' : 'major';
  return identifyTonality(tonic, mode);
}

export function preferredSpellingForKey(key: Tonality): Exclude<NoteSpelling, 'auto'> {
  const flat = key.mode === 'minor' ? FLAT_MINOR : FLAT_MAJOR;
  return flat.has(key.tonic.pitchClass) ? 'flat' : 'sharp';
}

export function transposeTonality(
  key: string | Tonality,
  semitones: number,
  spelling: NoteSpelling = 'auto',
): string | null {
  const parsed = typeof key === 'string' ? parseTonality(key) : key;
  if (!parsed) return null;

  const resolvedSpelling = spelling === 'auto' ? 'auto' : spelling;
  const tonic = noteNameForPitchClass(
    parsed.tonic.pitchClass + Math.trunc(semitones),
    resolvedSpelling,
  );
  return `${tonic}${parsed.mode === 'minor' ? 'm' : ''}`;
}
