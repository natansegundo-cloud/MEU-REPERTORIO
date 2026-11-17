import { render, screen, waitFor, within } from '@testing-library/react';
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

import { addSongsToRepertory, reorderRepertoryItem, updateRepertoryItemKey } from '@/services';
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
  it('mantém a lista da biblioteca fora da tela até pedir para adicionar', async () => {
    const user = userEvent.setup();
    vi.mocked(useRepertoryDetail).mockReturnValue({
      data: detailWith([]),
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    renderEditor();

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Adicionar músicas' }));

    expect(screen.getByRole('dialog', { name: 'Adicionar músicas' })).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
  });

  it('não oferece músicas que já estão no repertório', async () => {
    const user = userEvent.setup();
    vi.mocked(useRepertoryDetail).mockReturnValue({
      data: detailWith([{ song: songA, position: 1000 }]),
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    renderEditor();

    await user.click(screen.getByRole('button', { name: 'Adicionar músicas' }));
    const dialog = screen.getByRole('dialog', { name: 'Adicionar músicas' });

    expect(within(dialog).queryByRole('checkbox', { name: /Primeira/ })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('checkbox', { name: /Segunda/ })).toBeInTheDocument();
  });

  it('filtra as músicas do diálogo pela busca', async () => {
    const user = userEvent.setup();
    vi.mocked(useRepertoryDetail).mockReturnValue({
      data: detailWith([]),
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    vi.mocked(useSongs).mockImplementation((query) => ({
      data: query ? [songB] : [songA, songB],
      loading: false,
      error: null,
    }));
    renderEditor();

    await user.click(screen.getByRole('button', { name: 'Adicionar músicas' }));
    const dialog = screen.getByRole('dialog', { name: 'Adicionar músicas' });
    expect(within(dialog).getAllByRole('checkbox')).toHaveLength(2);

    await user.type(
      within(dialog).getByRole('textbox', { name: 'Pesquisar músicas para adicionar' }),
      'Segunda',
    );

    expect(within(dialog).getAllByRole('checkbox')).toHaveLength(1);
    expect(within(dialog).getByRole('checkbox', { name: /Segunda/ })).toBeInTheDocument();
  });

  it('distingue falha ao carregar a biblioteca de uma biblioteca vazia', async () => {
    const user = userEvent.setup();
    vi.mocked(useRepertoryDetail).mockReturnValue({
      data: detailWith([]),
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    vi.mocked(useSongs).mockReturnValue({
      data: [],
      loading: false,
      error: new Error('Falha ao ler a biblioteca.'),
    });
    renderEditor();

    await user.click(screen.getByRole('button', { name: 'Adicionar músicas' }));
    const dialog = screen.getByRole('dialog', { name: 'Adicionar músicas' });

    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'Não foi possível carregar as músicas da biblioteca.',
    );
    expect(within(dialog).queryByText(/biblioteca ainda está vazia/i)).not.toBeInTheDocument();
  });

  it('devolve o foco ao botão que abriu o diálogo', async () => {
    const user = userEvent.setup();
    vi.mocked(useRepertoryDetail).mockReturnValue({
      data: detailWith([]),
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    renderEditor();

    const trigger = screen.getByRole('button', { name: 'Adicionar músicas' });
    await user.click(trigger);
    expect(screen.getByRole('textbox', { name: 'Pesquisar músicas para adicionar' })).toHaveFocus();

    await user.keyboard('{Escape}');

    await waitFor(() => expect(trigger).toHaveFocus());
  });

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

    await user.click(screen.getByRole('button', { name: 'Adicionar músicas' }));
    const dialog = screen.getByRole('dialog', { name: 'Adicionar músicas' });
    await user.click(within(dialog).getByRole('checkbox', { name: /Primeira/ }));
    const add = within(dialog).getByRole('button', { name: /Adicionar/ });
    await user.click(add);
    expect(add).toBeDisabled();
    await user.click(add);
    expect(addSongsToRepertory).toHaveBeenCalledTimes(1);

    finishAdd?.();
    await waitFor(() =>
      expect(screen.getByText('Músicas adicionadas ao repertório.')).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Adicionar músicas' })).toHaveFocus(),
    );
  });

  it('não fecha o diálogo enquanto a gravação está pendente', async () => {
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

    await user.click(screen.getByRole('button', { name: 'Adicionar músicas' }));
    const dialog = screen.getByRole('dialog', { name: 'Adicionar músicas' });
    await user.click(within(dialog).getByRole('checkbox', { name: /Primeira/ }));
    await user.click(within(dialog).getByRole('button', { name: /Adicionar/ }));

    expect(within(dialog).getByRole('button', { name: 'Fechar' })).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog', { name: 'Adicionar músicas' })).toBeInTheDocument();

    const pendingCheckbox = within(dialog).getByRole('checkbox', { name: /Primeira/ });
    expect(pendingCheckbox).toBeDisabled();
    expect(dialog).toHaveFocus();
    expect(within(dialog).getByRole('status')).toHaveTextContent('1 selecionada');
    expect(within(dialog).getByRole('button', { name: 'Adicionando…' })).toBeDisabled();

    finishAdd?.();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('mantém o erro de adição no diálogo e preserva a seleção para nova tentativa', async () => {
    const user = userEvent.setup();
    vi.mocked(useRepertoryDetail).mockReturnValue({
      data: detailWith([]),
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    vi.mocked(addSongsToRepertory).mockRejectedValueOnce(new Error('Falha ao adicionar.'));
    renderEditor();

    const trigger = screen.getByRole('button', { name: 'Adicionar músicas' });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Adicionar músicas' });
    const checkbox = within(dialog).getByRole('checkbox', { name: /Primeira/ });
    await user.click(checkbox);
    await user.click(within(dialog).getByRole('button', { name: /Adicionar/ }));

    const alert = await within(dialog).findByRole('alert');
    expect(alert).toHaveTextContent('Falha ao adicionar.');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(checkbox).toBeChecked();
    expect(checkbox).toBeEnabled();

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('fecha o diálogo e oferece atualizar a versão quando a adição conflita', async () => {
    const user = userEvent.setup();
    vi.mocked(useRepertoryDetail).mockReturnValue({
      data: detailWith([]),
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    const conflict = new Error(
      'O repertório foi alterado em outro lugar. Recarregue antes de salvar novamente.',
    );
    conflict.name = 'RepertoryRevisionConflictError';
    vi.mocked(addSongsToRepertory).mockRejectedValueOnce(conflict);
    renderEditor();

    await user.click(screen.getByRole('button', { name: 'Adicionar músicas' }));
    const dialog = screen.getByRole('dialog', { name: 'Adicionar músicas' });
    await user.click(within(dialog).getByRole('checkbox', { name: /Primeira/ }));
    await user.click(within(dialog).getByRole('button', { name: /Adicionar/ }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('alterado em outro dispositivo ou aba');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Atualizar versão' })).toBeInTheDocument();
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
    const add = screen.getByRole('button', { name: 'Adicionar músicas' });
    await user.click(down);
    expect(down).toBeDisabled();
    expect(add).toBeDisabled();
    await user.click(down);
    expect(reorderRepertoryItem).toHaveBeenCalledTimes(1);

    finishMove?.();
    await waitFor(() => expect(down).toBeEnabled());
    expect(add).toBeEnabled();
  });

  it('identifica o campo de tom próprio pela música correspondente', async () => {
    const user = userEvent.setup();
    vi.mocked(useRepertoryDetail).mockReturnValue({
      data: detailWith([{ song: songA, position: 1000 }]),
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    renderEditor();

    await user.click(screen.getByRole('button', { name: /Editar tom próprio de Primeira/ }));

    expect(screen.getByRole('textbox', { name: 'Tom próprio de Primeira' })).toBeInTheDocument();
  });

  it('salva o tom próprio e fecha o editor', async () => {
    const user = userEvent.setup();
    vi.mocked(useRepertoryDetail).mockReturnValue({
      data: detailWith([{ song: songA, position: 1000 }]),
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    vi.mocked(updateRepertoryItemKey).mockResolvedValueOnce(undefined);
    renderEditor();

    await user.click(screen.getByRole('button', { name: /Editar tom próprio de Primeira/ }));
    const input = screen.getByRole('textbox', { name: 'Tom próprio de Primeira' });
    await user.type(input, 'E');
    await user.keyboard('{Enter}');

    await waitFor(() => expect(updateRepertoryItemKey).toHaveBeenCalledWith('item-song-a', 'E'));
    await waitFor(() =>
      expect(
        screen.queryByRole('textbox', { name: 'Tom próprio de Primeira' }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByText('Tom próprio atualizado.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Editar tom próprio de Primeira/ })).toHaveFocus();
  });

  it('cancela a edição do tom com Escape sem gravar', async () => {
    const user = userEvent.setup();
    vi.mocked(useRepertoryDetail).mockReturnValue({
      data: detailWith([{ song: songA, position: 1000 }]),
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    renderEditor();

    await user.click(screen.getByRole('button', { name: /Editar tom próprio de Primeira/ }));
    await user.type(screen.getByRole('textbox', { name: 'Tom próprio de Primeira' }), 'E');
    await user.keyboard('{Escape}');

    expect(
      screen.queryByRole('textbox', { name: 'Tom próprio de Primeira' }),
    ).not.toBeInTheDocument();
    expect(updateRepertoryItemKey).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Editar tom próprio de Primeira/ })).toHaveFocus();
  });

  it('não grava o tom quando o valor não mudou', async () => {
    const user = userEvent.setup();
    vi.mocked(useRepertoryDetail).mockReturnValue({
      data: detailWith([{ song: songA, position: 1000 }]),
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    renderEditor();

    await user.click(screen.getByRole('button', { name: /Editar tom próprio de Primeira/ }));
    await user.keyboard('{Enter}');

    await waitFor(() =>
      expect(
        screen.queryByRole('textbox', { name: 'Tom próprio de Primeira' }),
      ).not.toBeInTheDocument(),
    );
    expect(updateRepertoryItemKey).not.toHaveBeenCalled();
  });

  it('mantém o valor digitado quando o tom próprio é rejeitado', async () => {
    const user = userEvent.setup();
    vi.mocked(useRepertoryDetail).mockReturnValue({
      data: detailWith([{ song: songA, position: 1000 }]),
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    vi.mocked(updateRepertoryItemKey).mockRejectedValueOnce(
      new Error('O tom próprio não foi reconhecido.'),
    );
    renderEditor();

    await user.click(screen.getByRole('button', { name: /Editar tom próprio de Primeira/ }));
    const input = screen.getByRole('textbox', { name: 'Tom próprio de Primeira' });
    await user.type(input, 'H');
    await user.keyboard('{Enter}');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('O tom próprio não foi reconhecido.');
    expect(screen.getByRole('textbox', { name: 'Tom próprio de Primeira' })).toHaveValue('H');
    expect(screen.getByRole('textbox', { name: 'Tom próprio de Primeira' })).toHaveFocus();
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
