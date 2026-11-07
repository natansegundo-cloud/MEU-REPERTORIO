export type NoteLetter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
export type Accidental = '#' | 'b';
export type PitchClass = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

/** Uma posição de acorde dentro de uma estrutura musical. */
export interface ChordPlacement {
  readonly position: number;
  readonly symbol: string;
}

/** Linha estruturada que poderá ser produzida pelo parser em uma etapa futura. */
export interface ChordLine {
  readonly kind: 'chords' | 'chord-lyric';
  readonly lyric?: string;
  readonly chords: readonly ChordPlacement[];
}

/** Estrutura mínima de uma música para operações que preservam a forma original. */
export interface MusicalStructure {
  readonly lines: readonly ChordLine[];
}
