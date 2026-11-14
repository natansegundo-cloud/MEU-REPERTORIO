import { parseChord } from '@/features/transpose';

import { codePointLength, visualWidth } from './normalize';
import type { ParsedChordPlacement, ParserDiagnostic } from './types';
import type { NormalizedLine } from './normalize';

export interface RecognizedLine {
  readonly line: NormalizedLine;
  readonly kind: 'blank' | 'section' | 'lyric' | 'chords' | 'chord-lyric';
  readonly text: string | null;
  readonly label: string | null;
  readonly chordText: string | null;
  readonly chords: readonly ParsedChordPlacement[];
  readonly diagnostics: readonly ParserDiagnostic[];
  readonly outputText?: string;
}

interface ChordCandidate {
  readonly symbol: string;
  readonly rawSymbol: string;
  readonly start: number;
  readonly end: number;
  readonly inline: boolean;
}

function diagnostic(
  severity: ParserDiagnostic['severity'],
  code: ParserDiagnostic['code'],
  message: string,
  line: NormalizedLine,
  column: number | null = null,
): ParserDiagnostic {
  return {
    severity,
    code,
    message,
    lineNumber: line.lineNumber,
    column,
    sourceText: line.text,
  };
}

function unwrapToken(value: string): string {
  let result = value.trim();
  const wrappers: ReadonlyArray<[string, string]> = [
    ['[', ']'],
    ['{', '}'],
    ['<', '>'],
  ];

  for (const [opening, closing] of wrappers) {
    if (result.startsWith(opening) && result.endsWith(closing)) {
      result = result.slice(1, -1).trim();
      break;
    }
  }

  return result.replace(/^[,.;:!?]+|[,.;:!?]+$/gu, '');
}

function candidateFromToken(
  token: string,
  start: number,
  end: number,
  inline: boolean,
  allowBareRoot = false,
): ChordCandidate | null {
  const rawSymbol = unwrapToken(token);
  const parsed = parseChordCandidate(rawSymbol);
  if (!parsed) return null;

  if (
    inline &&
    !allowBareRoot &&
    parsed.root.accidental === null &&
    parsed.suffix === '' &&
    !parsed.bass
  ) {
    return null;
  }

  return { symbol: parsed.symbol, rawSymbol, start, end, inline };
}

function parseChordCandidate(value: string): ReturnType<typeof parseChord> {
  const parsed = parseChord(value);
  if (parsed) return parsed;

  const repaired = value.replace(/\/(?=[^()]*\))/gu, ',');
  const repairedParsed = parseChord(repaired);
  return repairedParsed ? { ...repairedParsed, original: value, symbol: value } : null;
}

function isRhythmToken(value: string): boolean {
  return /^(?:\|+|x\d*|X\d*|-+|–+|—+)$/u.test(value);
}

function tokenCandidates(line: string, inline: boolean): ChordCandidate[] {
  const candidates: ChordCandidate[] = [];
  const tokenPattern = /\S+/gu;

  for (const match of line.matchAll(tokenPattern)) {
    const token = match[0] ?? '';
    const start = match.index ?? 0;
    const end = start + token.length;
    const candidate = candidateFromToken(token, start, end, inline);
    if (candidate) candidates.push(candidate);
  }

  return candidates;
}

function chordLineCandidates(line: string): ChordCandidate[] | null {
  const matches = [...line.matchAll(/\S+/gu)];
  if (matches.length === 0) return null;

  const candidates: ChordCandidate[] = [];
  for (const match of matches) {
    const token = match[0] ?? '';
    if (isRhythmToken(token) || /^[()]$/u.test(token)) continue;

    const start = match.index ?? 0;
    const candidate = candidateFromToken(token, start, start + token.length, false);
    if (!candidate) return null;
    candidates.push(candidate);
  }

  return candidates.length > 0 ? candidates : null;
}

/**
 * Em letras em português, palavras como "Em" coincidem com o acorde de Mi menor.
 * Como esse caminho só é alcançado por linhas mistas, uma raiz simples (maior
 * ou menor, sem acidente, extensão ou baixo) é mais provavelmente palavra.
 */
function isSimpleChordWord(candidate: ChordCandidate): boolean {
  const parsed = parseChordCandidate(candidate.rawSymbol);
  return Boolean(
    parsed &&
    parsed.root.accidental === null &&
    parsed.bass === null &&
    (parsed.suffix === '' || parsed.suffix === 'm'),
  );
}

const SECTION_LABEL_WORDS =
  /^(?:intro|introdu[cç][aã]o|refr[aã]o|verse|verso|ponte|bridge|solo|instrumental|interl[uú]dio|final|outro|coda|riff|primeira parte|segunda parte|terceira parte)(?:\s.*)?$/iu;

function prefixedChordLine(line: string): {
  label: string;
  chordText: string;
  candidates: ChordCandidate[];
} | null {
  const bracket = /^(?:\s*)\[([^\]\r\n]+)\](.*)$/u.exec(line);
  const colon = bracket ? null : /^(?:\s*)([^:\r\n]{1,40}):\s*(.*)$/u.exec(line);
  const match = bracket ?? colon;
  if (!match) return null;

  const label = (match[1] ?? '').trim();
  const rest = match[2] ?? '';
  if (!label || parseChord(label)) return null;
  if (!bracket && !SECTION_LABEL_WORDS.test(label)) return null;

  const candidates = chordLineCandidates(rest);
  if (!candidates) return null;

  const restStart = line.length - rest.length;
  return {
    label,
    chordText: rest,
    candidates: candidates.map((candidate) => ({
      ...candidate,
      start: candidate.start + restStart,
      end: candidate.end + restStart,
    })),
  };
}

