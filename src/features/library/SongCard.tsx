import { Heart, Music2, Trash2 } from 'lucide-react';

import type { Song } from '@/types';

import styles from './SongCard.module.css';

interface SongCardProps {
  readonly song: Song;
  readonly onOpen: (id: string) => void;
  readonly onDelete: (id: string) => void;
  readonly favorite?: boolean;
  readonly onToggleFavorite?: (id: string) => void;
}

export function SongCard({
  song,
  onOpen,
  onDelete,
  favorite = false,
  onToggleFavorite,
}: SongCardProps) {
  return (
    <article className={styles.card} data-testid="song-card">
      <button className={styles.mainAction} type="button" onClick={() => onOpen(song.id)}>
        <span className={styles.icon} aria-hidden="true">
          <Music2 size={19} strokeWidth={1.8} />
        </span>
        <span className={styles.copy}>
          <strong className={styles.title}>{song.title}</strong>
          <span className={styles.artist}>{song.artist ?? 'Artista não informado'}</span>
        </span>
        <span className={styles.key}>{song.currentKey ?? song.originalKey ?? 'Sem tom'}</span>
      </button>
      {onToggleFavorite ? (
        <button
          className={styles.favorite}
          type="button"
          aria-label={favorite ? `Remover ${song.title} dos favoritos` : `Favoritar ${song.title}`}
          aria-pressed={favorite}
          onClick={() => onToggleFavorite(song.id)}
        >
          <Heart size={17} fill={favorite ? 'currentColor' : 'none'} strokeWidth={1.8} />
        </button>
      ) : null}
      <button
        className={styles.delete}
        type="button"
        aria-label={`Excluir ${song.title}`}
        onClick={() => onDelete(song.id)}
      >
        <Trash2 size={17} strokeWidth={1.8} />
      </button>
    </article>
  );
}
