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

/**
 * Separadores tipográficos (travessão/meia-risca) também delimitam músicas em
 * documentos exportados de editores de texto. A família de traços pode
 * combinar hífen, travessão e meia-risca, mas precisa ter pelo menos cinco
 * caracteres para não confundir uma linha musical.
 */
const SEPARATOR_PATTERN = /^\s*(?:[-\u2014\u2013]{5,}|={5,}|#{5,})\s*$/u;
const SHORT_SEPARATOR_PATTERN = /^\s*[-\u2014\u2013=#]+\s*$/u;

/**
 * O mesmo conjunto de caracteres invisíveis ignorado pelo parser individual.
 * DOCX exportados de páginas de cifra costumam prefixar cada linha com
 * U+200B; sem esta limpeza a linha de acordes deixa de ser reconhecida.
 */
const INVISIBLE_CHARACTERS = /[\u200B-\u200D\u2060\uFEFF\u00AD]/gu;

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
  return text
    .replace(/\r\n?/gu, '\n')
    .replace(/\u00A0/gu, ' ')
    .replace(INVISIBLE_CHARACTERS, '')
    .split('\n');
}

function isExplicitSeparator(line: string): boolean {
  return SEPARATOR_PATTERN.test(line);
}

/** Números de página e rodapés simples não são metadados musicais. */
function isPageFurniture(line: string): boolean {
  const value = line.trim();
  return (
    /^\d{1,3}$/u.test(value) ||
    /^p[aá]gina\s+\d+\s*$/iu.test(value) ||
    /^cifra\s*club/iu.test(value)
  );
}

/**
 * Remove números de página e rodapés simples apenas nas extremidades de cada
 * página. O conteúdo musical interno permanece intacto.
 */
function stripPageFurniture(pages: readonly BatchSourcePage[]): BatchSourcePage[] {
  return pages.map((page) => {
    const lines = normalizeLines(page.text);
    const contentIndexes = lines.flatMap((line, index) => (line.trim() ? [index] : []));
    const first = contentIndexes[0];
    const last = contentIndexes[contentIndexes.length - 1];
    const removable = new Set<number>();
    if (first !== undefined && isPageFurniture(lines[first] ?? '')) removable.add(first);
    if (last !== undefined && last !== first && isPageFurniture(lines[last] ?? ''))
      removable.add(last);
    if (removable.size === 0) return page;
    return {
      ...page,
      text: lines.filter((_, index) => !removable.has(index)).join('\n'),
    };
  });
}

function isLikelyChordLine(line: string): boolean {
  const tokens = line.trim().split(/\s+/u).filter(Boolean);
  if (tokens.length === 0 || tokens.length > 10) return false;
  const chord = /^[A-G](?:#|b)?(?:m|min|maj|M|dim|aug|sus|add|\d|º|°|\+|\(|\)|\/|#|b)*$/u;
  return tokens.every((token) => chord.test(token));
}

interface MetadataLine {
  readonly label: string;
  readonly value: string;
}

function metadataLine(value: string): MetadataLine | null {
  const match = /^\s*([^:]{1,40})\s*:\s*(.*?)\s*$/u.exec(value);
  if (!match) return null;
  return {
    label: (match[1] ?? '').trim().toLocaleLowerCase('pt-BR'),
    value: (match[2] ?? '').trim(),
  };
}

function isTitleLabel(label: string): boolean {
  return ['título', 'titulo', 'música', 'musica', 'song'].includes(label);
}

function isArtistLabel(label: string): boolean {
  return ['artista', 'artist'].includes(label);
}

function isKeyLabel(label: string): boolean {
  return ['tom', 'key'].includes(label);
}

/**
 * Rótulos de seção que aparecem entre parênteses em cifras exportadas de
 * editores de texto, como "(intro 2x) riff" e "(refrão)". Reconhecê-los evita
 * que uma linha de letra seguida de "(refrão)" seja aceita como cabeçalho.
 */
const PARENTHESIZED_SECTION_LABEL =
  /^(?:intro|introdu[cç][aã]o|refr[aã]o|verse|verso|ponte|bridge|solo|instrumental|interl[uú]dio|final|outro|coda|riff)(?:\s.*)?$/iu;

function isSectionLine(value: string): boolean {
  const match = /^[[(]([^\])]*)[\])](.*)$/u.exec(value);
  if (!match) return false;
  const label = (match[1] ?? '').trim();
  const rest = (match[2] ?? '').trim();
  if (!label) return false;
  if (PARENTHESIZED_SECTION_LABEL.test(label)) return true;
  // Progressões escritas entre parênteses, como "( Bb7M  Eb7M )".
  return isLikelyChordLine(label) && (!rest || isLikelyChordLine(rest));
}

function isBodyLine(line: string): boolean {
  const value = line.trim();
  return isLikelyChordLine(value) || isSectionLine(value);
}

