export const MAX_PDF_BYTES = 20 * 1024 * 1024;

export interface PdfTextItem {
  readonly str: string;
  readonly transform: readonly number[];
  readonly width?: number;
}

export interface PdfPageInput {
  readonly width: number;
  readonly items: readonly PdfTextItem[];
}

export interface PdfHeaderMetadata {
  readonly title: string | null;
  readonly artist: string | null;
  readonly originalKey: string | null;
  readonly notes: string | null;
}

export interface PdfDocumentResult extends PdfHeaderMetadata {
  readonly text: string;
}

export interface PdfPageText {
  readonly pageNumber: number;
  readonly text: string;
}

interface PdfLine {
  readonly y: number;
  readonly items: readonly PdfTextItem[];
  readonly text: string;
}

interface Gutter {
  readonly center: number;
}

interface PageLayout {
  readonly lines: readonly PdfLine[];
  readonly gutter: Gutter | null;
}

function itemX(item: PdfTextItem): number {
  return item.transform[4] ?? 0;
}

function itemY(item: PdfTextItem): number {
  return item.transform[5] ?? 0;
}

function itemWidth(item: PdfTextItem): number {
  return item.width ?? Math.max(item.str.length, 1) * 6;
}

function itemCenter(item: PdfTextItem): number {
  return itemX(item) + itemWidth(item) / 2;
}

function groupLines(items: readonly PdfTextItem[], yTolerance: number): PdfLine[] {
  const lines: { y: number; items: PdfTextItem[] }[] = [];
  for (const item of items) {
    if (!item.str.trim()) continue;
    const y = itemY(item);
    const line = lines.find((candidate) => Math.abs(candidate.y - y) <= yTolerance);
    if (line) line.items.push(item);
    else lines.push({ y, items: [item] });
  }

  return lines
    .sort((left, right) => right.y - left.y)
    .map((line) => ({
      y: line.y,
      items: line.items,
      text: lineText(line.items, Math.min(...line.items.map(itemX))),
    }));
}

function lineText(items: readonly PdfTextItem[], originX: number): string {
  const ordered = [...items].sort((left, right) => itemX(left) - itemX(right));
  let output = '';
  let previousEnd = originX;

  for (const item of ordered) {
    const x = itemX(item);
    const averageWidth = Math.max(4, itemWidth(item) / Math.max(item.str.length, 1));
    const gap = Math.max(0, Math.round((x - previousEnd) / averageWidth));
    output += ' '.repeat(Math.min(gap, 80)) + item.str;
    previousEnd = Math.max(x + itemWidth(item), x);
  }

  return output.trimEnd();
}

