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
  /**
   * Primeira casa exibida no braço. Vale 1 quando a posição usa cordas soltas
   * ou quando a pestana está na primeira casa; nos demais casos, é a menor
   * casa pressionada da posição.
   */
  readonly baseFret: number;
  readonly strings: readonly GuitarStringPosition[];
  readonly fingers: readonly FingerPosition[];
  readonly fingerCount: number;
  readonly barre: BarrePosition | null;
  /** Mantido por compatibilidade: posições geradas nunca são aproximadas. */
  readonly approximate: boolean;
  /** Intervalos opcionais omitidos (normalmente a quinta em acordes extendidos). */
  readonly omittedIntervals: readonly PitchClass[];
  readonly score: number;
}

export interface VoicingOptions {
  readonly maxPositions?: number;
  readonly maxFret?: number;
}

const STANDARD_TUNING: readonly number[] = [40, 45, 50, 55, 59, 64];
const DEFAULT_MAX_FRET = 12;
const MAX_FRET_SPAN = 4;
const MAX_FINGERS = 4;
const MAX_OPEN_FRET = 3;
const MAX_CACHED_POSITIONS = 12;

function openPitchAt(stringIndex: number): number {
  const openPitch = STANDARD_TUNING[stringIndex];
  if (openPitch === undefined) throw new RangeError(`Corda inválida: ${stringIndex}`);
  return openPitch;
}

function pitchClass(value: number): PitchClass {
  return (((value % 12) + 12) % 12) as PitchClass;
}

function fretAt(frets: readonly FretValue[], stringIndex: number): FretValue {
  return frets[stringIndex] ?? -1;
}

function positiveFretValues(frets: readonly FretValue[]): number[] {
  return frets.filter((fret) => fret > 0);
}

function isOpenPosition(frets: readonly FretValue[]): boolean {
  return frets.some((fret) => fret === 0);
}

interface ChordIntervals {
  readonly required: readonly number[];
  readonly optional: readonly number[];
  readonly bass: number;
}

function chordIntervals(chord: ParsedChord): ChordIntervals {
  const quality = chord.quality;
  const required: number[] = [0];
  const optional: number[] = [];

  if (quality.suspension !== null) required.push(quality.suspension);
  else if (quality.third !== null) required.push(quality.third);

  const hasSeventhOrExtension = quality.seventh !== null || quality.extensions.length > 0;
  const essentialFifth =
    quality.power ||
    quality.kind === 'diminished' ||
    quality.kind === 'half-diminished' ||
    quality.kind === 'augmented';

  if (quality.fifth !== null) {
    if (!hasSeventhOrExtension || essentialFifth) required.push(quality.fifth);
    else optional.push(quality.fifth);
  }

  if (quality.seventh !== null) required.push(quality.seventh);

  quality.extensions.forEach((extension) => {
    required.push(extension.interval);
  });

  const bass = chord.bass ? (chord.bass.pitchClass - chord.root.pitchClass + 12) % 12 : 0;
  if (bass !== 0) required.push(bass);

  const uniqueRequired = [...new Set(required)];
  return {
    required: uniqueRequired,
    optional: [...new Set(optional)].filter((interval) => !uniqueRequired.includes(interval)),
    bass,
  };
}

function minimumSoundingCount(chord: ParsedChord, required: readonly number[]): number {
  if (chord.quality.power) return 2;
  return Math.min(5, Math.max(3, required.length));
}

interface FingerLayout {
  readonly barre: BarrePosition | null;
  readonly fingerByString: ReadonlyArray<number | null>;
  readonly fingers: readonly FingerPosition[];
  readonly count: number;
  readonly complete: boolean;
}

/**
 * Uma pestana só é plausível quando acontece na menor casa pressionada e cobre
 * pelo menos três cordas. Pestanas de três cordas em posição aberta são
 * evitadas quando há cordas soltas fora do trecho, porque nesse caso o
 * violonista costuma usar dedos separados.
 */
