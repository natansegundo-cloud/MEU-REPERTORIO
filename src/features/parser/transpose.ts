import {
  transposeChordPlacements,
  transposeTonality,
  type TransposeOptions,
} from '@/features/transpose';

import type { ParsedChordPlacement, ParsedSong, ParsedSongLine } from './types';

function renderChordLine(chords: readonly ParsedChordPlacement[]): string {
  let result = '';

  for (const chord of chords) {
    const target = Math.max(chord.visualPosition, chord.position);
    if (result.length < target) result += ' '.repeat(target - result.length);
    if (result.length > target) result += ' ';
    result += chord.symbol;
  }

  return result;
}

function replaceInlineChords(
  line: ParsedSongLine,
  chords: readonly ParsedChordPlacement[],
): string {
  if (!line.chords.some((chord) => chord.inline)) return line.sourceText;

  const replacements = line.chords
    .filter((chord) => chord.inline)
    .map((chord, index) => ({
      start: chord.sourceStartOffset,
      end: chord.sourceEndOffset,
      value: line.sourceText.slice(chord.sourceStartOffset, chord.sourceEndOffset).startsWith('[')
        ? `[${chords[index]?.symbol ?? chord.symbol}]`
        : (chords[index]?.symbol ?? chord.symbol),
    }))
    .sort((left, right) => left.start - right.start);

  let result = '';
  let cursor = 0;
  for (const replacement of replacements) {
    result += line.sourceText.slice(cursor, replacement.start);
    result += replacement.value;
    cursor = replacement.end;
  }
  return result + line.sourceText.slice(cursor);
}

function transposeLine(
  line: ParsedSongLine,
  semitones: number,
  options: TransposeOptions,
): ParsedSongLine {
  if (line.chords.length === 0) return line;

  const transposed = transposeChordPlacements(line.chords, semitones, options);
  const chords = transposed.map((chord, index) => ({
    ...chord,
    rawSymbol: line.chords[index]?.rawSymbol ?? chord.symbol,
  }));
  const sourceText = line.chords.some((chord) => chord.inline)
    ? replaceInlineChords(line, chords)
    : (line.chordText ?? line.sourceText);
  const reconstructedText =
    line.chordText && line.lyricText !== null
      ? `${renderChordLine(chords)}\n${line.lyricText}`
      : sourceText;

  return {
    ...line,
    sourceText: reconstructedText,
    sourceTexts:
      line.lyricText !== null && line.chordText !== null
        ? [renderChordLine(chords), line.lyricText]
        : [sourceText],
    chordText: line.chordText === null ? null : renderChordLine(chords),
    chords,
    reconstructedText,
  };
}

export function transposeParsedSong(
  song: ParsedSong,
  semitones: number,
  options: TransposeOptions = {},
): ParsedSong {
  const lines = song.lines.map((line) => transposeLine(line, semitones, options));
  const currentKey = song.currentKey
    ? transposeTonality(song.currentKey, semitones, options.spelling)
    : null;
  const body = lines.map((line) => line.reconstructedText).join('\n');

  return {
    ...song,
    currentKey,
    lines,
    body,
    reconstructedText: body,
    metadata: { ...song.metadata, currentKey },
  };
}
