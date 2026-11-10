import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { LibraryActionMenu } from './LibraryActionMenu';

function renderMenu() {
  const actions = {
    onAddSong: vi.fn(),
    onImportBatch: vi.fn(),
    onCreateRepertory: vi.fn(),
  };

  render(<LibraryActionMenu {...actions} />);
  return actions;
}

describe('LibraryActionMenu', () => {
  it('abre, fecha ao clicar fora e reabre as ações', async () => {
    const user = userEvent.setup();
    renderMenu();

    const trigger = screen.getByRole('button', { name: 'Adicionar conteúdo' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeVisible();
    expect(screen.getByRole('menuitem', { name: 'Adicionar música' })).toHaveFocus();

    await user.click(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Adicionar conteúdo' }));
    expect(screen.getByRole('menu')).toBeVisible();
  });

  it('fecha com Escape e devolve o foco ao acionador', async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole('button', { name: 'Adicionar conteúdo' }));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adicionar conteúdo' })).toHaveFocus();
  });

  it('encaminha cada ação para o fluxo existente e fecha o menu', async () => {
    const user = userEvent.setup();
    const actions = renderMenu();

    await user.click(screen.getByRole('button', { name: 'Adicionar conteúdo' }));
    await user.click(screen.getByRole('menuitem', { name: 'Adicionar música' }));
    expect(actions.onAddSong).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Adicionar conteúdo' }));
    await user.click(screen.getByRole('menuitem', { name: 'Importar em lote' }));
    expect(actions.onImportBatch).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: 'Adicionar conteúdo' }));
    await user.click(screen.getByRole('menuitem', { name: 'Criar repertório' }));
    expect(actions.onCreateRepertory).toHaveBeenCalledOnce();
  });
});