function detectBarre(frets: readonly FretValue[]): BarrePosition | null {
  const played = frets
    .map((fret, stringIndex) => ({ fret, stringIndex }))
    .filter((item) => item.fret > 0);

  if (played.length < 3) return null;

  const minimumFret = Math.min(...played.map((item) => item.fret));
  const minimumStrings = played
    .filter((item) => item.fret === minimumFret)
    .map((item) => item.stringIndex);

  if (minimumStrings.length < 2) return null;

  let best: { fromStringIndex: number; toStringIndex: number } | null = null;

  for (let left = 0; left < minimumStrings.length; left += 1) {
    for (let right = left + 1; right < minimumStrings.length; right += 1) {
      const fromStringIndex = minimumStrings[left];
      const toStringIndex = minimumStrings[right];
      if (fromStringIndex === undefined || toStringIndex === undefined) continue;
      if (toStringIndex - fromStringIndex + 1 < 3) continue;

      let everyStringPlayed = true;
      for (let index = fromStringIndex; index <= toStringIndex; index += 1) {
        if (fretAt(frets, index) <= 0) {
          everyStringPlayed = false;
          break;
        }
      }
      if (!everyStringPlayed) continue;

      if (
        best === null ||
        toStringIndex - fromStringIndex > best.toStringIndex - best.fromStringIndex
      ) {
        best = { fromStringIndex, toStringIndex };
      }
    }
  }

  if (best === null) return null;

  const span = best.toStringIndex - best.fromStringIndex + 1;
  const hasOpenOutside = frets.some(
    (fret, index) => fret === 0 && (index < best.fromStringIndex || index > best.toStringIndex),
  );

  if (span === 3 && hasOpenOutside) return null;

  return { fret: minimumFret, ...best };
}

function fingerLayout(frets: readonly FretValue[]): FingerLayout {
  const fingerByString: Array<number | null> = frets.map(() => null);
  const played = frets
    .map((fret, stringIndex) => ({ fret, stringIndex }))
    .filter((item) => item.fret > 0);

  if (played.length === 0) {
    return { barre: null, fingerByString, fingers: [], count: 0, complete: true };
  }

  const barre = detectBarre(frets);

  if (barre) {
    for (let index = barre.fromStringIndex; index <= barre.toStringIndex; index += 1) {
      if (fretAt(frets, index) === barre.fret) fingerByString[index] = 1;
    }
  }

  const remaining = played
    .filter((item) => fingerByString[item.stringIndex] === null)
    .sort((left, right) => left.fret - right.fret || left.stringIndex - right.stringIndex);

  let nextFinger = barre ? 2 : 1;
  for (const item of remaining) {
    if (nextFinger > MAX_FINGERS) break;
    fingerByString[item.stringIndex] = nextFinger;
    nextFinger += 1;
  }

  const fingers = fingerByString.flatMap((finger, stringIndex) => {
    const fret = frets[stringIndex];
    return finger === null || fret === undefined || fret <= 0
      ? []
      : [{ finger, stringIndex, fret }];
  });

  const distinctFingers = new Set(fingers.map((finger) => finger.finger));
  const complete = played.every((item) => fingerByString[item.stringIndex] !== null);

  return {
    barre,
    fingerByString,
    fingers,
    count: distinctFingers.size,
    complete,
  };
}

function scoreVoicing(frets: readonly FretValue[], layout: FingerLayout): number {
  let sounding = 0;
  let open = 0;
  let muted = 0;
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = 0;
  let firstSounding = -1;
  let lastSounding = -1;

  frets.forEach((fret, index) => {
    if (fret < 0) {
      muted += 1;
      return;
    }

    sounding += 1;
    if (firstSounding < 0) firstSounding = index;
    lastSounding = index;

    if (fret === 0) {
      open += 1;
      return;
    }

    minimum = Math.min(minimum, fret);
    maximum = Math.max(maximum, fret);
  });

  let openInside = 0;
  if (firstSounding >= 0) {
    for (let index = firstSounding; index <= lastSounding; index += 1) {
      if (fretAt(frets, index) === 0) openInside += 1;
    }
  }

  const hasFretted = Number.isFinite(minimum);
  const span = hasFretted ? maximum - minimum : 0;
  const position = hasFretted ? minimum : 0;

  let score = -0.28 * sounding + 0.55 * muted + 0.18 * position + 0.35 * span;

  if (span >= MAX_FRET_SPAN) score += 1.2;
  if (position <= 2) score -= 0.22 * open;
  else score += 0.4 * open;
  if (open > 0 && maximum >= 4) score += 0.8;
  score += 0.45 * openInside;
  score += 0.35 * Math.max(0, layout.count - 3);
  if (layout.barre) {
    score += 0.35;
    const barreSpan = layout.barre.toStringIndex - layout.barre.fromStringIndex + 1;
    if (barreSpan === 3 && position <= 2) score += 0.6;
  }
  if (hasFretted && position >= 4 && muted >= 2) score += 0.6;

  return score;
}

interface VoicingEvaluation {
  readonly frets: readonly FretValue[];
  readonly baseFret: number;
  readonly layout: FingerLayout;
  readonly omittedIntervals: readonly PitchClass[];
  readonly score: number;
}

