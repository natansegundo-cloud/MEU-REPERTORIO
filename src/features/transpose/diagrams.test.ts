import { describe, expect, it } from 'vitest';

import { parseChord, type ParsedChord } from './chords';
import { chordPositionLabel, getChordVoicings, type ChordVoicing } from './diagrams';

const STANDARD_TUNING = [40, 45, 50, 55, 59, 64] as const;
const REFERENCE_CHORDS = ['Gm7', 'A7M', 'E7(9)', 'C#m7', 'D7M', 'A#º', 'Bm7', 'C#'] as const;

function pitchClass(value: number): number {
  return ((value % 12) + 12) % 12;
}

interface RequiredIntervals {
  readonly required: readonly number[];
  readonly optional: readonly number[];
}

function requiredIntervals(chord: ParsedChord): RequiredIntervals {
  const quality = chord.quality;
  const required = new Set<number>([0]);
  const optional = new Set<number>();

  if (quality.suspension !== null) required.add(quality.suspension);
  else if (quality.third !== null) required.add(quality.third);

  const hasSeventhOrExtension = quality.seventh !== null || quality.extensions.length > 0;
  const essentialFifth =
    quality.power ||
    quality.kind === 'diminished' ||
    quality.kind === 'half-diminished' ||
    quality.kind === 'augmented';

  if (quality.fifth !== null) {
    if (!hasSeventhOrExtension || essentialFifth) required.add(quality.fifth);
    else optional.add(quality.fifth);
  }

  if (quality.seventh !== null) required.add(quality.seventh);
  quality.extensions.forEach((extension) => required.add(extension.interval));

  if (chord.bass) {
    required.add((chord.bass.pitchClass - chord.root.pitchClass + 12) % 12);
  }

  return {
    required: [...required].filter((interval) => !optional.has(interval)),
    optional: [...optional].filter((interval) => !required.has(interval)),
  };
}

function assertVoicing(symbol: string, voicing: ChordVoicing, maxFret = 12): void {
  const chord = parseChord(symbol);
  expect(chord).not.toBeNull();
  if (!chord) return;

  const intervals = requiredIntervals(chord);
  const allowedPitchClasses = new Set(
    [...intervals.required, ...intervals.optional].map((interval) =>
      pitchClass(chord.root.pitchClass + interval),
    ),
  );
  const requiredPitchClasses = intervals.required.map((interval) =>
    pitchClass(chord.root.pitchClass + interval),
  );
  const expectedBass = chord.bass ? chord.bass.pitchClass : chord.root.pitchClass;

  expect(voicing.symbol).toBe(chord.symbol);
  expect(voicing.frets).toHaveLength(6);
  expect(voicing.strings).toHaveLength(6);
  expect(voicing.frets.every((fret) => fret >= -1 && fret <= maxFret)).toBe(true);

  let firstSounding = -1;
  let lastSounding = -1;
  const present = new Set<number>();

  voicing.strings.forEach((stringPosition, index) => {
    const fret = voicing.frets[index];
    expect(fret).toBeDefined();
    if (fret === undefined) return;

    expect(stringPosition.stringIndex).toBe(index);
    expect(stringPosition.stringNumber).toBe(6 - index);

    if (fret < 0) {
      expect(stringPosition).toMatchObject({
        state: 'muted',
        fret: null,
        finger: null,
        pitchClass: null,
      });
      return;
    }

    if (firstSounding < 0) firstSounding = index;
    lastSounding = index;

    const stringPitchClass = pitchClass(STANDARD_TUNING[index]! + fret);
    expect(stringPosition.pitchClass).toBe(stringPitchClass);
    expect(allowedPitchClasses.has(stringPitchClass)).toBe(true);
    present.add(stringPitchClass);

    if (fret === 0) {
      expect(stringPosition).toMatchObject({ state: 'open', fret: 0, finger: null });
    } else {
      expect(stringPosition.state).toBe('fretted');
      expect(stringPosition.fret).toBe(fret);
      expect(stringPosition.finger).toBeGreaterThanOrEqual(1);
      expect(stringPosition.finger).toBeLessThanOrEqual(4);
    }
  });

  expect(firstSounding).toBeGreaterThanOrEqual(0);
  expect(pitchClass(STANDARD_TUNING[firstSounding]! + voicing.frets[firstSounding]!)).toBe(
    expectedBass,
  );

  if (firstSounding >= 0) {
    for (let index = firstSounding; index <= lastSounding; index += 1) {
      expect(voicing.frets[index]).toBeGreaterThanOrEqual(0);
    }
  }

  requiredPitchClasses.forEach((pitch) => expect(present.has(pitch)).toBe(true));

  const soundingCount = voicing.frets.filter((fret) => fret >= 0).length;
  const minimumSounding = chord.quality.power
    ? 2
    : Math.min(5, Math.max(3, intervals.required.length));
  expect(soundingCount).toBeGreaterThanOrEqual(minimumSounding);

  const frettedValues = voicing.frets.filter((fret) => fret > 0);
  const minimumFret = frettedValues.length > 0 ? Math.min(...frettedValues) : 0;
  const maximumFret = frettedValues.length > 0 ? Math.max(...frettedValues) : 0;

  expect(maximumFret - minimumFret).toBeLessThanOrEqual(4);
  expect(voicing.baseFret).toBe(
    voicing.frets.includes(0) || frettedValues.length === 0 ? 1 : minimumFret,
  );

  if (voicing.frets.includes(0)) expect(maximumFret).toBeLessThanOrEqual(3);

  const fingers = voicing.fingers.map((finger) => finger.finger);
  expect(new Set(fingers).size).toBe(voicing.fingerCount);
  expect(voicing.fingerCount).toBeLessThanOrEqual(4);
  if (voicing.fingerCount > 0) {
    expect([...new Set(fingers)].sort()).toEqual(
      Array.from({ length: voicing.fingerCount }, (_, index) => index + 1),
    );
  }

  voicing.fingers.forEach((finger) => {
    expect(voicing.frets[finger.stringIndex]).toBe(finger.fret);
    expect(finger.fret).toBeGreaterThan(0);
  });

  if (voicing.barre) {
    const { fret, fromStringIndex, toStringIndex } = voicing.barre;
    expect(fret).toBe(minimumFret);
    expect(fromStringIndex).toBeLessThanOrEqual(toStringIndex);
    expect(toStringIndex - fromStringIndex + 1).toBeGreaterThanOrEqual(3);

    let sameFretStrings = 0;
    for (let index = fromStringIndex; index <= toStringIndex; index += 1) {
      const stringFret = voicing.frets[index];
      expect(stringFret).toBeGreaterThanOrEqual(fret);
      if (stringFret === fret) {
        sameFretStrings += 1;
        expect(voicing.strings[index]?.finger).toBe(1);
      }
    }
    expect(sameFretStrings).toBeGreaterThanOrEqual(2);
  }

  expect(Number.isFinite(voicing.score)).toBe(true);
}

