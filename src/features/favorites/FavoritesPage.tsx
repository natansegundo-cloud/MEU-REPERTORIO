import { Heart } from 'lucide-react';

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
  const { data: songs, loading, error } = useSongs('');
  const favoriteIds = useFavoriteIds();
  const favorites = songs.filter((song) => favoriteIds.has(song.id));

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Acesso rápido</p>
          <h1 className={styles.title}>Favoritos</h1>
          <p className={styles.description}>As músicas que você mais usa, disponíveis offline.</p>
        </div>
      </header>
      {loading ? <p className={styles.feedback}>Carregando favoritos…</p> : null}
      {error ? (
        <p className={styles.error}>Não foi possível carregar os favoritos locais.</p>
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
              onDelete={(id) => void softDeleteSong(id)}
              favorite
              onToggleFavorite={(id) => void toggleFavorite(id)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
