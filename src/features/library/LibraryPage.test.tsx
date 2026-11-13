import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { parseSongText } from '@/features/parser';
import type { Song } from '@/types';

vi.mock('@/services', () => ({
  softDeleteSong: vi.fn(),
  toggleFavorite: vi.fn(),
}));

vi.mock('./useSongs', () => ({ useSongs: vi.fn() }));
vi.mock('./useFavorites', () => ({ useFavoriteIds: vi.fn() }));

import { toggleFavorite } from '@/services';

import { LibraryPage } from './LibraryPage';
import { useFavoriteIds } from './useFavorites';
import { useSongs } from './useSongs';

const song: Song = {
  id: 'song-1',
  title: 'Canção favorita',
  artist: 'Artista',
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
  createdAt: '2026-11-08T12:00:00.000Z',
  updatedAt: '2026-11-08T12:00:00.000Z',
  deletedAt: null,
  revision: 1,
  syncPending: false,
};

function renderLibrary() {
  return render(
    <LibraryPage
      notice={null}
      onDismissNotice={vi.fn()}
      onAddSong={vi.fn()}
      onImportBatch={vi.fn()}
      onCreateRepertory={vi.fn()}
      onOpenSong={vi.fn()}
      onOpenRepertories={vi.fn()}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useSongs).mockReturnValue({ data: [song], loading: false, error: null });
  vi.mocked(useFavoriteIds).mockReturnValue(new Set());
});

describe('LibraryPage', () => {
  it('mostra erro visível quando não consegue alternar o favorito', async () => {
    const user = userEvent.setup();
    vi.mocked(toggleFavorite).mockRejectedValueOnce(new Error('Falha ao gravar o favorito.'));
    renderLibrary();

    await user.click(screen.getByRole('button', { name: `Favoritar ${song.title}` }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao gravar o favorito.');
  });
});