describe('diagramas de violão', () => {
  it('gera posições musicais válidas para todos os acordes de referência', () => {
    for (const symbol of REFERENCE_CHORDS) {
      const voicings = getChordVoicings(symbol);

      expect(voicings.length, symbol).toBeGreaterThan(0);
      voicings.forEach((voicing) => assertVoicing(symbol, voicing));
    }
  }, 30_000);

  it('mantém formas de referência comuns e confortáveis como primeira posição', () => {
    const expected: Readonly<Record<string, readonly number[]>> = {
      Gm7: [3, 5, 3, 3, 3, 3],
      A7M: [-1, 0, 2, 1, 2, 0],
      'E7(9)': [0, 2, 0, 1, 0, 2],
      'C#m7': [-1, 4, 6, 4, 5, 4],
      D7M: [-1, -1, 0, 2, 2, 2],
      'A#º': [-1, 1, 2, 3, 2, -1],
      Bm7: [-1, 2, 0, 2, 0, 2],
      'C#': [-1, 4, 6, 6, 6, 4],
      C: [-1, 3, 2, 0, 1, 0],
      F: [1, 3, 3, 2, 1, 1],
      Bm: [-1, 2, 4, 4, 3, 2],
      G: [3, 2, 0, 0, 0, 3],
    };

    for (const [symbol, frets] of Object.entries(expected)) {
      const voicing = getChordVoicings(symbol)[0];
      expect(voicing?.frets, symbol).toEqual(frets);
    }
  });

  it('identifica cordas soltas, abafadas e a afinação padrão', () => {
    const c = getChordVoicings('C')[0];
    const f = getChordVoicings('F')[0];

    expect(c?.strings[0]).toMatchObject({
      stringIndex: 0,
      stringNumber: 6,
      state: 'muted',
      fret: null,
      pitchClass: null,
    });
    expect(c?.strings[3]).toMatchObject({
      stringNumber: 3,
      state: 'open',
      fret: 0,
      finger: null,
      pitchClass: 7,
    });
    expect(c?.strings[5]).toMatchObject({ state: 'open', fret: 0, pitchClass: 4 });

    expect(f?.frets).toEqual([1, 3, 3, 2, 1, 1]);
    expect(f?.baseFret).toBe(1);
    expect(chordPositionLabel(f!)).toBe('Casa 1');
  });

  it('atribui dedos de forma plausível e representa pestanas corretamente', () => {
    const f = getChordVoicings('F')[0]!;
    const gm7 = getChordVoicings('Gm7')[0]!;
    const bm = getChordVoicings('Bm')[0]!;
    const cSharp = getChordVoicings('C#')[0]!;
    const aSharpDim = getChordVoicings('A#º')[0]!;

    expect(f.fingerCount).toBe(4);
    expect(f.barre).toMatchObject({ fret: 1, fromStringIndex: 0, toStringIndex: 5 });
    expect(f.strings[3]?.finger).toBe(2);
    expect(f.strings[1]?.finger).toBe(3);
    expect(f.strings[2]?.finger).toBe(4);

    expect(gm7.fingerCount).toBe(2);
    expect(gm7.barre).toMatchObject({ fret: 3, fromStringIndex: 0, toStringIndex: 5 });
    expect(gm7.strings[1]?.finger).toBe(2);

    expect(bm.barre).toMatchObject({ fret: 2, fromStringIndex: 1, toStringIndex: 5 });
    expect(bm.fingerCount).toBe(4);

    expect(cSharp.baseFret).toBe(4);
    expect(cSharp.barre).toMatchObject({ fret: 4, fromStringIndex: 1, toStringIndex: 5 });
    expect(cSharp.strings[2]?.finger).toBe(2);
    expect(cSharp.strings[3]?.finger).toBe(3);
    expect(cSharp.strings[4]?.finger).toBe(4);

    expect(aSharpDim.barre).toBeNull();
    expect(aSharpDim.fingerCount).toBe(4);
  });

  it('gera variações diferentes, sem duplicatas e com posições identificadas', () => {
    const symbols = ['C', 'F', 'G', 'Am', 'E7(9)', 'Gm7', 'C#m7', 'Bm7', 'C#', 'A#º'];

    for (const symbol of symbols) {
      const voicings = getChordVoicings(symbol);
      const fretKeys = voicings.map((voicing) => voicing.frets.join(','));
      const positions = voicings.map((voicing) => voicing.baseFret);

      expect(voicings.length, symbol).toBeGreaterThan(1);
      expect(new Set(fretKeys).size, symbol).toBe(voicings.length);
      expect(new Set(positions).size, symbol).toBe(voicings.length);

      const rest = voicings.slice(1);
      rest.slice(1).forEach((voicing, index) => {
        expect(voicing.baseFret).toBeGreaterThanOrEqual(rest[index]!.baseFret);
      });
    }
  });

  it('respeita o limite de casas e recua quando não há posição confiável', () => {
    const limited = getChordVoicings('C', { maxFret: 5 });

    expect(limited.length).toBeGreaterThan(0);
    expect(limited.every((voicing) => voicing.frets.every((fret) => fret <= 5))).toBe(true);

    expect(getChordVoicings('C', { maxFret: 1 })).toEqual([]);
    expect(getChordVoicings('não-é-acorde')).toEqual([]);
  });

  it('preserva a nota do baixo em inversões', () => {
    const voicings = getChordVoicings('A/C#', { maxPositions: 4 });

    expect(voicings.length).toBeGreaterThan(0);
    voicings.forEach((voicing) => {
      const lowest = voicing.strings.find((string) => string.state !== 'muted');
      expect(lowest?.pitchClass).toBe(1);
    });
  });

  it('cobre tríades, sétimas, diminutos e extensões sem notas estranhas', () => {
    const symbols = [
      'C',
      'Cm',
      'C7',
      'Cmaj7',
      'Cm7',
      'Cº',
      'C#',
      'D',
      'Dm',
      'D7',
      'Dmaj7',
      'Dm7',
      'E',
      'Em',
      'E7',
      'Emaj7',
      'Em7',
      'F',
      'Fm',
      'F7',
      'Fmaj7',
      'Fm7',
      'G',
      'Gm',
      'G7',
      'Gmaj7',
      'Gm7',
      'A',
      'Am',
      'A7',
      'Amaj7',
      'Am7',
      'B',
      'Bm',
      'B7',
      'Bmaj7',
      'Bm7',
      'E7(9)',
      'A#º',
      'Bm7',
      'D7M',
      'C5',
    ];

    for (const symbol of symbols) {
      const voicings = getChordVoicings(symbol, { maxPositions: 3 });
      expect(voicings.length, symbol).toBeGreaterThan(0);
      voicings.forEach((voicing) => assertVoicing(symbol, voicing));
    }
  }, 30_000);

  it('rotula a posição a partir do desenho real, não do laço de geração', () => {
    const openC = getChordVoicings('C')[0]!;
    const barreF = getChordVoicings('F')[0]!;
    const openDmaj7 = getChordVoicings('D7M')[0]!;
    const cSharp = getChordVoicings('C#')[0]!;
    const gm7 = getChordVoicings('Gm7')[0]!;

    expect(chordPositionLabel(openC)).toBe('Posição aberta');
    expect(chordPositionLabel(barreF)).toBe('Casa 1');
    expect(chordPositionLabel(openDmaj7)).toBe('Posição aberta');
    expect(chordPositionLabel(cSharp)).toBe('Casa 4');
    expect(chordPositionLabel(gm7)).toBe('Casa 3');
  });
});
