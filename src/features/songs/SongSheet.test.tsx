import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { parseSongText } from '@/features/parser';

import { SongSheet } from './SongSheet';

describe('SongSheet', () => {
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