function lineLooksLikeBody(text: string): boolean {
  const trimmed = text.trim();
  if (
    !trimmed ||
    /^\s*(?:tom|composição|composicao|afinação|afinacao|artista)\s*:/iu.test(trimmed)
  ) {
    return false;
  }
  if (/^\s*\[[^\]]+\]/u.test(trimmed)) return true;

  const tokens = trimmed.split(/\s+/u).filter(Boolean);
  const chordPattern =
    /^[A-G](?:#|b)?(?:(?:m|min|maj|M|dim|aug|sus|add)|\d|º|°|\+|\(|\)|\/|#|b)*$/u;
  const chordTokens = tokens.filter((token) => chordPattern.test(token));
  const hasDetailedChord = chordTokens.some((token) => /[#bmds7-9()/º°]/u.test(token));
  return (
    hasDetailedChord ||
    (tokens.length > 0 && tokens.length <= 6 && chordTokens.length === tokens.length)
  );
}

function bodyStartIndex(lines: readonly PdfLine[]): number {
  return lines.findIndex((line) => lineLooksLikeBody(line.text));
}

function pageWidth(page: PdfPageInput): number {
  const maxRight = Math.max(0, ...page.items.map((item) => itemX(item) + itemWidth(item)));
  return Math.max(page.width, maxRight, 1);
}

function detectGutter(lines: readonly PdfLine[], width: number): Gutter | null {
  const start = bodyStartIndex(lines);
  if (start < 0) return null;
  const bodyLines = lines.slice(start);
  if (bodyLines.length < 2) return null;

  const bins = 100;
  const occupancy = Array.from({ length: bins }, () => 0);
  for (const line of bodyLines) {
    const occupied = new Set<number>();
    for (const item of line.items) {
      const first = Math.max(0, Math.floor((itemX(item) / width) * bins));
      const last = Math.min(bins - 1, Math.ceil(((itemX(item) + itemWidth(item)) / width) * bins));
      for (let index = first; index <= last; index += 1) occupied.add(index);
    }
    for (const index of occupied) occupancy[index] = (occupancy[index] ?? 0) + 1;
  }

  const minimumBins = Math.ceil(bins * 0.03);
  const maximumOccupied = bodyLines.length * 0.1;
  const candidates: { start: number; end: number }[] = [];
  let candidateStart: number | null = null;
  for (let index = Math.floor(bins * 0.3); index <= Math.ceil(bins * 0.7); index += 1) {
    const empty = (occupancy[index] ?? 0) <= maximumOccupied;
    if (empty && candidateStart === null) candidateStart = index;
    if ((!empty || index === Math.ceil(bins * 0.7)) && candidateStart !== null) {
      const end = empty && index === Math.ceil(bins * 0.7) ? index + 1 : index;
      if (end - candidateStart >= minimumBins) candidates.push({ start: candidateStart, end });
      candidateStart = null;
    }
  }

  const valid = candidates.filter((candidate) => {
    const center = ((candidate.start + candidate.end) / 2 / bins) * width;
    const leftLines = bodyLines.filter((line) =>
      line.items.some((item) => itemCenter(item) < center),
    );
    const rightLines = bodyLines.filter((line) =>
      line.items.some((item) => itemCenter(item) >= center),
    );
    const minimumSideLines = Math.max(2, Math.ceil(bodyLines.length * 0.1));
    return leftLines.length >= minimumSideLines && rightLines.length >= minimumSideLines;
  });
  const selected = valid.sort(
    (left, right) => right.end - right.start - (left.end - left.start),
  )[0];
  return selected ? { center: ((selected.start + selected.end) / 2 / bins) * width } : null;
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function renderColumn(lines: readonly PdfLine[], originX: number): string[] {
  if (lines.length === 0) return [];
  const gaps = lines.slice(1).map((line, index) => Math.abs((lines[index]?.y ?? line.y) - line.y));
  const typicalGap = median(gaps.filter((gap) => gap > 0));
  const output: string[] = [];
  for (const [index, line] of lines.entries()) {
    if (index > 0 && typicalGap > 0) {
      const previous = lines[index - 1];
      const gap = previous ? Math.abs(previous.y - line.y) : 0;
      if (gap > typicalGap * 1.6) {
        const blankLines = Math.min(3, Math.max(1, Math.round(gap / typicalGap) - 1));
        output.push(...Array.from({ length: blankLines }, () => ''));
      }
    }
    output.push(lineText(line.items, originX));
  }
  return output;
}

function layoutPage(page: PdfPageInput, yTolerance: number): PageLayout {
  const lines = groupLines(page.items, yTolerance);
  const gutter = detectGutter(lines, pageWidth(page));
  return { lines, gutter };
}

function normalizeRepeatText(value: string): string {
  return value.trim().replace(/\s+/gu, ' ').toLocaleLowerCase('pt-BR');
}

function isKnownHeaderFooter(value: string): boolean {
  const normalized = normalizeRepeatText(value);
  return (
    /cifra\s+club/iu.test(normalized) ||
    /^\d{1,3}$/u.test(normalized) ||
    /^p[aá]gina\s+\d+/iu.test(normalized)
  );
}

function repeatedHeaderFooterLines(layouts: readonly PageLayout[]): Set<string> {
  if (layouts.length < 2) return new Set();
  const counts = new Map<string, Set<number>>();
  for (const [pageIndex, layout] of layouts.entries()) {
    const start = bodyStartIndex(layout.lines);
    for (const [lineIndex, line] of layout.lines.entries()) {
      if (lineIndex >= start && !isKnownHeaderFooter(line.text)) continue;
      const key = normalizeRepeatText(line.text);
      if (!key) continue;
      const pages = counts.get(key) ?? new Set<number>();
      pages.add(pageIndex);
      counts.set(key, pages);
    }
  }
  return new Set(
    [...counts.entries()]
      .filter(([, pages]) => pages.size === layouts.length)
      .map(([text]) => text),
  );
}

function renderPage(layout: PageLayout, repeated: ReadonlySet<string>): string {
  const start = bodyStartIndex(layout.lines);
  const filteredLines = layout.lines.filter((line, index) => {
    if (!repeated.has(normalizeRepeatText(line.text))) return true;
    return index >= start && !isKnownHeaderFooter(line.text);
  });
  if (filteredLines.length === 0) return '';

  const effectivePage: PageLayout = { ...layout, lines: filteredLines };
  const pageItems = filteredLines.flatMap((line) => line.items);
  const gutter = effectivePage.gutter;
  if (!gutter) return renderColumn(filteredLines, Math.min(...pageItems.map(itemX))).join('\n');

  const left = filteredLines
    .map((line) => ({
      ...line,
      items: line.items.filter((item) => itemCenter(item) < gutter.center),
    }))
    .filter((line) => line.items.length > 0);
  const right = filteredLines
    .map((line) => ({
      ...line,
      items: line.items.filter((item) => itemCenter(item) >= gutter.center),
    }))
    .filter((line) => line.items.length > 0);
  const leftOrigin =
    left.length > 0 ? Math.min(...left.flatMap((line) => line.items.map(itemX))) : 0;
  const leftText = renderColumn(left, leftOrigin);
  const rightText = renderColumn(right, gutter.center);
  return [
    ...leftText,
    ...(leftText.length > 0 && rightText.length > 0 ? [''] : []),
    ...rightText,
  ].join('\n');
}

export function reconstructPdfPages(pages: readonly PdfPageInput[], yTolerance = 3): string {
  return reconstructPdfPageTexts(pages, yTolerance)
    .map((page) => page.text)
    .filter((page) => page.trim())
    .join('\n\n');
}

export function reconstructPdfPageTexts(
  pages: readonly PdfPageInput[],
  yTolerance = 3,
): PdfPageText[] {
  const layouts = pages.map((page) => layoutPage(page, yTolerance));
  const repeated = repeatedHeaderFooterLines(layouts);
  return layouts
    .map((layout, index) => ({ pageNumber: index + 1, text: renderPage(layout, repeated) }))
    .filter((page) => page.text.trim());
}

function derivePageWidth(items: readonly PdfTextItem[]): number {
  return Math.max(1, ...items.map((item) => itemX(item) + itemWidth(item)));
}

export function reconstructPdfText(items: readonly PdfTextItem[], yTolerance = 3): string {
  return reconstructPdfPages([{ width: derivePageWidth(items), items }], yTolerance);
}

function metadataLine(value: string): { label: string; content: string } | null {
  const match = /^\s*([^:]{1,40})\s*:\s*(.*?)\s*$/u.exec(value);
  if (!match) return null;
  return {
    label: (match[1] ?? '').trim().toLocaleLowerCase('pt-BR'),
    content: (match[2] ?? '').trim(),
  };
}

function shortHeaderLine(value: string): boolean {
  return value.trim().length > 0 && value.trim().length <= 100 && !value.includes(':');
}

export function extractPdfHeader(text: string): PdfHeaderMetadata {
  const lines = text.split('\n');
  const firstBody = lines.findIndex((line) => lineLooksLikeBody(line));
  const headerEnd = firstBody >= 0 ? firstBody : lines.length;
  const headerLines = lines.slice(0, headerEnd);
  const nonEmpty = headerLines.map((line) => line.trim()).filter(Boolean);
  const metadata = nonEmpty.map((line) => ({ line, parsed: metadataLine(line) }));
  const hasHeaderSignal =
    firstBody >= 2 ||
    metadata.some(
      ({ parsed }) =>
        parsed &&
        ['composição de', 'composicao de', 'tom', 'afinação', 'afinacao'].includes(parsed.label),
    );
  const title =
    hasHeaderSignal && shortHeaderLine(nonEmpty[0] ?? '') ? (nonEmpty[0] ?? null) : null;
  const artist =
    hasHeaderSignal && shortHeaderLine(nonEmpty[1] ?? '') ? (nonEmpty[1] ?? null) : null;
  const notes =
    metadata
      .filter(
        ({ parsed }) =>
          parsed &&
          ['composição de', 'composicao de', 'afinação', 'afinacao'].includes(parsed.label),
      )
      .map(({ line }) => line)
      .join('\n') || null;
  const key = metadata.find(({ parsed }) => parsed?.label === 'tom')?.parsed?.content ?? null;
  return { title, artist, originalKey: key, notes };
}

function stripPdfHeader(text: string, header: PdfHeaderMetadata): string {
  const lines = text.split('\n');
  let titleRemoved = false;
  let artistRemoved = false;
  const output = lines.filter((line) => {
    const trimmed = line.trim();
    const parsed = metadataLine(trimmed);
    if (
      parsed &&
      ['composição de', 'composicao de', 'afinação', 'afinacao'].includes(parsed.label)
    ) {
      return false;
    }
    if (!titleRemoved && header.title && trimmed === header.title) {
      titleRemoved = true;
      return false;
    }
    if (!artistRemoved && header.artist && trimmed === header.artist) {
      artistRemoved = true;
      return false;
    }
    return true;
  });
  return output.join('\n').replace(/^\s+|\s+$/gu, '');
}

export function reconstructPdfDocument(
  pages: readonly PdfPageInput[],
  yTolerance = 3,
): PdfDocumentResult {
  const reconstructed = reconstructPdfPages(pages, yTolerance);
  const header = extractPdfHeader(reconstructed);
  return { ...header, text: stripPdfHeader(reconstructed, header) };
}

export async function extractPdfDocument(file: Blob): Promise<PdfDocumentResult> {
  const pages = await extractPdfPageInputs(file);
  const reconstructed = reconstructPdfPages(pages);
  const header = extractPdfHeader(reconstructed);
  return { ...header, text: stripPdfHeader(reconstructed, header) };
}

export async function extractPdfPages(file: Blob): Promise<PdfPageText[]> {
  const pages = await extractPdfPageInputs(file);
  const result = reconstructPdfPageTexts(pages);
  if (!result.some((page) => page.text.trim())) {
    throw new Error('Este PDF parece ser uma imagem; não há texto para extrair.');
  }
  return result;
}

async function extractPdfPageInputs(file: Blob): Promise<PdfPageInput[]> {
  if (file.size > MAX_PDF_BYTES) throw new Error('O PDF excede o limite de 20 MB.');
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
  try {
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    const pdf = await loadingTask.promise;
    const pages: PdfPageInput[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const items: PdfTextItem[] = [];
      for (const item of content.items) {
        if ('str' in item && 'transform' in item) {
          items.push({
            str: item.str,
            transform: item.transform,
            ...('width' in item && typeof item.width === 'number' ? { width: item.width } : {}),
          });
        }
      }
      pages.push({ width: viewport.width, items });
    }
    return pages;
  } catch (cause: unknown) {
    throw new Error('Não foi possível ler este PDF. Ele pode estar protegido ou corrompido.', {
      cause,
    });
  }
}

export async function extractPdfText(file: Blob): Promise<string> {
  return (await extractPdfDocument(file)).text;
}
