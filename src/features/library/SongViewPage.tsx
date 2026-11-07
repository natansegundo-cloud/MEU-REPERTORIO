import { ArrowLeft, Edit3, Heart, Music2, Minus, Plus, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { ChordDiagram } from '@/components/music';
import { Button } from '@/components/ui/Button';
import { transposeParsedSong } from '@/features/parser';
import { transposeTonality } from '@/features/transpose';
import { getPreference, setPreference, toggleFavorite, updateSongPreferredKey } from '@/services';

import { SongSheet } from '@/features/songs';
import { baseSongStructure, keyShift } from '@/features/songs/display';
import { useSong } from './useSongs';
import { RepertoryPicker } from './RepertoryPicker';
import { useIsFavorite } from './useFavorites';
import styles from './SongViewPage.module.css';

interface SongViewPageProps {
  readonly songId: string;
  readonly onBack: () => void;
  readonly onEdit: () => void;
}

export function SongViewPage({ songId, onBack, onEdit }: SongViewPageProps) {
  const { data: song, loading, error } = useSong(songId);
  const [manualShift, setManualShift] = useState<number | null>(null);
  const [toneFeedback, setToneFeedback] = useState<string | null>(null);
  const [toneError, setToneError] = useState<string | null>(null);
  const [diagramsEnabled, setDiagramsEnabled] = useState(false);
  const [diagramSymbol, setDiagramSymbol] = useState<string | null>(null);
  const favorite = useIsFavorite(songId);

  useEffect(() => {
    void getPreference('reading.diagrams', false).then(setDiagramsEnabled);
  }, []);

  const preferredShift = song
    ? keyShift(song.originalKey, song.preferredKey ?? song.currentKey)
    : 0;
  const displayShift = manualShift ?? preferredShift;
  const displayedStructure = useMemo(() => {
    if (!song) return null;
    return transposeParsedSong(baseSongStructure(song), displayShift);
  }, [displayShift, song]);
  const displayedKey = displayedStructure?.currentKey ?? song?.originalKey ?? null;

  async function saveDisplayedKey(): Promise<void> {
    if (!song) return;
    setToneFeedback(null);
    setToneError(null);
    const preferredKey =
      displayShift === 0 ? null : transposeTonality(song.originalKey ?? '', displayShift);
    try {
      await updateSongPreferredKey(song.id, preferredKey, song.revision);
      setManualShift(null);
      setToneFeedback(
        preferredKey ? `Tom preferido salvo: ${preferredKey}.` : 'Tom original restaurado.',
      );
    } catch (cause: unknown) {
      setToneError(
        cause instanceof Error ? cause.message : 'Não foi possível salvar o tom preferido.',
      );
    }
  }

  if (loading) return <p className={styles.feedback}>Abrindo música…</p>;
  if (error) return <p className={styles.error}>Não foi possível abrir esta música local.</p>;
  if (!song || !displayedStructure) {
    return (
      <div className={styles.notFound}>
        <p className={styles.error}>Esta música não está mais disponível.</p>
        <Button variant="secondary" onClick={onBack}>
          Voltar para a biblioteca
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <button className={styles.back} type="button" onClick={onBack}>
        <ArrowLeft size={17} />
        Voltar para a biblioteca
      </button>

      <header className={styles.header}>
        <div className={styles.heading}>
          <span className={styles.icon} aria-hidden="true">
            <Music2 size={20} />
          </span>
          <div>
            <p className={styles.eyebrow}>Música</p>
            <h1 className={styles.title}>{song.title}</h1>
            {song.artist ? <p className={styles.artist}>{song.artist}</p> : null}
          </div>
        </div>
        <div className={styles.headerActions}>
          <RepertoryPicker songId={song.id} />
          <Button
            variant="secondary"
            aria-pressed={favorite}
            onClick={() => void toggleFavorite(song.id)}
          >
            <Heart size={17} fill={favorite ? 'currentColor' : 'none'} />
            {favorite ? 'Favorita' : 'Favoritar'}
          </Button>
          <Button variant="secondary" onClick={onEdit}>
            <Edit3 size={17} />
            Editar música
          </Button>
        </div>
      </header>

      <section className={styles.tonePanel} aria-label="Controles de tom">
        <div>
          <span className={styles.toneLabel}>Tom exibido</span>
          <strong className={styles.toneValue}>{displayedKey ?? 'Não informado'}</strong>
          <span className={styles.toneHint}>
            Original: {song.originalKey ?? 'não informado'} · Preferido:{' '}
            {song.preferredKey ?? 'original'}
          </span>
        </div>
        <div className={styles.toneControls}>
          <button
            type="button"
            aria-label="Baixar um semitom"
            onClick={() => {
              setManualShift(displayShift - 1);
              setToneFeedback(null);
            }}
          >
            <Minus size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              setManualShift(0);
              setToneFeedback(null);
            }}
          >
            Original
          </button>
          <button
            type="button"
            aria-label="Subir um semitom"
            onClick={() => {
              setManualShift(displayShift + 1);
              setToneFeedback(null);
            }}
          >
            <Plus size={16} />
          </button>
          <Button size="sm" onClick={() => void saveDisplayedKey()}>
            <Save size={15} /> Salvar tom
          </Button>
        </div>
      </section>

      {toneFeedback ? (
        <p className={styles.success} role="status">
          {toneFeedback}
        </p>
      ) : null}
      {toneError ? (
        <p className={styles.error} role="alert">
          {toneError}
        </p>
      ) : null}

      <dl className={styles.meta}>
        <div>
          <dt>Tom original</dt>
          <dd>{song.originalKey ?? 'Não informado'}</dd>
        </div>
        <div>
          <dt>Tom atual</dt>
          <dd>{displayedKey ?? 'Não informado'}</dd>
        </div>
        {song.capo !== null ? (
          <div>
            <dt>Capotraste</dt>
            <dd>Casa {song.capo}</dd>
          </div>
        ) : null}
        {song.tuning ? (
          <div>
            <dt>Afinação</dt>
            <dd>{song.tuning}</dd>
          </div>
        ) : null}
      </dl>
      <div className={styles.readingTools}>
        <label>
          <input
            type="checkbox"
            role="switch"
            checked={diagramsEnabled}
            onChange={(event) => {
              const enabled = event.target.checked;
              setDiagramsEnabled(enabled);
              void setPreference('reading.diagrams', enabled);
              if (!enabled) setDiagramSymbol(null);
            }}
          />
          Exibir diagramas de acordes
        </label>
      </div>
      {diagramsEnabled && diagramSymbol ? (
        <ChordDiagram
          key={diagramSymbol}
          symbol={diagramSymbol}
          onClose={() => setDiagramSymbol(null)}
        />
      ) : null}
      <SongSheet
        structure={displayedStructure}
        title={song.title}
        {...(diagramsEnabled ? { onChordSelect: setDiagramSymbol } : {})}
      />
    </div>
  );
}
