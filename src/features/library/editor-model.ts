import { parseChord } from '@/features/transpose';
import type { ParsedChordPlacement, ParsedSong, ParsedSongLine } from '@/types';

export interface StructureValidationIssue {
  readonly lineIndex: number;
  readonly chordIndex: number | null;
  readonly message: string;
}

function renderChordRow(chords: readonly ParsedChordPlacement[]): string {
  let result = '';

  for (const chord of chords) {
    const position = Math.max(0, Math.trunc(chord.position));
    if (result.length < position) result += ' '.repeat(position - result.length);
    if (result.length > position) result += ' ';
    result += chord.symbol;
  }

  return result;
}

function createPlacement(symbol: string, position: number): ParsedChordPlacement {
  const safePosition = Math.max(0, Math.trunc(position));
  return {
    position: safePosition,
    symbol,
    rawSymbol: symbol,
    sourceStart: safePosition,
    sourceEnd: safePosition + symbol.length,
    sourceStartOffset: safePosition,
    sourceEndOffset: safePosition + symbol.length,
    visualPosition: safePosition,
    positionUnit: 'code-point',
    inline: false,
  };
}

function editableLine(
  line: ParsedSongLine,
  changes: {
    readonly text?: string | null;
    readonly chords?: readonly ParsedChordPlacement[];
    readonly sectionLabel?: string | null;
  },
): ParsedSongLine {
  if (line.kind === 'blank' || line.kind === 'section') {
    const label = changes.sectionLabel ?? line.sectionLabel;
    return line.kind === 'section'
      ? {
          ...line,
          sectionLabel: label,
          text: label,
          sourceText: label ?? '',
          sourceTexts: [label ?? ''],
          reconstructedText: label ?? '',
        }
      : line;
  }

  const lyricText = changes.text === undefined ? line.lyricText : changes.text;
  const chords = changes.chords ?? line.chords;
  const chordText = chords.length > 0 ? renderChordRow(chords) : null;
  const sourceTexts =
    lyricText !== null && chordText !== null
      ? [chordText, lyricText]
      : [chordText ?? lyricText ?? ''];

  return {
    ...line,
    kind: lyricText !== null ? (chords.length > 0 ? 'chord-lyric' : 'lyric') : 'chords',
    sourceText: sourceTexts.join('\n'),
    sourceTexts,
    text: lyricText,
    chordText,
    lyricText,
    chords,
    reconstructedText: sourceTexts.join('\n'),
  };
}

function rebuildStructure(song: ParsedSong, lines: readonly ParsedSongLine[]): ParsedSong {
  const body = lines.map((line) => line.reconstructedText).join('\n');
  const chordCount = lines.reduce((count, line) => count + line.chords.length, 0);
  const lyricCount = lines.filter((line) => line.text !== null && line.text.trim() !== '').length;

  return {
    ...song,
    lines,
    body,
    reconstructedText: body,
    report: {
      ...song.report,
      lineCount: lines.length,
      chordCount,
      lyricCount,
    },
  };
}

function replaceLine(
  song: ParsedSong,
  lineIndex: number,
  updater: (line: ParsedSongLine) => ParsedSongLine,
): ParsedSong {
  if (!song.lines[lineIndex]) return song;
  const lines = song.lines.map((line, index) => (index === lineIndex ? updater(line) : line));
  return rebuildStructure(song, lines);
}

export function updateLineText(song: ParsedSong, lineIndex: number, text: string): ParsedSong {
  return replaceLine(song, lineIndex, (line) => {
    if (line.kind === 'blank') {
      return editableLine(
        {
          ...line,
          kind: 'lyric',
          text: '',
          lyricText: '',
          sectionLabel: null,
        },
        { text },
      );
    }
    return editableLine(line, { text });
  });
}

