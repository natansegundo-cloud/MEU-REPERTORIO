import { extractExplicitMetadata } from './metadata';
import { normalizeImportedText, type NormalizedLine } from './normalize';
import { isBodyMarker, recognizeLine, type RecognizedLine } from './recognize';
import type { ParsedSong, ParsedSongLine, ParsedSongMetadata, ParserDiagnostic } from './types';

function diagnostic(
  severity: ParserDiagnostic['severity'],
  code: ParserDiagnostic['code'],
  message: string,
): ParserDiagnostic {
  return {
    severity,
    code,
    message,
    lineNumber: null,
    column: null,
    sourceText: null,
  };
}

function withLineContext(
  diagnostics: readonly ParserDiagnostic[],
  line: NormalizedLine,
): ParserDiagnostic[] {
  return diagnostics.map((item) => ({
    ...item,
    lineNumber: item.lineNumber ?? line.lineNumber,
    sourceText: item.sourceText ?? line.text,
  }));
}

function createLine(recognized: RecognizedLine): ParsedSongLine {
  return {
    kind: recognized.kind,
    lineNumber: recognized.line.lineNumber,
    sourceLineNumbers: [recognized.line.lineNumber],
    sourceText: recognized.line.text,
    sourceTexts: [recognized.line.text],
    text: recognized.text,
    chordText: recognized.chordText,
    lyricText: recognized.text,
    sectionLabel: recognized.label,
    chords: recognized.chords,
    reconstructedText: recognized.line.text,
  };
}

function combineChordAndLyric(chords: ParsedSongLine, lyric: ParsedSongLine): ParsedSongLine {
  return {
    kind: 'chord-lyric',
    lineNumber: chords.lineNumber,
    sourceLineNumbers: [chords.lineNumber, lyric.lineNumber],
    sourceText: `${chords.sourceText}\n${lyric.sourceText}`,
    sourceTexts: [chords.sourceText, lyric.sourceText],
    text: lyric.text,
    chordText: chords.chordText,
    lyricText: lyric.text,
    sectionLabel: null,
    chords: chords.chords,
    reconstructedText: `${chords.sourceText}\n${lyric.sourceText}`,
  };
}

function combineLines(recognized: readonly RecognizedLine[]): ParsedSongLine[] {
  const result: ParsedSongLine[] = [];

  for (let index = 0; index < recognized.length; index += 1) {
    const current = createLine(recognized[index] as RecognizedLine);
    const next = recognized[index + 1];

    if (current.kind === 'chords' && next && next.kind === 'lyric') {
      result.push(combineChordAndLyric(current, createLine(next)));
      index += 1;
    } else {
      result.push(current);
    }
  }

  return result;
}

function inferHeader(
  lines: readonly NormalizedLine[],
  title: string | null,
  artist: string | null,
): { title: string | null; artist: string | null; lines: NormalizedLine[] } {
  if (title !== null && artist !== null) return { title, artist, lines: [...lines] };

  const markerIndex = lines.findIndex(isBodyMarker);
  if (markerIndex < 0) return { title, artist, lines: [...lines] };

  const preBody = lines.slice(0, markerIndex).filter((line) => line.text.trim());
  const consumed = new Set<number>();
  let nextTitle = title;
  let nextArtist = artist;
  let headerIndex = 0;

  if (nextTitle === null && preBody[0]) {
    const titleLine = preBody[headerIndex];
    if (titleLine) {
      nextTitle = titleLine.text.trim();
      consumed.add(titleLine.lineNumber);
      headerIndex += 1;
    }
  }
  if (nextArtist === null && preBody[headerIndex]) {
    const artistLine = preBody[headerIndex];
    if (artistLine) {
      nextArtist = artistLine.text.trim();
      consumed.add(artistLine.lineNumber);
    }
  }

  return {
    title: nextTitle,
    artist: nextArtist,
    lines: lines.filter((line) => !consumed.has(line.lineNumber)),
  };
}

function createMetadata(
  extracted: ReturnType<typeof extractExplicitMetadata>,
  title: string | null,
  artist: string | null,
): ParsedSongMetadata {
  return {
    title,
    artist,
    originalKey: extracted.originalKey,
    currentKey: extracted.currentKey,
    capo: extracted.capo,
    extraLines: extracted.extraLines,
  };
}

export function parseSongText(input: string): ParsedSong {
  const normalized = normalizeImportedText(input);
  const diagnostics: ParserDiagnostic[] = [];

  if (!normalized.text.trim()) {
    diagnostics.push(diagnostic('error', 'EMPTY_INPUT', 'O conteúdo importado está vazio.'));
    return {
      version: 1,
      valid: false,
      originalText: input,
      normalizedText: normalized.text,
      body: '',
      reconstructedText: '',
      title: null,
      artist: null,
      originalKey: null,
      currentKey: null,
      capo: null,
      metadata: {
        title: null,
        artist: null,
        originalKey: null,
        currentKey: null,
        capo: null,
        extraLines: [],
      },
      lines: [],
      diagnostics,
      report: { lineCount: 0, chordCount: 0, lyricCount: 0, warningCount: 0, errorCount: 1 },
    };
  }

  const extracted = extractExplicitMetadata(normalized.lines);
  diagnostics.push(...extracted.diagnostics);
  const header = inferHeader(extracted.bodyLines, extracted.title, extracted.artist);
  const recognized = header.lines.map((line) => recognizeLine(line));
  for (const item of recognized) diagnostics.push(...withLineContext(item.diagnostics, item.line));

  const lines = combineLines(recognized);
  const chordCount = lines.reduce((count, line) => count + line.chords.length, 0);
  const lyricCount = lines.filter((line) => line.text !== null && line.text.trim() !== '').length;
  const body = header.lines.map((line) => line.text).join('\n');
  const reconstructedText = lines.map((line) => line.reconstructedText).join('\n');

  if (lines.every((line) => line.kind === 'blank')) {
    diagnostics.push(diagnostic('error', 'NO_CONTENT', 'Nenhum conteúdo musical foi encontrado.'));
  }
  if (extracted.originalKey === null) {
    diagnostics.push(diagnostic('info', 'KEY_NOT_PROVIDED', 'O tom original não foi informado.'));
  }
  if (chordCount === 0) {
    diagnostics.push(
      diagnostic('info', 'NO_CHORDS_FOUND', 'Nenhuma cifra reconhecida; a letra foi preservada.'),
    );
  }

  const metadata = createMetadata(extracted, header.title, header.artist);
  const errorCount = diagnostics.filter((item) => item.severity === 'error').length;
  const warningCount = diagnostics.filter((item) => item.severity === 'warning').length;

  return {
    version: 1,
    valid: errorCount === 0,
    originalText: input,
    normalizedText: normalized.text,
    body,
    reconstructedText,
    title: metadata.title,
    artist: metadata.artist,
    originalKey: metadata.originalKey,
    currentKey: metadata.currentKey,
    capo: metadata.capo,
    metadata,
    lines,
    diagnostics,
    report: {
      lineCount: lines.length,
      chordCount,
      lyricCount,
      warningCount,
      errorCount,
    },
  };
}

export const parse = parseSongText;
