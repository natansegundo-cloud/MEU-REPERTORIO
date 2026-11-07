import { parseTonality } from '@/features/transpose';

import type { ParserDiagnostic } from './types';
import type { NormalizedLine } from './normalize';

export interface ExtractedMetadata {
  readonly title: string | null;
  readonly artist: string | null;
  readonly originalKey: string | null;
  readonly currentKey: string | null;
  readonly capo: string | null;
  readonly extraLines: readonly string[];
  readonly bodyLines: readonly NormalizedLine[];
  readonly diagnostics: readonly ParserDiagnostic[];
}

interface MetadataState {
  title: string | null;
  artist: string | null;
  originalKey: string | null;
  capo: string | null;
}

function diagnostic(
  severity: ParserDiagnostic['severity'],
  code: ParserDiagnostic['code'],
  message: string,
  line: NormalizedLine,
): ParserDiagnostic {
  return {
    severity,
    code,
    message,
    lineNumber: line.lineNumber,
    column: null,
    sourceText: line.text,
  };
}

function labelMatch(line: string): { label: string; value: string } | null {
  const match = /^\s*([^:]{1,32})\s*:\s*(.*?)\s*$/u.exec(line);
  if (!match) return null;

  return {
    label: (match[1] ?? '').normalize('NFC').trim().toLocaleLowerCase('pt-BR'),
    value: (match[2] ?? '').trim(),
  };
}

export function extractExplicitMetadata(lines: readonly NormalizedLine[]): ExtractedMetadata {
  const state: MetadataState = {
    title: null,
    artist: null,
    originalKey: null,
    capo: null,
  };
  const bodyLines: NormalizedLine[] = [];
  const extraLines: string[] = [];
  const diagnostics: ParserDiagnostic[] = [];

  for (const line of lines) {
    const metadata = labelMatch(line.text);
    if (!metadata) {
      bodyLines.push(line);
      continue;
    }

    switch (metadata.label) {
      case 'título':
      case 'titulo':
      case 'música':
      case 'musica':
        state.title = metadata.value || null;
        break;
      case 'artista':
        state.artist = metadata.value || null;
        break;
      case 'tom':
        state.originalKey = metadata.value || null;
        if (metadata.value && !parseTonality(metadata.value)) {
          diagnostics.push(
            diagnostic('warning', 'INVALID_KEY', `Tom não reconhecido: ${metadata.value}`, line),
          );
        }
        break;
      case 'capotraste':
      case 'capo':
        state.capo = metadata.value || null;
        break;
      case 'afinação':
      case 'afinacao':
      case 'fonte':
        extraLines.push(line.text);
        diagnostics.push(
          diagnostic(
            'info',
            'METADATA_IGNORED',
            'Metadado preservado fora do corpo musical.',
            line,
          ),
        );
        break;
      default:
        bodyLines.push(line);
        break;
    }
  }

  return {
    ...state,
    currentKey: state.originalKey,
    extraLines,
    bodyLines,
    diagnostics,
  };
}
