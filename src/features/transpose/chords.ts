import type { Accidental, PitchClass } from '@/types';

import { parseNote, type ParsedNote } from './notes';

export type ChordKind =
  | 'major'
  | 'minor'
  | 'dominant'
  | 'major-seventh'
  | 'diminished'
  | 'half-diminished'
  | 'augmented'
  | 'suspended'
  | 'power';

export interface ChordExtension {
  readonly degree: number;
  readonly interval: PitchClass;
  readonly accidental: Accidental | null;
  readonly token: string;
}

export interface ChordQuality {
  readonly kind: ChordKind;
  readonly third: PitchClass | null;
  readonly fifth: PitchClass | null;
  readonly power: boolean;
  readonly seventh: PitchClass | null;
  readonly suspension: PitchClass | null;
  readonly extensions: readonly ChordExtension[];
  readonly intervals: readonly PitchClass[];
}

export interface ParsedChord {
  /** Símbolo recebido, preservado para auditoria e edição futura. */
  readonly original: string;
  /** Símbolo com raízes e baixos normalizados, sem alterar a qualidade. */
  readonly symbol: string;
  readonly root: ParsedNote;
  readonly suffix: string;
  readonly bass: ParsedNote | null;
  readonly quality: ChordQuality;
}

const SUFFIX_WORDS =
  /^(?:maj|min|dim|aug|sus|add|omit|no|alt|M|m|Δ|°|º|ø|\+|-|−|#|b|♯|♭|\d+|[(),])*$/;

function normalizeChordText(value: string): string {
  return value
    .normalize('NFC')
    .replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, '')
    .replace(/[♯＃]/g, '#')
    .replace(/♭/g, 'b')
    .replace(/−/g, '-')
    .trim();
}

function findOuterSlash(value: string): number {
  let depth = 0;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];

    if (character === '(') depth += 1;
    if (character === ')') depth -= 1;
    if (character === '/' && depth === 0) return index;
    if (depth < 0) return -1;
  }

  return depth === 0 ? -1 : -2;
}

function validSuffix(value: string): boolean {
  let depth = 0;

  for (const character of value) {
    if (character === '(') depth += 1;
    if (character === ')') depth -= 1;
    if (depth < 0) return false;
  }

  return depth === 0 && SUFFIX_WORDS.test(value);
}

function uniqueIntervals(values: readonly (number | null)[]): PitchClass[] {
  return [
    ...new Set(
      values.filter((value): value is number => value !== null).map((value) => value % 12),
    ),
  ] as PitchClass[];
}

function extensionInterval(degree: number): PitchClass | null {
  const interval =
    degree === 2 || degree === 9
      ? 2
      : degree === 4 || degree === 11
        ? 5
        : degree === 6 || degree === 13
          ? 9
          : degree === 5
            ? 7
            : null;

  return interval;
}

function addExtension(
  extensions: ChordExtension[],
  degree: number,
  accidental: Accidental | null,
  token: string,
): void {
  const baseInterval = extensionInterval(degree);
  if (baseInterval === null) return;

  const alteration = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
  const interval = ((baseInterval + alteration + 12) % 12) as PitchClass;

  if (
    !extensions.some((extension) => extension.degree === degree && extension.interval === interval)
  ) {
    extensions.push({ degree, interval, accidental, token });
  }
}

function createQuality(suffix: string): ChordQuality {
  const compact = suffix.replace(/[(),]/g, '');
  const diminished = /(?:dim|°|º)/.test(compact);
  const halfDiminished = /ø/.test(compact);
  const augmented = /(?:aug|\+)/.test(compact);
  const minor = /^(?:m(?!aj)|min|-)/.test(compact);
  const suspendedMatch = /sus([24]?)/.exec(compact);
  const explicitFour = /^4$/.test(compact);
  const explicitTwo = /^2$/.test(compact);
  const suspension =
    suspendedMatch || explicitFour || explicitTwo
      ? suspendedMatch?.[1] === '2' || explicitTwo
        ? 2
        : 5
      : null;
  const power = /^5$/.test(compact);
  const third =
    suspension !== null || power ? null : diminished || halfDiminished ? 3 : minor ? 3 : 4;
  const fifth =
    diminished || halfDiminished
      ? 6
      : augmented
        ? 8
        : /(?:b5|5-)/.test(compact)
          ? 6
          : /(?:#5|5\+)/.test(compact)
            ? 8
            : 7;

  const majorSeventh = /(?:maj7|maj9|M7|M9|7M|Δ)/.test(compact);
  const hasExtendedDominant = /(?:7|9|11|13)/.test(compact);
  const seventh =
    diminished && /7/.test(compact)
      ? 9
      : halfDiminished
        ? 10
        : majorSeventh
          ? 11
          : hasExtendedDominant
            ? 10
            : null;
  const extensions: ChordExtension[] = [];

  for (const match of compact.matchAll(/([#b]?)(2|4|5|6|9|11|13)/g)) {
    const degree = Number(match[2]);
    const token = match[0];
    const prefix = compact.slice(0, match.index ?? 0);
    const isAdd = /add$/.test(prefix);
    const isAlteredFifth = degree === 5 && Boolean(match[1]);
    const isChordCore = degree === 5 || degree === 7 || degree === 4 || degree === 2;

    if ((!isChordCore || isAdd || Boolean(match[1])) && !isAlteredFifth) {
      addExtension(
        extensions,
        degree,
        match[1] === '#' || match[1] === 'b' ? match[1] : null,
        token,
      );
    }
  }

  const kind: ChordKind = diminished
    ? 'diminished'
    : halfDiminished
      ? 'half-diminished'
      : augmented
        ? 'augmented'
        : power
          ? 'power'
          : suspension !== null
            ? 'suspended'
            : minor
              ? 'minor'
              : majorSeventh
                ? 'major-seventh'
                : seventh !== null
                  ? 'dominant'
                  : 'major';

  return {
    kind,
    third,
    fifth,
    power,
    seventh,
    suspension,
    extensions,
    intervals: uniqueIntervals([
      0,
      suspension ?? third,
      fifth,
      seventh,
      ...extensions.map((item) => item.interval),
    ]),
  };
}

export function parseChord(value: string): ParsedChord | null {
  const original = value.trim();
  const normalized = normalizeChordText(value);
  const rootMatch = /^([A-Ga-g])([#b]?)(.*)$/.exec(normalized);

  if (!rootMatch) return null;

  const rootLetter = rootMatch[1] ?? '';
  const rootAccidental = rootMatch[2] ?? '';
  const rest = rootMatch[3] ?? '';
  const root = parseNote(`${rootLetter}${rootAccidental}`);
  if (!root) return null;

  const slash = findOuterSlash(rest);
  if (slash === -2) return null;

  const suffix = slash >= 0 ? rest.slice(0, slash) : rest;
  const bassText = slash >= 0 ? rest.slice(slash + 1) : '';
  const bass = bassText ? parseNote(bassText) : null;

  if (slash >= 0 && !bass) return null;
  if (!validSuffix(suffix)) return null;

  const symbol = `${root.name}${suffix}${bass ? `/${bass.name}` : ''}`;

  return {
    original,
    symbol,
    root,
    suffix,
    bass,
    quality: createQuality(suffix),
  };
}

export function normalizeChordSymbol(value: string): string | null {
  return parseChord(value)?.symbol ?? null;
}

export function isChordSymbol(value: string): boolean {
  return parseChord(value) !== null;
}
