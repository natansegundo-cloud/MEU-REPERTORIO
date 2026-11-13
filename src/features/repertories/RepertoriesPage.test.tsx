import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RepertorySummary } from '@/services';

vi.mock('@/services', () => ({
  createRepertory: vi.fn(),
  duplicateRepertory: vi.fn(),
  renameRepertory: vi.fn(),
  softDeleteRepertory: vi.fn(),
}));

vi.mock('./useRepertories', () => ({ useRepertories: vi.fn() }));

import { createRepertory, duplicateRepertory, renameRepertory } from '@/services';

import { RepertoriesPage } from './RepertoriesPage';
import { useRepertories } from './useRepertories';

const repertory: RepertorySummary = {
  id: 'repertory-1',
  name: 'Show de sábado',
  description: null,
  createdAt: '2026-11-08T12:00:00.000Z',
  updatedAt: '2026-11-08T12:00:00.000Z',
  deletedAt: null,
  revision: 1,
  syncPending: false,
  syncError: null,
  songCount: 0,
};

function renderPage() {
  return render(
    <RepertoriesPage onOpenSongs={vi.fn()} onOpenRepertory={vi.fn()} onOpenShow={vi.fn()} />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useRepertories).mockReturnValue({ data: [], loading: false, error: null });
});

describe('RepertoriesPage', () => {
  it('impede criar o mesmo repertório duas vezes enquanto a criação está pendente', async () => {
    const user = userEvent.setup();
    let finishCreate: (() => void) | undefined;
    vi.mocked(createRepertory).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishCreate = () => resolve(repertory);
        }),
    );
    renderPage();

    await user.type(screen.getByLabelText('Novo repertório'), 'Show de sábado');
    const create = screen.getByRole('button', { name: 'Criar repertório' });
    await user.click(create);
    expect(create).toBeDisabled();
    expect(create).toHaveTextContent('Criando…');

    await user.click(create);
    expect(createRepertory).toHaveBeenCalledTimes(1);

    finishCreate?.();
    await waitFor(() => expect(screen.getByText('“Show de sábado” criado.')).toBeInTheDocument());
    expect(create).toBeDisabled();
  });

  it('impede duplicar o mesmo repertório duas vezes', async () => {
    const user = userEvent.setup();
    let finishDuplicate: (() => void) | undefined;
    vi.mocked(useRepertories).mockReturnValue({ data: [repertory], loading: false, error: null });
    vi.mocked(duplicateRepertory).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishDuplicate = () => resolve({ ...repertory, id: 'repertory-2', name: 'Cópia' });
        }),
    );
    renderPage();

    const duplicate = screen.getByRole('button', { name: `Duplicar ${repertory.name}` });
    await user.click(duplicate);
    expect(duplicate).toBeDisabled();
    await user.click(duplicate);
    expect(duplicateRepertory).toHaveBeenCalledTimes(1);

    finishDuplicate?.();
    await waitFor(() => expect(screen.getByText('“Cópia” duplicado.')).toBeInTheDocument());
  });

  it('confirma a renomeação com Enter e cancela com Escape', async () => {
    const user = userEvent.setup();
    vi.mocked(useRepertories).mockReturnValue({ data: [repertory], loading: false, error: null });
    vi.mocked(renameRepertory).mockResolvedValue({ ...repertory, name: 'Novo nome', revision: 2 });
    renderPage();

    await user.click(screen.getByRole('button', { name: `Renomear ${repertory.name}` }));
    const input = screen.getByLabelText(`Novo nome de ${repertory.name}`);
    await user.clear(input);
    await user.type(input, 'Novo nome{Enter}');

    expect(renameRepertory).toHaveBeenCalledWith(repertory.id, 'Novo nome', repertory.revision);
    await waitFor(() =>
      expect(screen.getByText('Nome do repertório atualizado.')).toBeInTheDocument(),
    );
  });

  it('devolve o foco ao botão de renomear ao cancelar com Escape', async () => {
    const user = userEvent.setup();
    vi.mocked(useRepertories).mockReturnValue({ data: [repertory], loading: false, error: null });
    renderPage();

    await user.click(screen.getByRole('button', { name: `Renomear ${repertory.name}` }));
    expect(screen.getByLabelText(`Novo nome de ${repertory.name}`)).toHaveFocus();

    await user.keyboard('{Escape}');

    await waitFor(() =>
      expect(screen.getByRole('button', { name: `Renomear ${repertory.name}` })).toHaveFocus(),
    );
  });
});
