import {
  ArrowLeft,
  Download,
  Edit3,
  Heart,
  Menu,
  MoreHorizontal,
  Music2,
  Minus,
  Plus,
  Save,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ChordDiagramOverlay } from '@/components/music';
import { Button } from '@/components/ui/Button';
import { transposeParsedSong } from '@/features/parser';
import { transposeTonality } from '@/features/transpose';
import {
  downloadTextFile,
  getPreference,
  setPreference,
  songTextFileName,
  toggleFavorite,
  updateSongPreferredKey,
} from '@/services';

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
  readonly backLabel?: string;
}

export function SongViewPage({
  songId,
  onBack,
  onEdit,
  backLabel = 'Voltar para a biblioteca',
}: SongViewPageProps) {
  const { data: song, loading, error } = useSong(songId);
  const [manualShift, setManualShift] = useState<number | null>(null);
  const [toneFeedback, setToneFeedback] = useState<string | null>(null);
  const [toneError, setToneError] = useState<string | null>(null);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [diagramsEnabled, setDiagramsEnabled] = useState(false);
  const [diagramSymbol, setDiagramSymbol] = useState<string | null>(null);
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const moreActionsRef = useRef<HTMLDivElement>(null);
  const moreActionsPanelRef = useRef<HTMLDivElement>(null);
  const favorite = useIsFavorite(songId);

  useEffect(() => {
    void getPreference('reading.diagrams', false).then(setDiagramsEnabled);
  }, []);

  useEffect(() => {
    if (!moreActionsOpen) return undefined;

    function handlePointerDown(event: PointerEvent): void {
      if (!moreActionsRef.current?.contains(event.target as Node)) {
        setMoreActionsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setMoreActionsOpen(false);
      moreActionsRef.current
        ?.querySelector<HTMLButtonElement>('[aria-label="Mais ações"]')
        ?.focus();
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    const firstAction = moreActionsPanelRef.current?.querySelector<HTMLElement>('button');
    firstAction?.focus();
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [moreActionsOpen]);

  useEffect(() => {
    if (!toneFeedback && !toneError && !exportFeedback && !exportError) return undefined;
    const timeoutId = window.setTimeout(() => {
      setToneFeedback(null);
      setToneError(null);
      setExportFeedback(null);
      setExportError(null);
    }, 3500);
    return () => window.clearTimeout(timeoutId);
  }, [exportError, exportFeedback, toneError, toneFeedback]);

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

  function handleExportSong(): void {
    if (!song) return;
    setExportFeedback(null);
    setExportError(null);
    try {
      downloadTextFile(song.content, songTextFileName(song), 'text/plain;charset=utf-8');
      setExportFeedback('Música exportada em TXT.');
    } catch (cause: unknown) {
      setExportError(
        cause instanceof Error ? cause.message : 'Não foi possível exportar a música.',
      );
    }
  }

  const closeChordDiagram = useCallback(() => setDiagramSymbol(null), []);

  const feedback = toneFeedback ?? exportFeedback;
  const feedbackError = toneError ?? exportError;

  if (loading) return <p className={styles.feedback}>Abrindo música…</p>;
  if (error) return <p className={styles.error}>Não foi possível abrir esta música local.</p>;
  if (!song || !displayedStructure) {
    return (
      <div className={styles.notFound}>
        <p className={styles.error}>Esta música não está mais disponível.</p>
        <Button variant="secondary" onClick={onBack}>
          {backLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <button className={styles.back} type="button" onClick={onBack}>
        <ArrowLeft size={17} />
        {backLabel}
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
          <div className={styles.moreActions} ref={moreActionsRef}>
            <Button
              className={styles.moreActionsTrigger}
              variant="secondary"
              aria-label="Mais ações"
              aria-expanded={moreActionsOpen}
              aria-controls="song-more-actions"
              aria-haspopup="menu"
              onClick={() => setMoreActionsOpen((current) => !current)}
            >
              <MoreHorizontal size={18} />
            </Button>
            {moreActionsOpen ? (
              <div
                id="song-more-actions"
                ref={moreActionsPanelRef}
                className={styles.moreActionsPanel}
                aria-label="Mais ações da música"
              >
                <Button
                  variant="ghost"
                  onClick={() => {
                    handleExportSong();
                    setMoreActionsOpen(false);
                  }}
                >
                  <Download size={17} />
                  Exportar TXT
                </Button>
                <RepertoryPicker songId={song.id} />
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <section className={styles.tonePanel} aria-label="Controles de tom">
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
          <strong className={styles.toneValue} aria-live="polite">
            {displayedKey ?? '—'}
          </strong>
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
          <button
            type="button"
            className={styles.originalTone}
            onClick={() => {
              setManualShift(0);
              setToneFeedback(null);
            }}
          >
            Original
          </button>
          <Button size="sm" onClick={() => void saveDisplayedKey()} aria-label="Salvar tom">
            <Save size={15} /> Salvar
          </Button>
        </div>
      </section>

      {feedback || feedbackError ? (
        <p
          className={feedbackError ? styles.toastError : styles.toast}
          role={feedbackError ? 'alert' : 'status'}
        >
          {feedbackError ?? feedback}
        </p>
      ) : null}

      {song.originalKey || song.capo !== null || song.tuning ? (
        <dl className={styles.meta} aria-label="Metadados da música">
          {song.originalKey ? (
            <div className={styles.metaChip}>
              <dt>Tom original</dt>
              <dd>{song.originalKey}</dd>
            </div>
          ) : null}
          {song.capo !== null ? (
            <div className={styles.metaChip}>
              <dt>Capotraste</dt>
              <dd>Casa {song.capo}</dd>
            </div>
          ) : null}
          {song.tuning ? (
            <div className={styles.metaChip}>
              <dt>Afinação</dt>
              <dd>{song.tuning}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      <details className={styles.readingOptions}>
        <summary>
          <Menu size={16} aria-hidden="true" />
          Opções de leitura
        </summary>
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
      </details>
      {diagramsEnabled && diagramSymbol ? (
        <ChordDiagramOverlay symbol={diagramSymbol} onClose={closeChordDiagram} />
      ) : null}
      <SongSheet
        structure={displayedStructure}
        title={song.title}
        {...(diagramsEnabled ? { onChordSelect: setDiagramSymbol } : {})}
      />
    </div>
  );
}
