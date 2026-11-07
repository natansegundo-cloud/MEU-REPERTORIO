import { describe, expect, it } from 'vitest';

import { getChordVoicings } from './diagrams';

describe('diagramas de violão', () => {
  it('retorna o formato clássico de primeira posição para acordes comuns', () => {
    const c = getChordVoicings('C', { maxPositions: 3 });
    const aMinor = getChordVoicings('Am', { maxPositions: 3 });

    expect(c.length).toBe(3);
    expect(c[0]?.frets).toEqual([-1, 3, 2, 0, 1, 0]);
    expect(aMinor[0]?.frets).toEqual([-1, 0, 2, 2, 1, 0]);
  });

  it('expõe cordas abertas, abafadas, casas e dedos para renderização futura', () => {
    const voicing = getChordVoicings('C')[0];

    expect(voicing).toBeDefined();
    expect(voicing?.strings).toHaveLength(6);
    expect(voicing?.strings[0]).toMatchObject({
      stringIndex: 0,
      stringNumber: 6,
      state: 'muted',
      fret: null,
      pitchClass: null,
    });
    expect(voicing?.strings[3]).toMatchObject({
      stringNumber: 3,
      state: 'open',
      fret: 0,
      finger: null,
    });
    expect(voicing?.fingers.length).toBeGreaterThan(0);
  });

  it('respeita a nota do baixo em inversões', () => {
    const voicing = getChordVoicings('A/C#')[0];
    const lowestPlayed = voicing?.strings.find((string) => string.state !== 'muted');

    expect(voicing).toBeDefined();
    expect(lowestPlayed?.pitchClass).toBe(1);
  });

  it('representa pestanas e fornece alternativas para qualidades complexas', () => {
    const f = getChordVoicings('F')[0];
    const complex = getChordVoicings('E7(9)', { maxPositions: 4 });
    const diminished = getChordVoicings('Bbº', { maxPositions: 4 });

    expect(f?.barre).toMatchObject({ fret: 1, fromStringIndex: 0, toStringIndex: 5 });
    expect(f?.fingerCount).toBeLessThanOrEqual(4);
    expect(complex.length).toBeGreaterThan(0);
    expect(diminished.length).toBeGreaterThan(0);
    expect(complex.every((item) => item.symbol === 'E7(9)')).toBe(true);
    expect(complex.every((item) => item.strings.length === 6)).toBe(true);
  });

  it('retorna vazio para uma cifra inválida sem quebrar a camada musical', () => {
    expect(getChordVoicings('não-é-acorde')).toEqual([]);
  });
});
