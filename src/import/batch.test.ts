import { describe, expect, it, vi } from 'vitest';

vi.mock('mammoth', () => ({
  default: {
    extractRawText: vi.fn(() => ({
      value: 'Música DOCX\nC G\nLetra',
      messages: [{ message: 'Uma caixa de texto foi simplificada.' }],
    })),
  },
}));

import { extractBatchDocument, segmentBatchDocument, type BatchDocument } from './batch';

function document(text: string, pages?: readonly string[]): BatchDocument {
  const sourcePages = pages ?? [text];
  return {
    kind: 'docx',
    fileName: 'teste.docx',
    pages: sourcePages.map((page, index) => ({ pageNumber: index + 1, text: page })),
    text: sourcePages.join('\n\n'),
    extractionWarnings: [],
  };
}

describe('segmentação de importação em lote', () => {
  it('extrai DOCX local e preserva avisos do conversor', async () => {
    const result = await extractBatchDocument(
      new File(['conteúdo simulado'], 'repertorio.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    );

    expect(result.kind).toBe('docx');
    expect(result.text).toContain('Música DOCX');
    expect(result.extractionWarnings).toEqual(['Uma caixa de texto foi simplificada.']);
  });

  it('prioriza separadores de hífen, igualdade e cerquilha', () => {
    const result = segmentBatchDocument(
      document(
        'Primeira\nC G\nLetra\n-------------------------\nSegunda\nAm F\nOutra letra\n====================\nTerceira\nD A\nFinal',
      ),
    );

    expect(result.usedExplicitSeparators).toBe(true);
    expect(result.segments).toHaveLength(3);
    expect(result.segments.map((segment) => segment.title)).toEqual([
      'Primeira',
      'Segunda',
      'Terceira',
    ]);
    expect(result.segments.map((segment) => segment.content)).not.toContain(
      expect.stringContaining('---------'),
    );
    expect(result.warnings).toContain(
      'Foram encontrados separadores de tipos diferentes. Revise os blocos.',
    );
  });

  it('não separa linhas curtas e avisa sobre bloco vazio', () => {
    const result = segmentBatchDocument(
      document(
        'Primeira\nC\nLetra\n----\n####################\n\n====================\nSegunda\nG\nLetra',
      ),
    );

    expect(result.segments).toHaveLength(2);
    expect(result.segments[0]?.content).not.toContain('----');
    expect(result.warnings.some((warning) => warning.includes('Bloco vazio'))).toBe(true);
  });

  it('mantém uma música que atravessa páginas no mesmo bloco', () => {
    const result = segmentBatchDocument(
      document('', [
        'Primeira\nC\nParte 1',
        'Parte 2\nG\nFinal\n----------------',
        'Segunda\nAm\nFim',
      ]),
    );

    expect(result.segments).toHaveLength(2);
    expect(result.segments[0]?.pageNumbers).toEqual([1, 2]);
    expect(result.segments[0]?.content).toContain('Parte 2');
    expect(result.segments[0]?.content).not.toContain('----------------');
  });

  it('usa divisão estrutural com aviso quando não há separadores', () => {
    const result = segmentBatchDocument(
      document('Primeira\nArtista 1\nC G\nLetra\n\nSegunda\nArtista 2\nAm F\nOutra letra'),
    );

    expect(result.usedExplicitSeparators).toBe(false);
    expect(result.segments).toHaveLength(2);
    expect(result.warnings[0]).toContain('divisão foi inferida');
    expect(result.segments.every((segment) => segment.warnings.length > 0)).toBe(true);
  });
});
