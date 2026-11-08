import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { parseSongText } from '@/features/parser';
import type { Song } from '@/types';

vi.mock('@/services', () => ({
  downloadTextFile: vi.fn(),
  getPreference: vi.fn(),
  setPreference: vi.fn().mockResolvedValue(undefined),
  songTextFileName: vi.fn().mockReturnValue('cancao.txt'),
  toggleFavorite: vi.fn().mockResolvedValue(undefined),
  updateSongPreferredKey: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./useSongs', () => ({ useSong: vi.fn() }));
vi.mock('./useFavorites', () => ({ useIsFavorite: vi.fn() }));
vi.mock('./RepertoryPicker', () => ({
  RepertoryPicker: () => <button type="button">Adicionar a um repertório</button>,
}));

import { getPreference, setPreference, updateSongPreferredKey } from '@/services';

import { useIsFavorite } from './useFavorites';
import { SongViewPage } from './SongViewPage';
import { useSong } from './useSongs';

const song: Song = {
  id: 'song-1',
  title: 'Canção de teste',
  artist: 'Artista',
  originalKey: 'C',
  currentKey: 'C',
  preferredKey: null,
  capo: 2,
  tuning: 'E standard',
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
  vi.mocked(useIsFavorite).mockReturnValue(false);
  vi.mocked(getPreference).mockResolvedValue(false);
});

function renderSong() {
  return render(<SongViewPage songId={song.id} onBack={vi.fn()} onEdit={vi.fn()} />);
}

describe('SongViewPage', () => {
  it('mantém ações secundárias no menu Mais ações e fecha com clique fora', async () => {
    const user = userEvent.setup();
    renderSong();

    expect(screen.queryByRole('button', { name: 'Exportar TXT' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mais ações' }));
    expect(screen.getByRole('button', { name: 'Exportar TXT' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Adicionar a um repertório' })).toBeVisible();

    await user.click(document.body);
    expect(screen.queryByRole('button', { name: 'Exportar TXT' })).not.toBeInTheDocument();
  });

  it('mantém Opções de leitura recolhido e persiste a preferência de diagramas', async () => {
    const user = userEvent.setup();
    renderSong();

    const options = screen.getByText('Opções de leitura');
    expect(options.closest('details')).not.toHaveAttribute('open');
    await user.click(options);
    const switchControl = screen.getByRole('switch', { name: 'Exibir diagramas de acordes' });
    await user.click(switchControl);

    expect(switchControl).toBeChecked();
    expect(setPreference).toHaveBeenCalledWith('reading.diagrams', true);
  });

  it('troca acorde no overlay sem fechar e fecha com Escape', async () => {
    const user = userEvent.setup();
    renderSong();
    await user.click(screen.getByText('Opções de leitura'));
    await user.click(screen.getByRole('switch', { name: 'Exibir diagramas de acordes' }));

    const chordC = screen.getByRole('button', { name: 'Ver diagrama de C' });
    await user.click(chordC);
    expect(screen.getByRole('dialog', { name: 'Diagrama de acorde C' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fechar diagrama' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Ver diagrama de G' }));
    expect(screen.getByRole('dialog', { name: 'Diagrama de acorde G' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Diagrama de acorde C' })).not.toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(chordC).toHaveFocus();
  });

  it('transpõe e salva o tom sem repetir o tom atual nos metadados', async () => {
    const user = userEvent.setup();
    renderSong();
    const tone = screen.getByRole('region', { name: 'Controles de tom' });
    await user.click(within(tone).getByRole('button', { name: 'Subir um semitom' }));

    expect(within(tone).getByText('C#')).toBeInTheDocument();
    const originalKey = screen.getByText('Tom original');
    expect(originalKey.nextElementSibling).toHaveTextContent('C');
    expect(screen.queryByText('Tom atual')).not.toBeInTheDocument();

    await user.click(within(tone).getByRole('button', { name: 'Salvar tom' }));
    expect(updateSongPreferredKey).toHaveBeenCalledWith(song.id, 'C#', song.revision);
  });
});
