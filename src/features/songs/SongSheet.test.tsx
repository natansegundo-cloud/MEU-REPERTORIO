import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { parseSongText } from '@/features/parser';

import { SongSheet } from './SongSheet';

describe('SongSheet', () => {
  it('não mostra vão em branco no início nem no fim da cifra', () => {
    const structure = parseSongText('Título\n\n\n[Intro]\nC G\nMinha letra\n\n\n');
    expect(structure.lines[0]?.kind).toBe('blank');
    const { container } = render(<SongSheet structure={structure} title="Teste" />);
    const main = container.querySelector('main');

    expect(main?.firstElementChild?.tagName).toBe('H2');
    expect(main?.firstElementChild?.textContent).toBe('Intro');
    expect(main?.lastElementChild?.textContent).toContain('Minha letra');
  });

  it('mantém a leitura estruturada e expõe acordes interativos sem perder a linha', () => {
    const onChordSelect = vi.fn();
    render(
      <SongSheet
        structure={parseSongText('C       G\nMinha letra')}
        title="Teste"
        onChordSelect={onChordSelect}
      />,
    );

    expect(screen.getByLabelText('Conteúdo de Teste')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver diagrama de C' })).toBeInTheDocument();
    expect(screen.getByText('Minha letra')).toBeInTheDocument();
    screen.getByRole('button', { name: 'Ver diagrama de C' }).click();
    expect(onChordSelect).toHaveBeenCalledWith('C');
  });
});