function nextContentIndex(lines: readonly string[], index: number): number {
  for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
    if (lines[cursor]?.trim()) return cursor;
  }
  return -1;
}

function hasBodyAfter(lines: readonly string[], index: number): boolean {
  for (let cursor = index + 1; cursor < Math.min(lines.length, index + 8); cursor += 1) {
    if (isBodyLine(lines[cursor] ?? '')) return true;
  }
  return false;
}

/**
 * A song start requires a header shape, not merely a line that happens to be
 * short or close to a chord. This prevents lyric/chord fragments from becoming
 * independent songs.
 */
function isSongHeaderStart(
  lines: readonly string[],
  pageNumbers: readonly number[],
  index: number,
): boolean {
  const title = lines[index]?.trim() ?? '';
  if (!title || title.length > 100 || isExplicitSeparator(title) || isPageFurniture(title))
    return false;

  const titleMetadata = metadataLine(title);
  if (titleMetadata && isTitleLabel(titleMetadata.label)) {
    return hasBodyAfter(lines, index);
  }

  if (titleMetadata || isBodyLine(title) || /^\[[^\]]+\]/u.test(title)) return false;
  const hasHeaderBoundary =
    index === 0 || pageNumbers[index] !== pageNumbers[index - 1] || !lines[index - 1]?.trim();
  if (!hasHeaderBoundary) return false;
  const artistIndex = nextContentIndex(lines, index);
  if (artistIndex < 0) return false;
  const artist = lines[artistIndex]?.trim() ?? '';
  const artistMetadata = metadataLine(artist);

  if (artistMetadata && isArtistLabel(artistMetadata.label)) {
    const keyIndex = nextContentIndex(lines, artistIndex);
    if (keyIndex < 0) return false;
    const key = lines[keyIndex]?.trim() ?? '';
    const keyMetadata = metadataLine(key);
    return Boolean(keyMetadata && isKeyLabel(keyMetadata.label) && hasBodyAfter(lines, keyIndex));
  }

  if (artistMetadata || isBodyLine(artist) || /^\[[^\]]+\]/u.test(artist)) return false;
  const bodyOrKeyIndex = nextContentIndex(lines, artistIndex);
  if (bodyOrKeyIndex < 0) return false;
  const bodyOrKey = lines[bodyOrKeyIndex]?.trim() ?? '';
  const bodyOrKeyMetadata = metadataLine(bodyOrKey);
  if (bodyOrKeyMetadata && isKeyLabel(bodyOrKeyMetadata.label)) {
    return hasBodyAfter(lines, bodyOrKeyIndex);
  }
  return isBodyLine(bodyOrKey);
}

function metadataFromContent(
  content: string,
): Pick<BatchSegment, 'title' | 'artist' | 'originalKey'> {
  const lines = normalizeLines(content)
    .map((line) => line.trim())
    .filter(Boolean);
  const metadata = lines.map((line) => ({ line, parsed: metadataLine(line) }));
  const explicitTitle = metadata.find(({ parsed }) => parsed && isTitleLabel(parsed.label))?.parsed
    ?.value;
  const explicitArtist = metadata.find(({ parsed }) => parsed && isArtistLabel(parsed.label))
    ?.parsed?.value;
  const explicitKey = metadata.find(({ parsed }) => parsed && isKeyLabel(parsed.label))?.parsed
    ?.value;
  const bodyIndex = lines.findIndex((line) => isBodyLine(line));
  const headerLines = (bodyIndex >= 0 ? lines.slice(0, bodyIndex) : lines).filter((line) => {
    const parsed = metadataLine(line);
    return (
      !parsed ||
      (!isTitleLabel(parsed.label) && !isArtistLabel(parsed.label) && !isKeyLabel(parsed.label))
    );
  });
  const title = explicitTitle ?? headerLines[0] ?? lines[0] ?? null;
  const artist = explicitArtist ?? headerLines[1] ?? null;
  return { title, artist, originalKey: explicitKey ?? null };
}

function contentWarnings(content: string): string[] {
  const keyLabels = content.match(/^\s*(?:tom|key)\s*:/gimu)?.length ?? 0;
  const titleLabels = content.match(/^\s*(?:t[ií]tulo|m[uú]sica|song)\s*:/gimu)?.length ?? 0;
  const warnings: string[] = [];
  if (keyLabels > 1)
    warnings.push('Este bloco contém mais de um tom; ele pode ter concatenado músicas.');
  if (titleLabels > 1)
    warnings.push('Este bloco contém mais de um título; ele pode ter concatenado músicas.');
  return warnings;
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
    warnings: [...warnings, ...contentWarnings(content)],
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
  const textLines = lines.map((item) => item.text);
  const starts = lines.flatMap((_, index) =>
    isSongHeaderStart(
      textLines,
      lines.map((line) => line.page),
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
  const pages = stripPageFurniture(document.pages);
  const explicit = explicitSegments(pages);
  return explicit.usedExplicitSeparators ? explicit : automaticSegments(pages);
}