export function updateSectionLabel(
  song: ParsedSong,
  lineIndex: number,
  sectionLabel: string,
): ParsedSong {
  return replaceLine(song, lineIndex, (line) => editableLine(line, { sectionLabel }));
}

export function updateChord(
  song: ParsedSong,
  lineIndex: number,
  chordIndex: number,
  symbol: string,
): ParsedSong {
  return replaceLine(song, lineIndex, (line) => {
    if (!line.chords[chordIndex]) return line;
    const chords = line.chords.map((chord, index) =>
      index === chordIndex ? { ...chord, symbol: symbol.trim(), rawSymbol: symbol.trim() } : chord,
    );
    return editableLine(line, { chords });
  });
}

export function updateChordPosition(
  song: ParsedSong,
  lineIndex: number,
  chordIndex: number,
  position: number,
): ParsedSong {
  return replaceLine(song, lineIndex, (line) => {
    if (!line.chords[chordIndex]) return line;
    const chords = line.chords.map((chord, index) =>
      index === chordIndex
        ? {
            ...chord,
            position: Math.max(0, Math.trunc(position)),
            visualPosition: Math.max(0, Math.trunc(position)),
          }
        : chord,
    );
    return editableLine(line, { chords });
  });
}

export function addChord(
  song: ParsedSong,
  lineIndex: number,
  symbol = 'C',
  position?: number,
): ParsedSong {
  return replaceLine(song, lineIndex, (line) => {
    const lyricText = line.kind === 'blank' ? '' : line.lyricText;
    const nextPosition = position ?? lyricText?.length ?? 0;
    const chords = [...line.chords, createPlacement(symbol, nextPosition)];
    const baseLine =
      line.kind === 'blank'
        ? { ...line, kind: 'chords' as const, text: null, lyricText: null, sectionLabel: null }
        : line;
    return editableLine(baseLine, { chords });
  });
}

export function removeChord(song: ParsedSong, lineIndex: number, chordIndex: number): ParsedSong {
  return replaceLine(song, lineIndex, (line) => {
    if (!line.chords[chordIndex]) return line;
    return editableLine(line, { chords: line.chords.filter((_, index) => index !== chordIndex) });
  });
}

export function addLine(song: ParsedSong, afterLineIndex: number): ParsedSong {
  const sourceLine = song.lines[Math.max(-1, afterLineIndex)];
  const lineNumber = (sourceLine?.lineNumber ?? song.lines.length) + 1;
  const emptyLine: ParsedSongLine = {
    kind: 'lyric',
    lineNumber,
    sourceLineNumbers: [lineNumber],
    sourceText: '',
    sourceTexts: [''],
    text: '',
    chordText: null,
    lyricText: '',
    sectionLabel: null,
    chords: [],
    reconstructedText: '',
  };
  const insertionIndex = Math.min(song.lines.length, Math.max(0, afterLineIndex + 1));
  const lines = [...song.lines];
  lines.splice(insertionIndex, 0, emptyLine);
  return rebuildStructure(song, lines);
}

export function removeLine(song: ParsedSong, lineIndex: number): ParsedSong {
  if (!song.lines[lineIndex] || song.lines.length <= 1) return song;
  return rebuildStructure(
    song,
    song.lines.filter((_, index) => index !== lineIndex),
  );
}

export function validateSongStructure(song: ParsedSong): readonly StructureValidationIssue[] {
  const issues: StructureValidationIssue[] = [];

  song.lines.forEach((line, lineIndex) => {
    line.chords.forEach((chord, chordIndex) => {
      if (!chord.symbol.trim() || !parseChord(chord.symbol)) {
        issues.push({ lineIndex, chordIndex, message: `Cifra inválida: “${chord.symbol}”.` });
      }
      if (!Number.isInteger(chord.position) || chord.position < 0) {
        issues.push({
          lineIndex,
          chordIndex,
          message: 'A posição da cifra deve ser um inteiro não negativo.',
        });
      }
    });
  });

  return issues;
}
