import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { parseSongText } from '@/features/parser';
import type { RepertoryDetail } from '@/services';
import type { Repertory, RepertoryItem, Song } from '@/types';

vi.mock('@/services', () => ({
  addSongsToRepertory: vi.fn(),
  removeRepertoryItem: vi.fn(),
  renameRepertory: vi.fn(),
  reorderRepertoryItem: vi.fn(),
  updateRepertoryItemKey: vi.fn(),
}));

vi.mock('./useRepertories', () => ({ useRepertoryDetail: vi.fn() }));
vi.mock('@/features/library/useSongs', () => ({ useSongs: vi.fn() }));

import { addSongsToRepertory, reorderRepertoryItem } from '@/services';
import { useSongs } from '@/features/library/useSongs';

import { RepertoryEditorPage } from './RepertoryEditorPage';
import { useRepertoryDetail } from './useRepertories';

const timestamp = '2026-11-08T12:00:00.000Z';

function makeSong(id: string, title: string): Song {
  return {
    id,
    title,
    artist: null,
    originalKey: 'C',
    currentKey: 'C',
    preferredKey: null,
    capo: null,
    tuning: null,
    rhythm: null,
    strumming: null,
    difficulty: null,
    content: 'Tom: C\nC G\nLetra',
    structure: parseSongText('Tom: C\nC G\nLetra'),
    notes: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    revision: 1,
    syncPending: false,
  };
}

const repertory: Repertory = {
  id: 'repertory-1',
  name: 'Show de sábado',
  description: null,
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt: null,
  revision: 1,
  syncPending: false,
  syncError: null,
};

function makeItem(id: string, songId: string, position: number): RepertoryItem {
  return {
    id,
    repertoryId: repertory.id,
    songId,
    position,
    preferredKey: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    revision: 1,
    syncPending: false,
    syncError: null,
  };
}

const songA = makeSong('song-a', 'Primeira');
const songB = makeSong('song-b', 'Segunda');

function detailWith(items: readonly { song: Song; position: number }[]): RepertoryDetail {
  return {
    repertory,
    items: items.map(({ song, position }) => ({
      item: makeItem(`item-${song.id}`, song.id, position),
      song,
    })),
  };
}

function renderEditor() {
  return render(
    <RepertoryEditorPage repertoryId={repertory.id} onBack={vi.fn()} onOpenShow={vi.fn()} />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useSongs).mockReturnValue({ data: [songA, songB], loading: false, error: null });
});

describe('RepertoryEditorPage', () => {
  it('impede adicionar as mesmas músicas duas vezes enquanto a gravação está pendente', async () => {
    const user = userEvent.setup();
    let finishAdd: (() => void) | undefined;
    vi.mocked(useRepertoryDetail).mockReturnValue({
      data: detailWith([]),
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    vi.mocked(addSongsToRepertory).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishAdd = () => resolve({ ...repertory, revision: 2 });
        }),
    );
    renderEditor();

    await user.click(screen.getByRole('checkbox', { name: /Primeira/ }));
    const add = screen.getByRole('button', { name: /Adicionar/ });
    await user.click(add);
    expect(add).toBeDisabled();
    await user.click(add);
    expect(addSongsToRepertory).toHaveBeenCalledTimes(1);

    finishAdd?.();
    await waitFor(() =>
      expect(screen.getByText('Músicas adicionadas ao repertório.')).toBeInTheDocument(),
    );
  });

  it('impede reordenar duas vezes enquanto a primeira alteração está pendente', async () => {
    const user = userEvent.setup();
    let finishMove: (() => void) | undefined;
    vi.mocked(useRepertoryDetail).mockReturnValue({
      data: detailWith([
        { song: songA, position: 1000 },
        { song: songB, position: 2000 },
      ]),
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    vi.mocked(reorderRepertoryItem).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishMove = () => resolve(repertory);
        }),
    );
    renderEditor();

    const down = screen.getByRole('button', { name: 'Descer Primeira' });
    await user.click(down);
    expect(down).toBeDisabled();
    await user.click(down);
    expect(reorderRepertoryItem).toHaveBeenCalledTimes(1);

    finishMove?.();
    await waitFor(() => expect(down).toBeEnabled());
  });

  it('identifica o campo de tom próprio pela música correspondente', () => {
    vi.mocked(useRepertoryDetail).mockReturnValue({
      data: detailWith([{ song: songA, position: 1000 }]),
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    renderEditor();

    expect(screen.getByRole('textbox', { name: 'Tom próprio de Primeira' })).toBeInTheDocument();
  });

  it('devolve o foco ao botão Renomear ao cancelar a edição do título', async () => {
    const user = userEvent.setup();
    vi.mocked(useRepertoryDetail).mockReturnValue({
      data: detailWith([{ song: songA, position: 1000 }]),
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    renderEditor();

    await user.click(screen.getByRole('button', { name: 'Renomear' }));
    expect(screen.getByDisplayValue(repertory.name)).toHaveFocus();

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.getByRole('button', { name: 'Renomear' })).toHaveFocus());
  });

  it('explica o conflito de versão e oferece atualização real da versão', async () => {
    const user = userEvent.setup();
    const refresh = vi.fn();
    vi.mocked(useRepertoryDetail).mockReturnValue({
      data: detailWith([
        { song: songA, position: 1000 },
        { song: songB, position: 2000 },
      ]),
      loading: false,
      error: null,
      refresh,
    });
    const conflict = new Error(
      'O repertório foi alterado em outro lugar. Recarregue antes de salvar novamente.',
    );
    conflict.name = 'RepertoryRevisionConflictError';
    vi.mocked(reorderRepertoryItem).mockRejectedValueOnce(conflict);
    renderEditor();

    await user.click(screen.getByRole('button', { name: 'Descer Primeira' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('alterado em outro dispositivo ou aba');
    expect(alert).not.toHaveTextContent('Recarregue antes de salvar novamente');

    await user.click(screen.getByRole('button', { name: 'Atualizar versão' }));

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
