import type { PitchClass } from '@/types';

import { parseChord, type ParsedChord } from './chords';

/** -1 = abafada, 0 = corda solta, valores positivos = casa pressionada. */
export type FretValue = number;

export interface BarrePosition {
  readonly fret: number;
  /** Índices em ordem de corda grave para aguda, entre 0 e 5. */
  readonly fromStringIndex: number;
  readonly toStringIndex: number;
}

export interface GuitarStringPosition {
  readonly stringIndex: number;
  /** Numeração tradicional: 6 = mizão, 1 = mizinha. */
  readonly stringNumber: number;
  readonly fret: number | null;
  readonly state: 'muted' | 'open' | 'fretted';
  readonly finger: number | null;
  readonly pitchClass: PitchClass | null;
}

export interface FingerPosition {
  readonly finger: number;
  readonly stringIndex: number;
  readonly fret: number;
}

export interface ChordVoicing {
  readonly symbol: string;
  /** Sempre seis valores, da corda 6 para a corda 1; -1 significa abafada. */
  readonly frets: readonly FretValue[];
  readonly baseFret: number;
  readonly strings: readonly GuitarStringPosition[];
  readonly fingers: readonly FingerPosition[];
  readonly fingerCount: number;
  readonly barre: BarrePosition | null;
  readonly approximate: boolean;
  readonly omittedIntervals: readonly PitchClass[];
  readonly score: number;
}

export interface VoicingOptions {
  readonly maxPositions?: number;
  readonly maxFret?: number;
}

const STANDARD_TUNING: readonly number[] = [40, 45, 50, 55, 59, 64];
const DEFAULT_MAX_FRET = 15;

function openPitchAt(stringIndex: number): number {
  const openPitch = STANDARD_TUNING[stringIndex];
  if (openPitch === undefined) throw new RangeError(`Corda inválida: ${stringIndex}`);
  return openPitch;
}

function pitchClass(value: number): PitchClass {
  return (((value % 12) + 12) % 12) as PitchClass;
}

function chordIntervals(
  chord: ParsedChord,
  level: number,
): {
  required: number[];
  optional: number[];
  bass: number;
} {
  const quality = chord.quality;
  const required = [0];
  const optional: number[] = [];

  if (quality.suspension !== null) required.push(quality.suspension);
  else if (quality.third !== null) required.push(quality.third);

  if (quality.fifth !== null) {
    if (quality.seventh === null && quality.extensions.length === 0) required.push(quality.fifth);
    else if (level < 2) optional.push(quality.fifth);
  }

  if (quality.seventh !== null) required.push(quality.seventh);

  quality.extensions.forEach((extension) => {
    if (level === 0) required.push(extension.interval);
    else optional.push(extension.interval);
  });

  const bass = chord.bass ? (chord.bass.pitchClass - chord.root.pitchClass + 12) % 12 : 0;

  if (bass !== 0) required.push(bass);

  return {
    required: [...new Set(required)],
    optional: [...new Set(optional)].filter((interval) => !required.includes(interval)),
    bass,
  };
}

function fingerLayout(frets: readonly FretValue[]): {
  barre: BarrePosition | null;
  fingerByString: Array<number | null>;
  fingers: FingerPosition[];
  count: number;
} {
  const fingerByString = frets.map(() => null as number | null);
  const played = frets
    .map((fret, stringIndex) => ({ fret, stringIndex }))
    .filter((item): item is { fret: number; stringIndex: number } => item.fret > 0);

  if (played.length === 0) return { barre: null, fingerByString, fingers: [], count: 0 };

  const minimumFret = Math.min(...played.map((item) => item.fret));
  const minimumStrings = played
    .filter((item) => item.fret === minimumFret)
    .map((item) => item.stringIndex);
  const fromStringIndex = minimumStrings[0] ?? 0;
  const toStringIndex = minimumStrings.at(-1) ?? fromStringIndex;
  const isBarre =
    minimumStrings.length >= 2 &&
    frets.slice(fromStringIndex, toStringIndex + 1).every((fret) => fret >= minimumFret);
  const barre = isBarre ? { fret: minimumFret, fromStringIndex, toStringIndex } : null;

  if (barre) {
    for (let index = barre.fromStringIndex; index <= barre.toStringIndex; index += 1) {
      if (frets[index] === barre.fret) fingerByString[index] = 1;
    }
  }

  const remaining = played
    .filter((item) => fingerByString[item.stringIndex] === null)
    .sort((left, right) => left.fret - right.fret || left.stringIndex - right.stringIndex);
  let nextFinger = barre ? 2 : 1;

  for (const item of remaining) {
    fingerByString[item.stringIndex] = nextFinger;
    nextFinger += 1;
  }

  const fingers = fingerByString.flatMap((finger, stringIndex) => {
    const fret = frets[stringIndex];
    return finger === null || fret === undefined || fret <= 0
      ? []
      : [{ finger, stringIndex, fret }];
  });

  return { barre, fingerByString, fingers, count: nextFinger - 1 };
}

