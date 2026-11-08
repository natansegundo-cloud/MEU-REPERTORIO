import mammoth from 'mammoth';

import { extractPdfPages, type PdfPageText } from './pdf';

export type BatchFileKind = 'pdf' | 'docx';

export interface BatchSourcePage {
  readonly pageNumber: number;
  readonly text: string;
}

export interface BatchDocument {
  readonly kind: BatchFileKind;
  readonly fileName: string;
  readonly pages: readonly BatchSourcePage[];
  readonly text: string;
  readonly extractionWarnings: readonly string[];
}

export interface BatchSegment {
  readonly id: string;
  readonly content: string;
  readonly pageNumbers: readonly number[];
  readonly title: string | null;
  readonly artist: string | null;
  readonly originalKey: string | null;
  readonly warnings: readonly string[];
  readonly explicitSeparator: boolean;
}

export interface BatchSegmentationResult {
  readonly segments: readonly BatchSegment[];
  readonly warnings: readonly string[];
  readonly usedExplicitSeparators: boolean;
}

const SEPARATOR_PATTERN = /^\s*(-{5,}|={5,}|#{5,})\s*$/u;
const SHORT_SEPARATOR_PATTERN = /^\s*[-=#]+\s*$/u;

function pageTextPages(pages: readonly PdfPageText[]): BatchSourcePage[] {
  return pages.map((page) => ({ pageNumber: page.pageNumber, text: page.text }));
}

export async function extractBatchDocument(file: File): Promise<BatchDocument> {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/iu.test(file.name);
  const isDocx =
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    /\.docx$/iu.test(file.name);
  if (!isPdf && !isDocx) throw new Error('Escolha um arquivo PDF ou DOCX.');

  if (isPdf) {
    const pages = pageTextPages(await extractPdfPages(file));
    return {
      kind: 'pdf',
      fileName: file.name,
      pages,
      text: pages.map((page) => page.text).join('\n\n'),
      extractionWarnings: [],
    };
  }

  try {
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    const text = result.value.replace(/\r\n?/gu, '\n');
    return {
      kind: 'docx',
      fileName: file.name,
      pages: [{ pageNumber: 1, text }],
      text,
      extractionWarnings: result.messages.map((message) => message.message),
    };
  } catch (cause: unknown) {
    throw new Error('Não foi possível ler este DOCX. Ele pode estar corrompido ou protegido.', {
      cause,
    });
  }
}

function normalizeLines(text: string): string[] {
  return text.replace(/\r\n?/gu, '\n').split('\n');
}

function isExplicitSeparator(line: string): boolean {
  return SEPARATOR_PATTERN.test(line);
}

function isLikelyChordLine(line: string): boolean {
  const tokens = line.trim().split(/\s+/u).filter(Boolean);
  if (tokens.length === 0 || tokens.length > 10) return false;
  const chord = /^[A-G](?:#|b)?(?:m|min|maj|M|dim|aug|sus|add|\d|º|°|\+|\(|\)|\/|#|b)*$/u;
  return tokens.every((token) => chord.test(token));
}

function isStructuralHeader(lines: readonly string[], index: number): boolean {
  const title = lines[index]?.trim() ?? '';
  if (!title || title.length > 90 || isExplicitSeparator(title) || title.includes(':'))
    return false;
  const next = lines.slice(index + 1).find((line) => line.trim());
  const nextIndex = next ? lines.indexOf(next, index + 1) : -1;
  if (nextIndex < 0) return false;
  const nextValue = lines[nextIndex]?.trim() ?? '';
  const after =
    lines
      .slice(nextIndex + 1)
      .find((line) => line.trim())
      ?.trim() ?? '';
  const bodyStarts =
    isLikelyChordLine(after) || /^\[[^\]]+\]/u.test(after) || /^Tom\s*:/iu.test(after);
  return bodyStarts && (nextValue.length <= 90 || /^Tom\s*:/iu.test(nextValue));
}

function metadataFromContent(
  content: string,
): Pick<BatchSegment, 'title' | 'artist' | 'originalKey'> {
  const lines = normalizeLines(content)
    .map((line) => line.trim())
    .filter(Boolean);
  const title =
    lines.find((line) => /^Título\s*:/iu.test(line))?.replace(/^Título\s*:\s*/iu, '') ?? null;
  const artist =
    lines.find((line) => /^Artista\s*:/iu.test(line))?.replace(/^Artista\s*:\s*/iu, '') ?? null;
  const key = lines.find((line) => /^Tom\s*:/iu.test(line))?.replace(/^Tom\s*:\s*/iu, '') ?? null;
  const fallbackTitle = title ?? lines[0] ?? null;
  return { title: fallbackTitle, artist, originalKey: key };
}

function makeSegment(
  lines: readonly string[],
  pageNumbers: readonly number[],
  index: number,
  explicitSeparator: boolean,
  warnings: readonly string[] = [],
): BatchSegment {
  const content = lines.join('\n').trim();
  const metadata = metadataFromContent(content);
  return {
    id: `batch-${index + 1}`,
    content,
    pageNumbers: [...new Set(pageNumbers)].sort((left, right) => left - right),
    ...metadata,
    warnings,
    explicitSeparator,
  };
}

function explicitSegments(pages: readonly BatchSourcePage[]): BatchSegmentationResult {
  const segments: BatchSegment[] = [];
  const warnings: string[] = [];
  let currentLines: string[] = [];
  let currentPages: number[] = [];
  let separatorCount = 0;
  let separatorStyle: string | null = null;
  let blockIndex = 0;

  const flush = (): void => {
    const content = currentLines.join('\n').trim();
    if (!content) {
      if (separatorCount > 0) warnings.push(`Bloco vazio próximo ao separador ${separatorCount}.`);
    } else {
      segments.push(makeSegment(currentLines, currentPages, blockIndex, true));
      blockIndex += 1;
    }
    currentLines = [];
    currentPages = [];
  };

  for (const page of pages) {
    for (const line of normalizeLines(page.text)) {
      if (isExplicitSeparator(line)) {
        separatorCount += 1;
        flush();
        const style = line.trim().charAt(0);
        if (separatorStyle === null) separatorStyle = style;
        else if (separatorStyle !== style) {
          warnings.push('Foram encontrados separadores de tipos diferentes. Revise os blocos.');
        }
        continue;
      }
      if (SHORT_SEPARATOR_PATTERN.test(line) && line.trim().length < 5) {
        warnings.push(`Linha separadora curta ignorada: “${line.trim()}”.`);
        continue;
      }
      if (line.trim() || currentLines.length > 0) {
        currentLines.push(line);
        currentPages.push(page.pageNumber);
      }
    }
  }
  flush();
  if (separatorCount > 0 && segments.length === 0)
    warnings.push('Nenhum bloco musical foi encontrado.');
  return { segments, warnings, usedExplicitSeparators: separatorCount > 0 };
}

function automaticSegments(pages: readonly BatchSourcePage[]): BatchSegmentationResult {
  const lines = pages.flatMap((page) =>
    normalizeLines(page.text).map((text) => ({ text, page: page.pageNumber })),
  );
  const starts = lines.flatMap((_, index) =>
    isStructuralHeader(
      lines.map((item) => item.text),
      index,
    )
      ? [index]
      : [],
  );
  if (starts.length <= 1) {
    const content = lines
      .map((line) => line.text)
      .join('\n')
      .trim();
    return content
      ? {
          segments: [
            makeSegment(
              lines.map((line) => line.text),
              lines.map((line) => line.page),
              0,
              false,
            ),
          ],
          warnings: [],
          usedExplicitSeparators: false,
        }
      : {
          segments: [],
          warnings: ['O documento não contém blocos musicais com conteúdo.'],
          usedExplicitSeparators: false,
        };
  }
  const segments = starts.map((start, index) => {
    const end = starts[index + 1] ?? lines.length;
    const block = lines.slice(start, end);
    return makeSegment(
      block.map((line) => line.text),
      block.map((line) => line.page),
      index,
      false,
      ['Bloco separado automaticamente; confirme o início e o fim da música.'],
    );
  });
  return {
    segments,
    warnings: ['Nenhum separador explícito foi encontrado; a divisão foi inferida pela estrutura.'],
    usedExplicitSeparators: false,
  };
}

export function segmentBatchDocument(
  document: Pick<BatchDocument, 'pages'>,
): BatchSegmentationResult {
  const explicit = explicitSegments(document.pages);
  return explicit.usedExplicitSeparators ? explicit : automaticSegments(document.pages);
}
