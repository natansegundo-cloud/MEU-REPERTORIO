import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { getChordVoicings, type ChordVoicing } from '@/features/transpose';

import { ChordDiagramGraphic } from './ChordDiagramGraphic';

function renderGraphic(voicing: ChordVoicing): SVGSVGElement {
  const { container } = render(<ChordDiagramGraphic voicing={voicing} />);
  const svg = container.querySelector('svg');
  if (!svg) throw new Error('Diagrama não renderizado');
  return svg;
}

function highestFret(voicing: ChordVoicing): number {
  return voicing.frets.reduce((highest, fret) => Math.max(highest, fret), 0);
}

function positionLabel(svg: SVGSVGElement, text: string): SVGTextElement {
  const label = [...svg.querySelectorAll('text')].find((node) => node.textContent === text);
  if (!label) throw new Error(`Rótulo ${text} não encontrado`);
  return label;
}

describe('ChordDiagramGraphic', () => {
  it('desenha sempre cinco casas e seis cordas', () => {
    const svg = renderGraphic(getChordVoicings('C')[0]!);

    expect(svg).toHaveAttribute('data-fret-count', '5');
    expect(svg.querySelectorAll('line[class*="fret"]')).toHaveLength(6);
    expect(svg.querySelectorAll('line[class*="string"]')).toHaveLength(6);
  });

  it('mostra o início do braço em acordes abertos', () => {
    const svg = renderGraphic(getChordVoicings('C')[0]!);

    expect(svg).toHaveAttribute('data-base-fret', '1');
    expect(svg.querySelector('line[class*="nut"]')).not.toBeNull();
    expect(screen.queryByText(/^Casa /)).not.toBeInTheDocument();
    expect(svg.querySelectorAll('circle[class*="open"]')).toHaveLength(2);
    expect(screen.getAllByText('×')).toHaveLength(1);
  });

  it('centraliza o braço quando não há rótulo lateral', () => {
    const svg = renderGraphic(getChordVoicings('C')[0]!);
    const strings = [...svg.querySelectorAll('line[class*="string"]')];
    const viewBoxWidth = Number(svg.getAttribute('viewBox')?.split(' ')[2]);
    const left = Number(strings[0]?.getAttribute('x1'));
    const right = Number(strings.at(-1)?.getAttribute('x1'));

    expect(left).toBe(30);
    expect(viewBoxWidth - right).toBe(30);
  });

  it('mantém a pestana na primeira casa junto da pestana fixa', () => {
    const svg = renderGraphic(getChordVoicings('F')[0]!);

    expect(svg).toHaveAttribute('data-base-fret', '1');
    expect(svg.querySelector('line[class*="nut"]')).not.toBeNull();
    expect(svg.querySelector('line[class*="barre"]')).not.toBeNull();
  });

  it('usa as cinco casas iniciais quando o acorde cabe nelas', () => {
    const gm7 = getChordVoicings('Gm7')[0]!;
    expect(highestFret(gm7)).toBe(5);

    const svg = renderGraphic(gm7);

    expect(svg).toHaveAttribute('data-base-fret', '1');
    expect(svg.querySelector('line[class*="nut"]')).not.toBeNull();
    expect(svg.querySelector('line[class*="barre"]')).not.toBeNull();
    expect(screen.queryByText(/^Casa /)).not.toBeInTheDocument();
  });

  it('desloca a janela e indica a casa inicial quando passa da quinta casa', () => {
    const cSharp = getChordVoicings('C#')[0]!;
    expect(highestFret(cSharp)).toBeGreaterThan(5);

    const svg = renderGraphic(cSharp);

    expect(svg).toHaveAttribute('data-base-fret', String(cSharp.baseFret));
    expect(screen.getByText(`Casa ${cSharp.baseFret}`)).toBeInTheDocument();
    expect(svg.querySelector('line[class*="nut"]')).toBeNull();
    expect(svg.querySelector('line[class*="barre"]')).not.toBeNull();
  });

  it('representa pestana móvel em posição superior dentro de cinco casas', () => {
    const voicing = getChordVoicings('C#').find((candidate) => candidate.baseFret >= 6);
    expect(voicing).toBeDefined();

    const svg = renderGraphic(voicing!);
    const baseFret = Number(svg.getAttribute('data-base-fret'));

    expect(baseFret).toBe(voicing!.baseFret);
    expect(screen.getByText(`Casa ${baseFret}`)).toBeInTheDocument();
    expect(svg.querySelector('line[class*="nut"]')).toBeNull();
    expect(svg.querySelector('line[class*="barre"]')).not.toBeNull();

    const fingers = [...svg.querySelectorAll('circle[class*="finger"]')];
    expect(fingers.length).toBeGreaterThan(0);
    fingers.forEach((finger) => {
      const y = Number(finger.getAttribute('cy'));
      expect(y).toBeGreaterThan(28);
      expect(y).toBeLessThan(28 + 5 * 18);
    });
  });

  it('mantém rótulos de casa 6, 7, 10 e 12 afastados do braço', () => {
    const cases = [
      {
        voicing: getChordVoicings('C#').find((candidate) => candidate.baseFret === 6),
        label: 'Casa 6',
      },
      {
        voicing: getChordVoicings('C7M').find((candidate) => candidate.baseFret === 7),
        label: 'Casa 7',
      },
      {
        voicing: getChordVoicings('Gm7').find((candidate) => candidate.baseFret === 10),
        label: 'Casa 10',
      },
      {
        voicing: getChordVoicings('C', { maxFret: 15 }).find(
          (candidate) => candidate.baseFret === 12,
        ),
        label: 'Casa 12',
      },
    ];

    for (const item of cases) {
      expect(item.voicing, item.label).toBeDefined();

      const svg = renderGraphic(item.voicing!);
      const label = positionLabel(svg, item.label);
      const firstString = svg.querySelector('line[class*="string"]');
      const labelX = Number(label.getAttribute('x'));
      const stringX = Number(firstString?.getAttribute('x1'));

      expect(label).toHaveAttribute('text-anchor', 'end');
      expect(stringX - labelX).toBe(4);
      expect(labelX).toBeGreaterThan(0);
    }
  });

  it('mantém todas as casas geradas dentro da janela visível', () => {
    for (const symbol of ['C', 'F', 'Gm7', 'C#', 'C#m7', 'E7(9)']) {
      for (const voicing of getChordVoicings(symbol)) {
        const svg = renderGraphic(voicing);
        const baseFret = Number(svg.getAttribute('data-base-fret'));
        const expectedBase = highestFret(voicing) > 5 ? voicing.baseFret : 1;

        expect(baseFret, `${symbol} ${voicing.frets.join(',')}`).toBe(expectedBase);
        expect(highestFret(voicing)).toBeLessThanOrEqual(baseFret + 4);
      }
    }
  });
});