function scoreVoicing(frets: readonly FretValue[], barre: BarrePosition | null): number {
  let muted = 0;
  let open = 0;
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = 0;
  let firstFretted = -1;
  let lastFretted = -1;

  frets.forEach((fret, index) => {
    if (fret < 0) muted += index < 2 ? 1 : 2;
    else if (fret === 0) open += 1;
    else {
      minimum = Math.min(minimum, fret);
      maximum = Math.max(maximum, fret);
      if (firstFretted < 0) firstFretted = index;
      lastFretted = index;
    }
  });

  let innerOpen = 0;
  if (firstFretted >= 0) {
    for (let index = firstFretted; index <= lastFretted; index += 1) {
      if (frets[index] === 0) innerOpen += 1;
    }
  }

  const span = Number.isFinite(minimum) ? maximum - minimum : 0;
  let score = muted - 0.4 * open;
  if (Number.isFinite(minimum)) {
    score += 0.5 * minimum + 0.3 * span + (span >= 3 ? 2.5 : 0);
  }
  if (open > 0 && minimum >= 3) score += 3;
  if (minimum >= 2) score += 0.8 * innerOpen;
  if (barre) score += 1;

  return score;
}

function completeVoicing(
  symbol: string,
  frets: readonly FretValue[],
  baseFret: number,
  approximate: boolean,
  omittedIntervals: readonly PitchClass[],
  score: number,
): ChordVoicing {
  const layout = fingerLayout(frets);
  const strings = frets.map((fret, stringIndex) => ({
    stringIndex,
    stringNumber: 6 - stringIndex,
    fret: fret < 0 ? null : fret,
    state: fret < 0 ? ('muted' as const) : fret === 0 ? ('open' as const) : ('fretted' as const),
    finger: layout.fingerByString[stringIndex] ?? null,
    pitchClass: fret < 0 ? null : pitchClass(openPitchAt(stringIndex) + fret),
  }));

  return {
    symbol,
    frets: [...frets],
    baseFret,
    strings,
    fingers: layout.fingers,
    fingerCount: layout.count,
    barre: layout.barre,
    approximate,
    omittedIntervals,
    score,
  };
}

function findVoicings(
  chord: ParsedChord,
  level: number,
  maxFret: number,
  minimumPlayed: number,
): ChordVoicing[] {
  const intervals = chordIntervals(chord, level);
  const allowed = new Set(
    [...intervals.required, ...intervals.optional].map((interval) =>
      pitchClass(chord.root.pitchClass + interval),
    ),
  );
  const requiredPitchClasses = intervals.required.map((interval) =>
    pitchClass(chord.root.pitchClass + interval),
  );
  const bassPitchClass = pitchClass(chord.root.pitchClass + intervals.bass);
  const results: ChordVoicing[] = [];
  const seen = new Set<string>();

  for (let baseFret = 1; baseFret <= maxFret; baseFret += 1) {
    const frets: FretValue[] = [0, 0, 0, 0, 0, 0];

    const visit = (stringIndex: number, started: boolean, ended: boolean, played: number): void => {
      if (stringIndex === 6) {
        if (played < minimumPlayed) return;

        const lowest = frets.findIndex((fret) => fret >= 0);
        if (lowest < 0) return;
        const lowestFret = frets[lowest];
        if (lowestFret === undefined) return;
        if (pitchClass(openPitchAt(lowest) + lowestFret) !== bassPitchClass) return;

        const present = new Set(
          frets
            .map((fret, index) => (fret >= 0 ? pitchClass(openPitchAt(index) + fret) : null))
            .filter((value): value is PitchClass => value !== null),
        );
        if (requiredPitchClasses.some((required) => !present.has(required))) return;

        const key = frets.join(',');
        if (seen.has(key)) return;
        seen.add(key);

        const layout = fingerLayout(frets);
        if (layout.count > 4) return;

        const omitted = chord.quality.extensions
          .map((extension) => extension.interval)
          .filter((interval) => !present.has(pitchClass(chord.root.pitchClass + interval)));

        results.push(
          completeVoicing(
            chord.symbol,
            frets,
            baseFret,
            level > 0,
            omitted,
            scoreVoicing(frets, layout.barre),
          ),
        );
        return;
      }

      const candidates: number[] = [-1, 0];
      for (let fret = baseFret; fret < baseFret + 4 && fret <= maxFret; fret += 1) {
        candidates.push(fret);
      }

      for (const fret of candidates) {
        if (fret === -1) {
          if (started && !ended) {
            frets[stringIndex] = -1;
            visit(stringIndex + 1, started, true, played);
          } else if (!started) {
            frets[stringIndex] = -1;
            visit(stringIndex + 1, false, false, played);
          }
          continue;
        }

        if (ended) continue;
        if (!allowed.has(pitchClass(openPitchAt(stringIndex) + fret))) continue;

        frets[stringIndex] = fret;
        visit(stringIndex + 1, true, false, played + 1);
      }

      frets[stringIndex] = 0;
    };

    visit(0, false, false, 0);
  }

  return results;
}

