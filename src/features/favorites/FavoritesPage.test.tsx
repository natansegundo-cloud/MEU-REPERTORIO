import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { parseSongText } from '@/features/parser';
import type { Song } from '@/types';

vi.mock('@/services', () => ({
  softDeleteSong: vi.fn(),
  toggleFavorite: vi.fn(),
}));

vi.mock('@/features/library/useSongs', () => ({ useSongs: vi.fn() }));
vi.mock('@/features/library/useFavorites', () => ({ useFavoriteIds: vi.fn() }));

import { toggleFavorite } from '@/services';
import { useFavoriteIds } from '@/features/library/useFavorites';
import { useSongs } from '@/features/library/useSongs';

import { FavoritesPage } from './FavoritesPage';

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

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useSongs).mockReturnValue({ data: [song], loading: false, error: null });
  vi.mocked(useFavoriteIds).mockReturnValue(new Set([song.id]));
});

describe('FavoritesPage', () => {
  it('mostra erro visível quando não consegue remover o favorito', async () => {
    const user = userEvent.setup();
    vi.mocked(toggleFavorite).mockRejectedValueOnce(new Error('Falha ao gravar o favorito.'));
    render(<FavoritesPage onOpenSong={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: `Remover ${song.title} dos favoritos` }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao gravar o favorito.');
  });
});
