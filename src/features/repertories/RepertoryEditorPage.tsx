import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  GripVertical,
  Play,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { useState, type PointerEvent } from 'react';

import { Button } from '@/components/ui/Button';
import {
  addSongsToRepertory,
  removeRepertoryItem,
  renameRepertory,
  reorderRepertoryItem,
  updateRepertoryItemKey,
} from '@/services';

import { LibraryTabs } from '@/features/library/LibraryTabs';
import { useSongs } from '@/features/library/useSongs';
import { useRepertoryDetail } from './useRepertories';
import styles from './RepertoryEditorPage.module.css';

interface RepertoryEditorPageProps {
  readonly repertoryId: string;
  readonly onBack: () => void;
  readonly onOpenSongs: () => void;
  readonly onOpenShow: (itemId?: string) => void;
}

export function RepertoryEditorPage({
  repertoryId,
  onBack,
  onOpenSongs,
  onOpenShow,
}: RepertoryEditorPageProps) {
  const { data: detail, loading, error } = useRepertoryDetail(repertoryId);
  const [songQuery, setSongQuery] = useState('');
  const [selectedSongIds, setSelectedSongIds] = useState<readonly string[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [pointerDraggingId, setPointerDraggingId] = useState<string | null>(null);
  const [pointerTargetIndex, setPointerTargetIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { data: songs, loading: songsLoading } = useSongs(songQuery);

  function clearMessages(): void {
    setFeedback(null);
    setErrorMessage(null);
  }

  async function handleRename(): Promise<void> {
    if (!detail) return;
    clearMessages();
    try {
      await renameRepertory(detail.repertory.id, nameDraft, detail.repertory.revision);
      setEditingName(false);
      setFeedback('Nome do repertório atualizado.');
    } catch (cause: unknown) {
      setErrorMessage(
        cause instanceof Error ? cause.message : 'Não foi possível renomear o repertório.',
      );
    }
  }

  async function handleAddSongs(): Promise<void> {
    if (!detail || selectedSongIds.length === 0) return;
    clearMessages();
    try {
      await addSongsToRepertory(detail.repertory.id, selectedSongIds, detail.repertory.revision);
      setSelectedSongIds([]);
      setFeedback('Músicas adicionadas ao repertório.');
    } catch (cause: unknown) {
      setErrorMessage(
        cause instanceof Error ? cause.message : 'Não foi possível adicionar as músicas.',
      );
    }
  }

  async function handleMove(itemId: string, targetIndex: number): Promise<void> {
    if (!detail) return;
    clearMessages();
    try {
      await reorderRepertoryItem(
        detail.repertory.id,
        itemId,
        targetIndex,
        detail.repertory.revision,
      );
    } catch (cause: unknown) {
      setErrorMessage(
        cause instanceof Error ? cause.message : 'Não foi possível reordenar o repertório.',
      );
    }
  }

  async function handleRemove(itemId: string): Promise<void> {
    clearMessages();
    try {
      await removeRepertoryItem(itemId);
      setFeedback('Música removida do repertório.');
    } catch (cause: unknown) {
      setErrorMessage(
        cause instanceof Error ? cause.message : 'Não foi possível remover a música.',
      );
    }
  }

  async function handleItemKey(itemId: string, value: string): Promise<void> {
    clearMessages();
    try {
      await updateRepertoryItemKey(itemId, value);
      setFeedback('Tom próprio atualizado.');
    } catch (cause: unknown) {
      setErrorMessage(
        cause instanceof Error ? cause.message : 'Não foi possível salvar o tom próprio.',
      );
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLSpanElement>, itemId: string): void {
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
    event.preventDefault();
    setDraggingId(itemId);
    setPointerDraggingId(itemId);
    setPointerTargetIndex(null);
  }

  function finishPointerDrag(): void {
    if (!detail || !pointerDraggingId || pointerTargetIndex === null) return;
    void handleMove(pointerDraggingId, pointerTargetIndex);
    setDraggingId(null);
    setPointerDraggingId(null);
    setPointerTargetIndex(null);
  }

  if (loading) return <p className={styles.feedback}>Abrindo repertório…</p>;
  if (error) return <p className={styles.error}>Não foi possível abrir este repertório.</p>;
  if (!detail) {
    return (
      <div className={styles.notFound}>
        <p className={styles.error}>Este repertório não está mais disponível.</p>
        <Button variant="secondary" onClick={onBack}>
          Voltar para repertórios
        </Button>
      </div>
    );
  }

  const existingSongIds = new Set(detail.items.map((entry) => entry.item.songId));

  return (
    <div className={styles.page}>
      <button className={styles.back} type="button" onClick={onBack}>
        <ArrowLeft size={17} />
        Voltar para repertórios
      </button>

      <LibraryTabs
        active="repertories"
        onChange={(tab) => {
          if (tab === 'songs') onOpenSongs();
        }}
      />

      <header className={styles.header}>
        <div className={styles.heading}>
          <p className={styles.eyebrow}>Editor de repertório</p>
          {editingName ? (
            <div className={styles.titleEdit}>
              <input
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                autoFocus
              />
              <Button size="sm" onClick={() => void handleRename()}>
                <Save size={15} /> Salvar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingName(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <div className={styles.titleLine}>
              <h1 className={styles.title}>{detail.repertory.name}</h1>
              <button
                className={styles.editName}
                type="button"
                onClick={() => {
                  setNameDraft(detail.repertory.name);
                  setEditingName(true);
                }}
              >
                Renomear
              </button>
            </div>
          )}
          <p className={styles.description}>
            {detail.items.length} {detail.items.length === 1 ? 'música' : 'músicas'} nesta ordem.
          </p>
        </div>
        <Button onClick={() => onOpenShow()} disabled={detail.items.length === 0}>
          <Play size={17} /> Tocar
        </Button>
      </header>

      <section className={styles.addPanel} aria-labelledby="add-songs-heading">
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="add-songs-heading">Adicionar músicas</h2>
            <p>Selecione várias músicas de uma vez. As novas entram no final.</p>
          </div>
          <Button onClick={() => void handleAddSongs()} disabled={selectedSongIds.length === 0}>
            <Plus size={17} /> Adicionar{' '}
            {selectedSongIds.length > 0 ? `(${selectedSongIds.length})` : ''}
          </Button>
        </div>
        <label className={styles.search}>
          <span className={styles.srOnly}>Pesquisar músicas para adicionar</span>
          <input
            value={songQuery}
            onChange={(event) => setSongQuery(event.target.value)}
            placeholder="Pesquisar por título, artista ou tom"
          />
        </label>
        <div className={styles.songPicker}>
          {songsLoading ? <p className={styles.muted}>Carregando músicas…</p> : null}
          {!songsLoading && songs.filter((song) => !existingSongIds.has(song.id)).length === 0 ? (
            <p className={styles.muted}>Nenhuma música disponível para adicionar.</p>
          ) : null}
          {songs
            .filter((song) => !existingSongIds.has(song.id))
            .map((song) => {
              const checked = selectedSongIds.includes(song.id);
              return (
                <label className={styles.songOption} key={song.id}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setSelectedSongIds((current) =>
                        checked ? current.filter((id) => id !== song.id) : [...current, song.id],
                      )
                    }
                  />
                  <span>
                    <strong>{song.title}</strong>
                    <small>
                      {song.artist ?? 'Artista não informado'} ·{' '}
                      {song.originalKey ?? 'Tom não informado'}
                    </small>
                  </span>
                </label>
              );
            })}
        </div>
      </section>

      {feedback ? (
        <p className={styles.success} role="status">
          {feedback}
        </p>
      ) : null}
      {errorMessage ? (
        <p className={styles.error} role="alert">
          {errorMessage}
        </p>
      ) : null}
      {errorMessage && errorMessage.includes('outro lugar') && detail ? (
        <button className={styles.reloadHint} type="button" onClick={() => setErrorMessage(null)}>
          Revisar versão atual
        </button>
      ) : null}

      <section className={styles.orderPanel} aria-labelledby="order-heading">
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="order-heading">Ordem do repertório</h2>
            <p>Arraste no desktop ou use os botões para tocar e teclado.</p>
          </div>
        </div>
        {detail.items.length === 0 ? (
          <p className={styles.emptyOrder}>Adicione músicas acima para montar a ordem.</p>
        ) : null}
        <ol
          className={styles.itemList}
          onPointerUp={finishPointerDrag}
          onPointerCancel={() => {
            setDraggingId(null);
            setPointerDraggingId(null);
            setPointerTargetIndex(null);
          }}
        >
          {detail.items.map((entry, index) => {
            const song = entry.song;
            const title = song?.title ?? 'Música removida';
            const artist = song?.artist ?? 'O arquivo original não está mais na biblioteca.';
            const displayedKey = entry.item.preferredKey ?? song?.preferredKey ?? song?.originalKey;
            return (
              <li
                className={`${styles.item} ${draggingId === entry.item.id ? styles.dragging : ''}`}
                data-testid="repertory-item"
                draggable
                key={entry.item.id}
                onDragStart={() => setDraggingId(entry.item.id)}
                onDragEnd={() => setDraggingId(null)}
                onDragOver={(event) => event.preventDefault()}
                onPointerEnter={() => {
                  if (pointerDraggingId) setPointerTargetIndex(index);
                }}
                onPointerMove={() => {
                  if (pointerDraggingId) setPointerTargetIndex(index);
                }}
                onDrop={() => {
                  if (draggingId && draggingId !== entry.item.id) {
                    const from = detail.items.findIndex((item) => item.item.id === draggingId);
                    void handleMove(draggingId, index);
                    setDraggingId(null);
                    if (from < 0) setErrorMessage('Não foi possível localizar o item arrastado.');
                  }
                }}
                onPointerUp={finishPointerDrag}
              >
                <span className={styles.position}>{index + 1}</span>
                <span
                  className={styles.dragHandle}
                  aria-label={`Arrastar ${title}`}
                  role="button"
                  tabIndex={0}
                  onPointerDown={(event) => handlePointerDown(event, entry.item.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowUp') {
                      event.preventDefault();
                      void handleMove(entry.item.id, index - 1);
                    }
                    if (event.key === 'ArrowDown') {
                      event.preventDefault();
                      void handleMove(entry.item.id, index + 1);
                    }
                  }}
                >
                  <GripVertical size={18} />
                </span>
                <span className={styles.itemInfo}>
                  <strong>{title}</strong>
                  <small>{artist}</small>
                  <span className={song ? styles.itemKey : styles.removedLabel}>
                    {song
                      ? `Tom: ${displayedKey ?? 'não informado'}`
                      : 'Música removida · item preservado'}
                  </span>
                </span>
                <label className={styles.itemTone}>
                  <span>Tom próprio</span>
                  <input
                    key={`${entry.item.id}-${entry.item.preferredKey ?? ''}`}
                    defaultValue={entry.item.preferredKey ?? ''}
                    placeholder={song?.originalKey ?? 'Tom'}
                    disabled={!song}
                    onBlur={(event) => void handleItemKey(entry.item.id, event.target.value)}
                  />
                </label>
                <div className={styles.itemActions}>
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => void handleMove(entry.item.id, index - 1)}
                  >
                    <ArrowUp size={16} />
                    <span className={styles.srOnly}>Subir {title}</span>
                  </button>
                  <button
                    type="button"
                    disabled={index === detail.items.length - 1}
                    onClick={() => void handleMove(entry.item.id, index + 1)}
                  >
                    <ArrowDown size={16} />
                    <span className={styles.srOnly}>Descer {title}</span>
                  </button>
                  <button type="button" onClick={() => void handleRemove(entry.item.id)}>
                    <Trash2 size={16} />
                    <span className={styles.srOnly}>Remover {title}</span>
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
