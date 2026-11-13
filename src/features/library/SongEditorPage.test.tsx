import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { parseSongText } from '@/features/parser';
import type { Song } from '@/types';

vi.mock('@/services', () => ({
  updateSong: vi.fn(),
  SongRevisionConflictError: class SongRevisionConflictError extends Error {},
}));

vi.mock('./useSongs', () => ({ useSong: vi.fn() }));

import { updateSong } from '@/services';

import { SongEditorPage } from './SongEditorPage';
import { useSong } from './useSongs';

const song: Song = {
  id: 'song-1',
  title: 'Canção de teste',
  artist: 'Artista',
  originalKey: 'C',
  currentKey: 'C',
  preferredKey: null,
  capo: null,
  tuning: null,
  rhythm: null,
  strumming: null,
  difficulty: null,
  content: 'Tom: C\nC     G\nLetra',
  structure: parseSongText('Tom: C\nC     G\nLetra'),
  notes: null,
  createdAt: '2026-11-08T12:00:00.000Z',
  updatedAt: '2026-11-08T12:00:00.000Z',
  deletedAt: null,
  revision: 1,
  syncPending: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useSong).mockReturnValue({ data: song, loading: false, error: null });
});

describe('SongEditorPage', () => {
  it('impede salvar duas vezes enquanto a primeira gravação está pendente', async () => {
    const user = userEvent.setup();
    let finishSave: (() => void) | undefined;
    vi.mocked(updateSong).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishSave = () => resolve(song);
        }),
    );
    const onDirtyChange = vi.fn();

    render(<SongEditorPage songId={song.id} onBack={vi.fn()} onDirtyChange={onDirtyChange} />);

    const title = screen.getByLabelText('Título');
    await user.clear(title);
    await user.type(title, 'Novo título');

    const save = screen.getAllByRole('button', { name: 'Salvar alterações' })[0];
    expect(save).toBeDefined();
    if (!save) return;
    expect(save).toBeEnabled();

    await user.click(save);
    expect(save).toBeDisabled();
    expect(save).toHaveTextContent('Salvando…');

    await user.click(save);
    expect(updateSong).toHaveBeenCalledTimes(1);

    finishSave?.();
    await waitFor(() =>
      expect(screen.getByText('Alterações salvas com sucesso.')).toBeInTheDocument(),
    );
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });
});
