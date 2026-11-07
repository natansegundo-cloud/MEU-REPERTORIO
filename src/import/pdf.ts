export const MAX_PDF_BYTES = 20 * 1024 * 1024;

export interface PdfTextItem {
  readonly str: string;
  readonly transform: readonly number[];
  readonly width?: number;
}

interface PdfLine {
  y: number;
  items: PdfTextItem[];
}

function itemX(item: PdfTextItem): number {
  return item.transform[4] ?? 0;
}

function itemY(item: PdfTextItem): number {
  return item.transform[5] ?? 0;
}

function lineText(items: readonly PdfTextItem[]): string {
  const ordered = [...items].sort((left, right) => itemX(left) - itemX(right));
  let output = '';
  let previousEnd = 0;
  for (const [index, item] of ordered.entries()) {
    const x = itemX(item);
    const averageWidth = Math.max(
      4,
      (item.width ?? Math.max(item.str.length, 1) * 6) / Math.max(item.str.length, 1),
    );
    const gap = index === 0 ? 0 : Math.max(0, Math.round((x - previousEnd) / averageWidth));
    output += ' '.repeat(Math.min(gap, 80)) + item.str;
    previousEnd = Math.max(x + (item.width ?? item.str.length * averageWidth), x);
  }
  return output.trimEnd();
}

export function reconstructPdfText(items: readonly PdfTextItem[], yTolerance = 3): string {
  const lines: PdfLine[] = [];
  for (const item of items) {
    if (!item.str) continue;
    const y = itemY(item);
    const line = lines.find((candidate) => Math.abs(candidate.y - y) <= yTolerance);
    if (line) line.items.push(item);
    else lines.push({ y, items: [item] });
  }
  return lines
    .sort((left, right) => right.y - left.y)
    .map((line) => lineText(line.items))
    .join('\n');
}

export async function extractPdfText(file: Blob): Promise<string> {
  if (file.size > MAX_PDF_BYTES) throw new Error('O PDF excede o limite de 20 MB.');
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
  try {
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    const pdf = await loadingTask.promise;
    const lines: PdfTextItem[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      for (const item of content.items) {
        if ('str' in item && 'transform' in item) {
          const textItem: PdfTextItem = {
            str: item.str,
            transform: item.transform,
            ...('width' in item && typeof item.width === 'number' ? { width: item.width } : {}),
          };
          lines.push(textItem);
        }
      }
    }
    const text = reconstructPdfText(lines);
    if (!text.trim()) throw new Error('Este PDF parece ser uma imagem; não há texto para extrair.');
    return text;
  } catch (cause: unknown) {
    if (cause instanceof Error && cause.message.includes('parece ser uma imagem')) throw cause;
    throw new Error('Não foi possível ler este PDF. Ele pode estar protegido ou corrompido.', {
      cause,
    });
  }
}