function evaluateVoicing(
  chord: ParsedChord,
  frets: readonly FretValue[],
  intervals: ChordIntervals,
  minimumSounding: number,
  maxFret: number,
): VoicingEvaluation | null {
  if (frets.length !== 6) return null;
  if (frets.some((fret) => fret < -1 || fret > maxFret)) return null;

  const firstSounding = frets.findIndex((fret) => fret >= 0);
  if (firstSounding < 0) return null;

  const lastSounding = frets.reduce(
    (last, fret, index) => (fret >= 0 ? index : last),
    firstSounding,
  );

  for (let index = firstSounding; index <= lastSounding; index += 1) {
    if (fretAt(frets, index) < 0) return null;
  }

  const soundingCount = frets.filter((fret) => fret >= 0).length;
  if (soundingCount < minimumSounding) return null;

  const allowed = new Set(
    [...intervals.required, ...intervals.optional].map((interval) =>
      pitchClass(chord.root.pitchClass + interval),
    ),
  );
  const requiredPitchClasses = intervals.required.map((interval) =>
    pitchClass(chord.root.pitchClass + interval),
  );
  const bassPitchClass = pitchClass(chord.root.pitchClass + intervals.bass);

  const present = new Set<PitchClass>();
  let everyPitchAllowed = true;

  frets.forEach((fret, stringIndex) => {
    if (fret < 0) return;
    const soundingPitchClass = pitchClass(openPitchAt(stringIndex) + fret);
    if (!allowed.has(soundingPitchClass)) {
      everyPitchAllowed = false;
      return;
    }
    present.add(soundingPitchClass);
  });

  if (!everyPitchAllowed) return null;
  if (requiredPitchClasses.some((required) => !present.has(required))) return null;

  const lowestFret = fretAt(frets, firstSounding);
  const lowestPitchClass = pitchClass(openPitchAt(firstSounding) + lowestFret);
  if (lowestPitchClass !== bassPitchClass) return null;

  const frettedValues = positiveFretValues(frets);
  const minimumFret = frettedValues.length > 0 ? Math.min(...frettedValues) : 0;
  const maximumFret = frettedValues.length > 0 ? Math.max(...frettedValues) : 0;
  if (maximumFret - minimumFret > MAX_FRET_SPAN) return null;

  const openPosition = isOpenPosition(frets);
  if (openPosition && maximumFret > MAX_OPEN_FRET) return null;

  const layout = fingerLayout(frets);
  if (!layout.complete || layout.count > MAX_FINGERS) return null;

  const omittedIntervals = intervals.optional
    .filter((interval) => !present.has(pitchClass(chord.root.pitchClass + interval)))
    .map((interval) => interval as PitchClass);

  let score = scoreVoicing(frets, layout) + omittedIntervals.length * 0.9;
  if (!chord.quality.power && soundingCount <= 3) score += 0.8;

  return {
    frets: [...frets],
    baseFret: openPosition || frettedValues.length === 0 ? 1 : minimumFret,
    layout,
    omittedIntervals,
    score,
  };
}

function findVoicings(
  chord: ParsedChord,
  intervals: ChordIntervals,
  minimumSounding: number,
  maxFret: number,
): VoicingEvaluation[] {
  const allowedPitchClasses = new Set(
    [...intervals.required, ...intervals.optional].map((interval) =>
      pitchClass(chord.root.pitchClass + interval),
    ),
  );
  const bassPitchClass = pitchClass(chord.root.pitchClass + intervals.bass);
  const results: VoicingEvaluation[] = [];
  const seen = new Set<string>();
  const frets: FretValue[] = [0, 0, 0, 0, 0, 0];

  for (let baseFret = 1; baseFret <= maxFret; baseFret += 1) {
    const highestCandidate = Math.min(maxFret, baseFret + MAX_FRET_SPAN);
    const candidatesByString: number[][] = [];

    for (let stringIndex = 0; stringIndex < 6; stringIndex += 1) {
      const candidates: number[] = [-1];
      const openPitchClass = pitchClass(openPitchAt(stringIndex));

      if (allowedPitchClasses.has(openPitchClass)) candidates.push(0);
      for (let fret = baseFret; fret <= highestCandidate; fret += 1) {
        if (allowedPitchClasses.has(pitchClass(openPitchAt(stringIndex) + fret))) {
          candidates.push(fret);
        }
      }

      candidatesByString.push(candidates);
    }

    const visit = (stringIndex: number, started: boolean, ended: boolean, played: number): void => {
      if (stringIndex === 6) {
        if (played < minimumSounding) return;

        const frettedValues = positiveFretValues(frets);
        if (frettedValues.length > 0 && Math.min(...frettedValues) !== baseFret) return;

        const key = frets.join(',');
        if (seen.has(key)) return;

        const evaluation = evaluateVoicing(chord, frets, intervals, minimumSounding, maxFret);
        if (!evaluation) return;

        seen.add(key);
        results.push(evaluation);
        return;
      }

      const candidates = candidatesByString[stringIndex] ?? [];

      for (const fret of candidates) {
        if (fret < 0) {
          if (started && ended) continue;
          frets[stringIndex] = -1;
          visit(stringIndex + 1, started, started, played);
          continue;
        }

        if (ended) continue;

        const candidatePitchClass = pitchClass(openPitchAt(stringIndex) + fret);
        if (!started && candidatePitchClass !== bassPitchClass) continue;

        frets[stringIndex] = fret;
        visit(stringIndex + 1, true, false, played + 1);
      }

      frets[stringIndex] = 0;
    };

    visit(0, false, false, 0);
  }

  return results;
}

