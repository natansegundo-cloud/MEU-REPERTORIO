import { ArrowLeft, Save, TriangleAlert } from 'lucide-react';
import { useEffect, useState, type ChangeEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { parseTonality } from '@/features/transpose';
import {
  addChord,
  addLine,
  removeChord,
  removeLine,
  updateChord,
  updateChordPosition,
  updateLineText,
  updateSectionLabel,
  validateSongStructure,
} from './editor-model';
import { SongRevisionConflictError, updateSong, type SongEditInput } from '@/services';
import type { ParsedSong, Song } from '@/types';

import { SongLineEditor } from './SongLineEditor';
import { useSong } from './useSongs';
import styles from './SongEditorPage.module.css';

interface SongEditorPageProps {
  readonly songId: string;
  readonly onBack: () => void;
  readonly onDirtyChange: (dirty: boolean) => void;
}

type SongDraft = SongEditInput;

function nullableText(value: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function draftFromSong(song: Song): SongDraft {
  return {
    title: song.title,
    artist: song.artist,
    structure: song.structure,
    preferredKey: song.preferredKey,
    capo: song.capo,
    tuning: song.tuning,
    rhythm: song.rhythm,
    strumming: song.strumming,
    difficulty: song.difficulty,
    notes: song.notes,
  };
}

function numericOrNull(event: ChangeEvent<HTMLInputElement>): number | null {
  if (!event.target.value.trim()) return null;
  const value = Number(event.target.value);
  return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : null;
}

function withMetadata(structure: ParsedSong, title: string, artist: string | null): ParsedSong {
  return {
    ...structure,
    title,
    artist,
    metadata: { ...structure.metadata, title, artist },
  };
}

export function SongEditorPage({ songId, onBack, onDirtyChange }: SongEditorPageProps) {
  const { data: song, loading, error } = useSong(songId);
  const [draftOverride, setDraftOverride] = useState<SongDraft | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const draft = draftOverride ?? (song ? draftFromSong(song) : null);
  const dirty = draftOverride !== null;

  useEffect(() => {
    if (!dirty) return undefined;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  function editDraft(updater: (current: SongDraft) => SongDraft): void {
    if (!draft) return;
    setDraftOverride(updater(draft));
    onDirtyChange(true);
    setFeedback(null);
    setSaveError(null);
  }

  function handleBack(): void {
    if (dirty && !window.confirm('Existem alterações não salvas. Sair mesmo assim?')) return;
    onDirtyChange(false);
    onBack();
  }

  async function handleSave(): Promise<void> {
    if (!song || !draft) return;
    setFeedback(null);
    setSaveError(null);

    const title = draft.title.trim();
    if (!title) {
      setSaveError('Informe um título antes de salvar.');
      return;
    }
    if (draft.preferredKey && !parseTonality(draft.preferredKey)) {
      setSaveError('O tom preferido não foi reconhecido. Use, por exemplo, C, Bb ou F#m.');
      return;
    }
    const issues = validateSongStructure(draft.structure);
    if (issues.length > 0) {
      setSaveError(issues[0]?.message ?? 'Corrija as cifras inválidas antes de salvar.');
      return;
    }

    try {
      await updateSong(
        song.id,
        {
          ...draft,
          title,
          artist: nullableText(draft.artist),
          structure: withMetadata(draft.structure, title, nullableText(draft.artist)),
        },
        song.revision,
      );
      setDraftOverride(null);
      onDirtyChange(false);
      setFeedback('Alterações salvas com sucesso.');
    } catch (cause: unknown) {
      if (cause instanceof SongRevisionConflictError) {
        setSaveError(
          'Esta música foi alterada em outra aba. Reabra a edição para revisar a versão atual.',
        );
      } else {
        setSaveError(
          cause instanceof Error ? cause.message : 'Não foi possível salvar as alterações.',
        );
      }
    }
  }

  if (loading) return <p className={styles.feedback}>Abrindo editor…</p>;
  if (error) return <p className={styles.error}>Não foi possível abrir esta música local.</p>;
  if (!song || !draft) {
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
      <button className={styles.back} type="button" onClick={handleBack}>
        <ArrowLeft size={17} />
        Voltar para a música
      </button>

      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Edição estruturada</p>
          <h1 className={styles.title}>Editar música</h1>
          <p className={styles.description}>
            Altere letra, cifras e informações sem perder a estrutura.
          </p>
        </div>
        <Button onClick={() => void handleSave()} disabled={!dirty}>
          <Save size={17} />
          Salvar alterações
        </Button>
      </header>

      <div className={styles.form}>
        <section className={styles.panel} aria-labelledby="song-metadata-heading">
          <h2 id="song-metadata-heading">Identificação</h2>
          <div className={styles.fieldGrid}>
            <label className={styles.field}>
              <span>Título</span>
              <input
                value={draft.title}
                onChange={(event) =>
                  editDraft((current) => ({ ...current, title: event.target.value }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>Artista</span>
              <input
                value={draft.artist ?? ''}
                onChange={(event) =>
                  editDraft((current) => ({ ...current, artist: event.target.value }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>Tom original</span>
              <input value={song.originalKey ?? 'Não informado'} readOnly />
            </label>
            <label className={styles.field}>
              <span>Tom preferido</span>
              <input
                value={draft.preferredKey ?? ''}
                placeholder={song.originalKey ?? 'Ex.: G'}
                onChange={(event) =>
                  editDraft((current) => ({ ...current, preferredKey: event.target.value }))
                }
              />
            </label>
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="music-info-heading">
          <h2 id="music-info-heading">Informações musicais</h2>
          <div className={styles.fieldGrid}>
            <label className={styles.field}>
              <span>Capotraste</span>
              <input
                type="number"
                min={0}
                value={draft.capo ?? ''}
                onChange={(event) =>
                  editDraft((current) => ({ ...current, capo: numericOrNull(event) }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>Afinação</span>
              <input
                value={draft.tuning ?? ''}
                placeholder="Ex.: padrão, DADGAD"
                onChange={(event) =>
                  editDraft((current) => ({ ...current, tuning: event.target.value }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>Ritmo</span>
              <input
                value={draft.rhythm ?? ''}
                onChange={(event) =>
                  editDraft((current) => ({ ...current, rhythm: event.target.value }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>Batida</span>
              <input
                value={draft.strumming ?? ''}
                onChange={(event) =>
                  editDraft((current) => ({ ...current, strumming: event.target.value }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>Dificuldade</span>
              <input
                value={draft.difficulty ?? ''}
                placeholder="Ex.: intermediária"
                onChange={(event) =>
                  editDraft((current) => ({ ...current, difficulty: event.target.value }))
                }
              />
            </label>
            <label className={`${styles.field} ${styles.wideField}`}>
              <span>Observações pessoais</span>
              <textarea
                value={draft.notes ?? ''}
                rows={2}
                onChange={(event) =>
                  editDraft((current) => ({ ...current, notes: event.target.value }))
                }
              />
            </label>
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="song-content-heading">
          <div className={styles.sectionHeading}>
            <div>
              <h2 id="song-content-heading">Letra e cifras</h2>
              <p>As posições são contadas em caracteres a partir do início de cada linha.</p>
            </div>
            <Button
              variant="secondary"
              onClick={() =>
                editDraft((current) => ({
                  ...current,
                  structure: addLine(current.structure, current.structure.lines.length - 1),
                }))
              }
            >
              <PlusIcon />
              Adicionar linha
            </Button>
          </div>
          <div className={styles.lines}>
            {draft.structure.lines.map((line, lineIndex) => (
              <SongLineEditor
                key={`${line.lineNumber}-${lineIndex}`}
                line={line}
                lineIndex={lineIndex}
                onTextChange={(index, text) =>
                  editDraft((current) => ({
                    ...current,
                    structure: updateLineText(current.structure, index, text),
                  }))
                }
                onSectionChange={(index, label) =>
                  editDraft((current) => ({
                    ...current,
                    structure: updateSectionLabel(current.structure, index, label),
                  }))
                }
                onChordChange={(index, chordIndex, symbol) =>
                  editDraft((current) => ({
                    ...current,
                    structure: updateChord(current.structure, index, chordIndex, symbol),
                  }))
                }
                onPositionChange={(index, chordIndex, position) =>
                  editDraft((current) => ({
                    ...current,
                    structure: updateChordPosition(current.structure, index, chordIndex, position),
                  }))
                }
                onAddChord={(index) =>
                  editDraft((current) => ({
                    ...current,
                    structure: addChord(current.structure, index),
                  }))
                }
                onRemoveChord={(index, chordIndex) =>
                  editDraft((current) => ({
                    ...current,
                    structure: removeChord(current.structure, index, chordIndex),
                  }))
                }
                onAddLine={(index) =>
                  editDraft((current) => ({
                    ...current,
                    structure: addLine(current.structure, index),
                  }))
                }
                onRemoveLine={(index) =>
                  editDraft((current) => ({
                    ...current,
                    structure: removeLine(current.structure, index),
                  }))
                }
              />
            ))}
          </div>
        </section>

        {saveError ? (
          <div className={styles.alert} role="alert">
            <TriangleAlert size={18} />
            {saveError}
          </div>
        ) : null}
        {feedback ? (
          <p className={styles.success} role="status">
            {feedback}
          </p>
        ) : null}

        <div className={styles.actions}>
          <Button variant="secondary" onClick={handleBack}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSave()} disabled={!dirty}>
            Salvar alterações
          </Button>
        </div>
      </div>
    </div>
  );
}

function PlusIcon() {
  return <span aria-hidden="true">＋</span>;
}
