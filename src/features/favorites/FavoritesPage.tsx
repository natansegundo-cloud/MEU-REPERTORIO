import { Heart } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { softDeleteSong, toggleFavorite } from '@/services';

import { SongCard } from '@/features/library/SongCard';
import { useFavoriteIds } from '@/features/library/useFavorites';
import { useSongs } from '@/features/library/useSongs';
import styles from '@/features/library/LibraryPage.module.css';

interface FavoritesPageProps {
  readonly onOpenSong: (id: string) => void;
}

export function FavoritesPage({ onOpenSong }: FavoritesPageProps) {
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);
  const { data: songs, loading, error } = useSongs('');
  const favoriteIds = useFavoriteIds();
  const favorites = songs.filter((song) => favoriteIds.has(song.id));

  async function handleDelete(id: string): Promise<void> {
    const song = favorites.find((item) => item.id === id);
    if (!song || !window.confirm(`Excluir “${song.title}” da biblioteca?`)) return;

    setDeleteError(null);
    try {
      await softDeleteSong(id);
    } catch (cause: unknown) {
      setDeleteError(
        cause instanceof Error ? cause.message : 'Não foi possível excluir esta música.',
      );
    }
  }

  async function handleToggleFavorite(id: string): Promise<void> {
    setFavoriteError(null);
    try {
      await toggleFavorite(id);
    } catch (cause: unknown) {
      setFavoriteError(
        cause instanceof Error ? cause.message : 'Não foi possível atualizar o favorito.',
      );
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Favoritos</h1>
        <span className={styles.count}>
          {favorites.length} {favorites.length === 1 ? 'música' : 'músicas'}
        </span>
      </header>
      {loading ? <p className={styles.feedback}>Carregando favoritos…</p> : null}
      {error ? (
        <p className={styles.error}>Não foi possível carregar os favoritos locais.</p>
      ) : null}
      {deleteError ? (
        <p className={styles.error} role="alert">
          {deleteError}
        </p>
      ) : null}
      {favoriteError ? (
        <p className={styles.error} role="alert">
          {favoriteError}
        </p>
      ) : null}
      {!loading && !error && favorites.length === 0 ? (
        <EmptyState
          icon={Heart}
          badge="Biblioteca"
          title="Nenhum favorito ainda"
          description="Use a estrela na biblioteca ou na tela da música para criar seus atalhos."
        />
      ) : null}
      {!loading && !error && favorites.length > 0 ? (
        <div className={styles.list} aria-label="Músicas favoritas">
          {favorites.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              onOpen={onOpenSong}
              onDelete={(id) => void handleDelete(id)}
              favorite
              onToggleFavorite={(id) => void handleToggleFavorite(id)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