const PRESETS: Readonly<Record<string, string>> = {
  '0:': 'x32010',
  '2:': 'xx0232',
  '4:': '022100',
  '7:': '320003',
  '9:': 'x02220',
  '5:': '133211',
  '11:': 'x24442',
  '9:m': 'x02210',
  '11:m': 'x24432',
  '0:m': 'x35543',
  '2:m': 'xx0231',
  '4:m': '022000',
  '5:m': '133111',
  '7:m': '355333',
  '0:7': 'x32310',
  '2:7': 'xx0212',
  '4:7': '020100',
  '7:7': '320001',
  '9:7': 'x02020',
  '11:7': 'x21202',
  '0:maj7': 'x32000',
  '2:maj7': 'xx0222',
  '4:maj7': '021100',
  '5:maj7': 'xx3210',
  '7:maj7': '320002',
  '9:maj7': 'x02120',
  '9:m7': 'x02010',
  '11:m7': 'x20202',
  '2:m7': 'xx0211',
  '4:m7': '022030',
  '0:m7': 'x35343',
};

function presetClass(chord: ParsedChord): string | null {
  if (chord.suffix === '') return '';
  if (chord.suffix === 'm') return 'm';
  if (chord.suffix === '7') return '7';
  if (['7M', 'M7', 'maj7'].includes(chord.suffix)) return 'maj7';
  if (chord.suffix === 'm7') return 'm7';
  return null;
}

function presetFor(chord: ParsedChord): ChordVoicing | null {
  const kind = presetClass(chord);
  if (kind === null || chord.bass !== null) return null;

  const encoded = PRESETS[`${chord.root.pitchClass}:${kind}`];
  if (!encoded) return null;

  const frets = [...encoded].map((value) => (value === 'x' ? -1 : Number(value)));
  return completeVoicing(chord.symbol, frets, 1, false, [], -99);
}

const cache = new Map<string, readonly ChordVoicing[]>();

export function getChordVoicings(
  value: string | ParsedChord,
  options: VoicingOptions = {},
): ChordVoicing[] {
  const chord = typeof value === 'string' ? parseChord(value) : value;
  if (!chord) return [];

  const maxPositions = Math.max(1, Math.trunc(options.maxPositions ?? 6));
  const maxFret = Math.max(1, Math.min(15, Math.trunc(options.maxFret ?? DEFAULT_MAX_FRET)));
  const cacheKey = `${chord.symbol}|${maxPositions}|${maxFret}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached.slice(0, maxPositions);

  const picked: ChordVoicing[] = [];
  const seen = new Set<string>();

  for (let level = 0; level <= 2 && picked.length < 3; level += 1) {
    const candidates = findVoicings(chord, level, maxFret, level === 2 ? 3 : 4);
    const byPosition = new Set<string>();
    candidates.sort((left, right) => left.score - right.score);

    for (const candidate of candidates) {
      const positiveFrets = candidate.frets.filter((fret) => fret > 0);
      const position = positiveFrets.length > 0 ? Math.min(...positiveFrets) : 0;
      const bucket = `${position}:${candidate.barre ? 'barre' : 'normal'}`;
      const fretKey = candidate.frets.join(',');
      if (byPosition.has(bucket) || seen.has(fretKey)) continue;

      byPosition.add(bucket);
      seen.add(fretKey);
      picked.push(candidate);
      if (picked.length >= 8) break;
    }
  }

  const preset = presetFor(chord);
  if (preset) {
    const presetKey = preset.frets.join(',');
    const withoutPreset = picked.filter((candidate) => candidate.frets.join(',') !== presetKey);
    picked.splice(0, picked.length, preset, ...withoutPreset);
  }

  picked.sort(
    (left, right) =>
      Number(left.approximate) - Number(right.approximate) || left.score - right.score,
  );
  const result = picked.slice(0, Math.max(maxPositions, 6));
  cache.set(cacheKey, result);
  return result.slice(0, maxPositions);
}

export function clearVoicingCache(): void {
  cache.clear();
}