/**
 * Formas de referência, sempre validadas musicalmente antes do uso. A validação
 * impede que uma forma gravada por engano seja exibida como correta.
 */
const EXACT_PRESETS: Readonly<Record<string, string>> = {
  Gm7: '353333',
  A7M: 'x02120',
  'E7(9)': '020102',
  'C#m7': 'x46454',
  D7M: 'xx0222',
  'A#º': 'x1232x',
  Bbº: 'x1232x',
  Bm7: 'x20202',
  'C#': 'x46664',
  Db: 'x46664',
  'C#m': 'x46654',
  Dbm: 'x46654',
  'F#': '244322',
  Gb: '244322',
  'F#m': '244222',
  Gbm: '244222',
  'A#': 'x13331',
  Bb: 'x13331',
  'A#m': 'x13321',
  Bbm: 'x13321',
  'D#': 'x68886',
  Eb: 'x68886',
  'D#m': 'x68876',
  Ebm: 'x68876',
  'G#': '466544',
  Ab: '466544',
  'G#m': '466444',
  Abm: '466444',
};

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

function presetEvaluation(
  chord: ParsedChord,
  intervals: ChordIntervals,
  minimumSounding: number,
  maxFret: number,
): VoicingEvaluation | null {
  const exact = EXACT_PRESETS[chord.symbol];
  const kind = presetClass(chord);
  const encoded =
    exact ??
    (kind !== null && chord.bass === null
      ? PRESETS[`${chord.root.pitchClass}:${kind}`]
      : undefined);

  if (!encoded || encoded.length !== 6) return null;

  const frets = [...encoded].map((value) => (value === 'x' ? -1 : Number(value)));
  return evaluateVoicing(chord, frets, intervals, minimumSounding, maxFret);
}

function completeVoicing(symbol: string, evaluation: VoicingEvaluation): ChordVoicing {
  const { frets, baseFret, layout, omittedIntervals, score } = evaluation;
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
    approximate: false,
    omittedIntervals,
    score,
  };
}

/** Rótulo curto e sem ambiguidade para a posição exibida. */
export function chordPositionLabel(voicing: ChordVoicing): string {
  if (voicing.baseFret > 1) return `Casa ${voicing.baseFret}`;
  return voicing.strings.some((string) => string.state === 'open') ? 'Posição aberta' : 'Casa 1';
}

const cache = new Map<string, readonly ChordVoicing[]>();

export function getChordVoicings(
  value: string | ParsedChord,
  options: VoicingOptions = {},
): ChordVoicing[] {
  const chord = typeof value === 'string' ? parseChord(value) : value;
  if (!chord) return [];

  const maxPositions = Math.max(
    1,
    Math.min(MAX_CACHED_POSITIONS, Math.trunc(options.maxPositions ?? 6)),
  );
  const maxFret = Math.max(1, Math.min(15, Math.trunc(options.maxFret ?? DEFAULT_MAX_FRET)));
  const cacheKey = `${chord.symbol}|${maxFret}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached.slice(0, maxPositions);

  const intervals = chordIntervals(chord);
  const minimumSounding = minimumSoundingCount(chord, intervals.required);
  const preset = presetEvaluation(chord, intervals, minimumSounding, maxFret);
  const candidates = findVoicings(chord, intervals, minimumSounding, maxFret).sort(
    (left, right) => left.score - right.score,
  );

  const picked: VoicingEvaluation[] = [];
  const buckets = new Set<string>();
  const seen = new Set<string>();

  function pick(candidate: VoicingEvaluation): void {
    const key = candidate.frets.join(',');
    if (seen.has(key)) return;

    const bucket = `${candidate.baseFret}`;
    if (buckets.has(bucket)) return;

    seen.add(key);
    buckets.add(bucket);
    picked.push(candidate);
  }

  if (preset) pick(preset);
  for (const candidate of candidates) {
    if (picked.length >= MAX_CACHED_POSITIONS) break;
    pick(candidate);
  }

  const [first, ...rest] = picked;
  rest.sort((left, right) => left.baseFret - right.baseFret || left.score - right.score);

  const result = (first ? [first, ...rest] : rest).map((evaluation) =>
    completeVoicing(chord.symbol, evaluation),
  );

  cache.set(cacheKey, result);
  return result.slice(0, maxPositions);
}

export function clearVoicingCache(): void {
  cache.clear();
}