function placement(
  line: string,
  candidate: ChordCandidate,
  lyricPrefix: string,
): ParsedChordPlacement {
  return {
    position: codePointLength(lyricPrefix),
    symbol: candidate.symbol,
    rawSymbol: candidate.rawSymbol,
    sourceStart: codePointLength(line.slice(0, candidate.start)),
    sourceEnd: codePointLength(line.slice(0, candidate.end)),
    sourceStartOffset: candidate.start,
    sourceEndOffset: candidate.end,
    visualPosition: visualWidth(line.slice(0, candidate.start)),
    positionUnit: 'code-point',
    inline: candidate.inline,
  };
}

function inlineCandidates(line: string): {
  candidates: ChordCandidate[];
  diagnostics: ParserDiagnostic[];
} {
  const candidates: ChordCandidate[] = [];
  const diagnostics: ParserDiagnostic[] = [];
  const bracketPattern = /\[([^\]\r\n]+)\]/gu;

  for (const match of line.matchAll(bracketPattern)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const inner = match[1] ?? '';
    const candidate = candidateFromToken(inner, start, end, true, true);
    if (candidate) {
      candidates.push(candidate);
    } else if (inner.trim()) {
      diagnostics.push({
        severity: 'warning',
        code: 'UNRECOGNIZED_CHORD',
        message: `Marcação entre colchetes não reconhecida como acorde: ${inner.trim()}`,
        lineNumber: null,
        column: null,
        sourceText: line,
      });
    }
  }

  return { candidates: candidates.sort((left, right) => left.start - right.start), diagnostics };
}

function removeCandidates(line: string, candidates: readonly ChordCandidate[]): string {
  let result = '';
  let cursor = 0;

  for (const candidate of candidates) {
    result += line.slice(cursor, candidate.start);
    cursor = candidate.end;
  }

  return `${result}${line.slice(cursor)}`;
}

function isSection(line: string): string | null {
  const match = /^\s*\[([^\]\r\n]+)\]\s*$/u.exec(line);
  if (!match) return null;

  const label = (match[1] ?? '').trim();
  return parseChord(label) ? null : label || null;
}

export function isBodyMarker(line: NormalizedLine): boolean {
  if (!line.text.trim()) return false;
  return Boolean(
    isSection(line.text) ||
    prefixedChordLine(line.text) ||
    chordLineCandidates(line.text) ||
    inlineCandidates(line.text).candidates.length,
  );
}

export function recognizeLine(line: NormalizedLine): RecognizedLine {
  if (!line.text.trim()) {
    return {
      line,
      kind: 'blank',
      text: null,
      label: null,
      chordText: null,
      chords: [],
      diagnostics: [],
    };
  }

  const sectionLabel = isSection(line.text);
  if (sectionLabel) {
    return {
      line,
      kind: 'section',
      text: null,
      label: sectionLabel,
      chordText: null,
      chords: [],
      diagnostics: [],
    };
  }

  const prefixed = prefixedChordLine(line.text);
  if (prefixed) {
    return {
      line,
      kind: 'chords',
      text: null,
      label: prefixed.label,
      chordText: prefixed.chordText,
      chords: prefixed.candidates.map((candidate) =>
        placement(line.text, candidate, line.text.slice(0, candidate.start)),
      ),
      diagnostics: [],
      outputText: prefixed.chordText,
    };
  }

  const chordLine = chordLineCandidates(line.text);
  if (chordLine) {
    return {
      line,
      kind: 'chords',
      text: null,
      label: null,
      chordText: line.text,
      chords: chordLine.map((candidate) =>
        placement(line.text, candidate, line.text.slice(0, candidate.start)),
      ),
      diagnostics: [],
    };
  }

  const inline = inlineCandidates(line.text);
  if (inline.candidates.length > 0) {
    const placements: ParsedChordPlacement[] = [];
    const lyric = removeCandidates(line.text, inline.candidates);

    for (const candidate of inline.candidates) {
      const prefix = line.text.slice(0, candidate.start);
      placements.push(
        placement(
          line.text,
          candidate,
          removeCandidates(
            prefix,
            inline.candidates.filter((item) => item.end <= candidate.start),
          ),
        ),
      );
    }

    return {
      line,
      kind: 'chord-lyric',
      text: lyric,
      label: null,
      chordText: null,
      chords: placements,
      diagnostics: inline.diagnostics,
    };
  }

  // Cifra usa raiz maiúscula; palavras comuns como "em" não devem gerar aviso.
  const possibleChordWords = tokenCandidates(line.text, false).filter((candidate) =>
    /^[A-G]/u.test(candidate.rawSymbol),
  );
  const diagnostics = possibleChordWords.some((candidate) => !isSimpleChordWord(candidate))
    ? [
        diagnostic(
          'warning',
          'UNRECOGNIZED_CHORD',
          'A linha contém tokens com aparência musical, mas não pôde ser classificada com segurança.',
          line,
        ),
      ]
    : inline.diagnostics;

  return {
    line,
    kind: 'lyric',
    text: line.text,
    label: null,
    chordText: null,
    chords: [],
    diagnostics,
  };
}
