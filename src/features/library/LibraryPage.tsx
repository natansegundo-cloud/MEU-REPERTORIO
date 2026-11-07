import { Heart, Library, Plus, Search } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { Button } from '@/components/ui/Button';
import { softDeleteSong, toggleFavorite } from '@/services';

import { useSongs } from './useSongs';
import { SongCard } from './SongCard';
import { useFavoriteIds } from './useFavorites';
import { LibraryTabs } from './LibraryTabs';
import styles from './LibraryPage.module.css';

interface LibraryPageProps {
  readonly notice: string | null;
  readonly onDismissNotice: () => void;
  readonly onImport: () => void;
  readonly onOpenSong: (id: string) => void;
  readonly onOpenRepertories: () => void;
}

export function LibraryPage({
  notice,
  onDismissNotice,
  onImport,
  onOpenSong,
  onOpenRepertories,
}: LibraryPageProps) {
  const [query, setQuery] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const { data: songs, loading, error } = useSongs(query);
  const favoriteIds = useFavoriteIds();
  const visibleSongs = onlyFavorites ? songs.filter((song) => favoriteIds.has(song.id)) : songs;

  async function handleDelete(id: string): Promise<void> {
    const song = songs.find((item) => item.id === id);
    if (!song || !window.confirm(`Excluir “${song.title}” da biblioteca?`)) return;

    try {
      await softDeleteSong(id);
    } catch {
      // O estado reativo continuará intacto; a falha é apresentada no próximo ciclo.
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Meu repertório</p>
          <h1 className={styles.title}>Biblioteca</h1>
          <p className={styles.description}>Suas músicas, cifras e letras disponíveis offline.</p>
        </div>
        <Button onClick={onImport}>
          <Plus size={17} />
          Importar música
        </Button>
      </header>

      <LibraryTabs
        active="songs"
        onChange={(tab) => {
          if (tab === 'repertories') onOpenRepertories();
        }}
      />

      <section className={styles.toolbar} aria-label="Ferramentas da biblioteca">
        <label className={styles.search}>
          <Search size={18} aria-hidden="true" />
          <span className={styles.srOnly}>Pesquisar músicas</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pesquisar por título, artista ou tom"
          />
        </label>
        <div className={styles.filters}>
          <button
            className={styles.favoriteFilter}
            type="button"
            aria-pressed={onlyFavorites}
            onClick={() => setOnlyFavorites((value) => !value)}
          >
            <Heart size={16} fill={onlyFavorites ? 'currentColor' : 'none'} /> Favoritas
          </button>
          <span className={styles.count}>
            {visibleSongs.length} {visibleSongs.length === 1 ? 'música' : 'músicas'}
          </span>
        </div>
      </section>

      {notice ? (
        <button className={styles.notice} type="button" onClick={onDismissNotice}>
          {notice} <span aria-hidden="true">×</span>
        </button>
      ) : null}

      {loading ? <p className={styles.feedback}>Carregando biblioteca…</p> : null}
      {error ? <p className={styles.error}>Não foi possível carregar as músicas locais.</p> : null}

      {!loading && !error && visibleSongs.length === 0 ? (
        query ? (
          <p className={styles.feedback}>Nenhuma música corresponde à sua pesquisa.</p>
        ) : onlyFavorites ? (
          <p className={styles.feedback}>Nenhuma música foi marcada como favorita.</p>
        ) : (
          <EmptyState
            icon={Library}
            badge="Offline primeiro"
            title="Sua biblioteca começa aqui"
            description="Cole uma cifra do Cifra Club e importe sua primeira música. Ela ficará salva neste dispositivo."
          />
        )
      ) : null}

      {!loading && !error && visibleSongs.length > 0 ? (
        <div className={styles.list} aria-label="Músicas cadastradas">
          {visibleSongs.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              onOpen={onOpenSong}
              onDelete={(id) => void handleDelete(id)}
              favorite={favoriteIds.has(song.id)}
              onToggleFavorite={(id) => void toggleFavorite(id)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
