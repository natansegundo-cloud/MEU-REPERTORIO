import type { ChordPlacement } from './musical';

export type ParserDiagnosticSeverity = 'error' | 'warning' | 'info';

export type ParserDiagnosticCode =
  | 'EMPTY_INPUT'
  | 'NO_CONTENT'
  | 'KEY_NOT_PROVIDED'
  | 'NO_CHORDS_FOUND'
  | 'UNRECOGNIZED_CHORD'
  | 'INVALID_KEY'
  | 'METADATA_IGNORED'
  | 'PARTIAL_PARSE';

export interface ParserDiagnostic {
  readonly severity: ParserDiagnosticSeverity;
  readonly code: ParserDiagnosticCode;
  readonly message: string;
  readonly lineNumber: number | null;
  readonly column: number | null;
  readonly sourceText: string | null;
}

export interface ParsedChordPlacement extends ChordPlacement {
  readonly rawSymbol: string;
  readonly sourceStart: number;
  readonly sourceEnd: number;
  readonly sourceStartOffset: number;
  readonly sourceEndOffset: number;
  readonly visualPosition: number;
  readonly positionUnit: 'code-point';
  readonly inline: boolean;
}

export type ParsedSongLineKind = 'blank' | 'section' | 'lyric' | 'chords' | 'chord-lyric';

export interface ParsedSongLine {
  readonly kind: ParsedSongLineKind;
  readonly lineNumber: number;
  readonly sourceLineNumbers: readonly number[];
  readonly sourceText: string;
  readonly sourceTexts: readonly string[];
  readonly text: string | null;
  readonly chordText: string | null;
  readonly lyricText: string | null;
  readonly sectionLabel: string | null;
  readonly chords: readonly ParsedChordPlacement[];
  readonly reconstructedText: string;
}

export interface ParsedSongMetadata {
  readonly title: string | null;
  readonly artist: string | null;
  readonly originalKey: string | null;
  readonly currentKey: string | null;
  readonly capo: string | null;
  readonly extraLines: readonly string[];
}

export interface ParsedSongReport {
  readonly lineCount: number;
  readonly chordCount: number;
  readonly lyricCount: number;
  readonly warningCount: number;
  readonly errorCount: number;
}

export interface ParsedSong {
  readonly version: 1;
  readonly valid: boolean;
  readonly originalText: string;
  readonly normalizedText: string;
  readonly body: string;
  readonly reconstructedText: string;
  readonly title: string | null;
  readonly artist: string | null;
  readonly originalKey: string | null;
  readonly currentKey: string | null;
  readonly capo: string | null;
  readonly metadata: ParsedSongMetadata;
  readonly lines: readonly ParsedSongLine[];
  readonly diagnostics: readonly ParserDiagnostic[];
  readonly report: ParsedSongReport;
}
