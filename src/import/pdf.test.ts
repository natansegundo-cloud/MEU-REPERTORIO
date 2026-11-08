import { describe, expect, it } from 'vitest';

import { parseSongText } from '@/features/parser';

import { reconstructPdfDocument, reconstructPdfText, type PdfTextItem } from './pdf';

function item(str: string, x: number, y: number, width = Math.max(6, str.length * 6)): PdfTextItem {
  return { str, transform: [1, 0, 0, 1, x, y], width };
}

describe('reconstrução de texto PDF', () => {
  it('mantém uma página de uma coluna como antes', () => {
    const text = reconstructPdfText([
      item('C', 10, 100),
      item('Letra', 10, 80, 25),
      item('G', 55, 100),
    ]);

    expect(text).toBe('C       G\nLetra');
  });

  it('lê a coluna esquerda inteira antes da direita e mantém gaita na Intro', () => {
    const result = reconstructPdfDocument([
      {
        width: 595,
        items: [
          item('[Intro]', 40, 700, 36),
          item('C#m', 82, 700, 22),
          item('G#m7', 112, 700, 28),
          item('C#m', 148, 700, 22),
          item('G#m7', 178, 700, 28),
          item('gaita', 215, 700, 28),
          item('F#m7', 40, 680, 28),
          item('G#m7', 75, 680, 28),
          item('F#m7', 110, 680, 28),
          item('G#m7', 145, 680, 28),
          item('C#m', 330, 680, 22),
          item('G#m7', 360, 680, 28),
          item('F#m7', 396, 680, 28),
          item('B', 432, 680, 8),
          item('C#m', 40, 660, 22),
          item('G#m7', 70, 660, 28),
          item('C#m', 106, 660, 22),
          item('G#m7', 136, 660, 28),
          item('Pra me consolar', 330, 660, 80),
        ],
      },
    ]);

    const lines = result.text.split('\n');
    const introIndex = lines.findIndex((line) => line.includes('[Intro]'));
    const rightLyricIndex = lines.findIndex((line) => line.includes('Pra me consolar'));
    expect(introIndex).toBeGreaterThanOrEqual(0);
    expect(lines[introIndex]).toContain('gaita');
    expect(lines[introIndex]).not.toContain('Pra me consolar');
    expect(lines.findIndex((line) => line.includes('F#m7'))).toBeLessThan(rightLyricIndex);
    expect(result.text).toMatch(/C#m\s+G#m7\s+F#m7\s+B/u);
  });

  it('extrai título, artista, tom e observações do cabeçalho', () => {
    const result = reconstructPdfDocument([
      {
        width: 595,
        items: [
          item('Andei Só', 40, 820, 45),
          item('Natiruts', 40, 800, 48),
          item('Composição de: Um Bob, Alexandre Carlo', 40, 780, 210),
          item('Tom: C#m', 40, 760, 55),
          item('Afinação: padrão', 40, 740, 80),
          item('[Intro]', 40, 700, 36),
          item('C#m G#m7', 40, 680, 60),
          item('A força que afugenta as ideias', 40, 660, 150),
        ],
      },
    ]);

    expect(result.title).toBe('Andei Só');
    expect(result.artist).toBe('Natiruts');
    expect(result.originalKey).toBe('C#m');
    expect(result.notes).toContain('Composição de: Um Bob, Alexandre Carlo');
    expect(result.notes).toContain('Afinação: padrão');
    expect(result.text).not.toContain('Composição de:');
    expect(result.text).not.toContain('Afinação:');

    const parsed = parseSongText(result.text);
    expect(parsed.originalKey).toBe('C#m');
    expect(
      parsed.diagnostics.some(
        (diagnostic) =>
          diagnostic.message.includes('tokens com aparência musical') &&
          diagnostic.severity === 'warning',
      ),
    ).toBe(false);
  });
});
