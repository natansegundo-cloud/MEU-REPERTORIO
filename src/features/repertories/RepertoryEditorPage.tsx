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
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';

import { Button } from '@/components/ui/Button';
import {
  addSongsToRepertory,
  removeRepertoryItem,
  renameRepertory,
  reorderRepertoryItem,
  updateRepertoryItemKey,
} from '@/services';

import { AddSongsDialog } from './AddSongsDialog';
import { useRepertoryDetail } from './useRepertories';
import styles from './RepertoryEditorPage.module.css';

interface RepertoryEditorPageProps {
  readonly repertoryId: string;
  readonly onBack: () => void;
  readonly onOpenShow: (itemId?: string) => void;
}

const REVISION_CONFLICT_MESSAGE =
  'Este repertório foi alterado em outro dispositivo ou aba. Atualize a versão antes de tentar novamente.';

function isRevisionConflict(cause: unknown): boolean {
  return cause instanceof Error && cause.name === 'RepertoryRevisionConflictError';
}

export function RepertoryEditorPage({ repertoryId, onBack, onOpenShow }: RepertoryEditorPageProps) {
  const { data: detail, loading, error, refresh } = useRepertoryDetail(repertoryId);
  const [addOpen, setAddOpen] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [editingToneId, setEditingToneId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const restoreNameFocusRef = useRef(false);
  const skipToneCommitRef = useRef(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [pointerDraggingId, setPointerDraggingId] = useState<string | null>(null);
  const [pointerTargetIndex, setPointerTargetIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [revisionConflict, setRevisionConflict] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const pendingActionRef = useRef(false);
  const pointerDragRef = useRef<{
    itemId: string;
    pointerId: number;
    targetIndex: number | null;
  } | null>(null);
  const finishPointerDragRef = useRef<() => void>(() => undefined);

  function clearMessages(): void {
    setFeedback(null);
    setErrorMessage(null);
    setRevisionConflict(false);
  }

  function describeActionError(cause: unknown, fallback: string): string {
    if (isRevisionConflict(cause)) {
      setRevisionConflict(true);
      return REVISION_CONFLICT_MESSAGE;
    }
    setRevisionConflict(false);
    return cause instanceof Error ? cause.message : fallback;
  }

  function startAction(action: string): boolean {
    if (pendingActionRef.current) return false;
    pendingActionRef.current = true;
    setPendingAction(action);
    return true;
  }

  function finishAction(): void {
    pendingActionRef.current = false;
    setPendingAction(null);
  }

  async function handleRename(): Promise<void> {
    if (!detail || !startAction('rename')) return;
    clearMessages();
    try {
      await renameRepertory(detail.repertory.id, nameDraft, detail.repertory.revision);
      restoreNameFocusRef.current = true;
      setEditingName(false);
      setFeedback('Nome do repertório atualizado.');
    } catch (cause: unknown) {
      setErrorMessage(describeActionError(cause, 'Não foi possível renomear o repertório.'));
    } finally {
      finishAction();
    }
  }

  function openAddDialog(): void {
    clearMessages();
    setAddError(null);
    setAddOpen(true);
  }

  function closeAddDialog(): void {
    setAddOpen(false);
    setAddError(null);
  }

  async function handleAddSongs(songIds: readonly string[]): Promise<void> {
    if (!detail || songIds.length === 0 || !startAction('add')) return;
    clearMessages();
    setAddError(null);
    try {
      await addSongsToRepertory(detail.repertory.id, songIds, detail.repertory.revision);
      closeAddDialog();
      setFeedback('Músicas adicionadas ao repertório.');
    } catch (cause: unknown) {
      const message = describeActionError(cause, 'Não foi possível adicionar as músicas.');
      setErrorMessage(message);
      setAddError(message);
    } finally {
      finishAction();
    }
  }

  async function handleMove(itemId: string, targetIndex: number): Promise<void> {
    if (!detail || !startAction('move')) return;
    clearMessages();
    try {
      await reorderRepertoryItem(
        detail.repertory.id,
        itemId,
        targetIndex,
        detail.repertory.revision,
      );
    } catch (cause: unknown) {
      setErrorMessage(describeActionError(cause, 'Não foi possível reordenar o repertório.'));
    } finally {
      finishAction();
    }
  }

  async function handleRemove(itemId: string): Promise<void> {
    const entry = detail?.items.find((candidate) => candidate.item.id === itemId);
    const title = entry?.song?.title ?? 'esta música';
    if (!window.confirm(`Remover “${title}” deste repertório?`)) return;
    if (!startAction('remove')) return;

    clearMessages();
    try {
      await removeRepertoryItem(itemId);
      setFeedback('Música removida do repertório.');
    } catch (cause: unknown) {
      setErrorMessage(describeActionError(cause, 'Não foi possível remover a música.'));
    } finally {
      finishAction();
    }
  }

  async function handleItemKey(itemId: string, value: string): Promise<void> {
    clearMessages();
    try {
      await updateRepertoryItemKey(itemId, value);
      setFeedback('Tom próprio atualizado.');
    } catch (cause: unknown) {
      setErrorMessage(describeActionError(cause, 'Não foi possível salvar o tom próprio.'));
    }
  }

  const resetPointerDrag = useCallback((): void => {
    pointerDragRef.current = null;
    setDraggingId(null);
    setPointerDraggingId(null);
    setPointerTargetIndex(null);
  }, []);

  function handlePointerDown(event: PointerEvent<HTMLSpanElement>, itemId: string): void {
    if (pendingActionRef.current) return;
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
    if (pointerDragRef.current) return;
    // O handle tem touch-action: none apenas nele; o restante da lista continua rolando.
    pointerDragRef.current = { itemId, pointerId: event.pointerId, targetIndex: null };
    setDraggingId(itemId);
    setPointerDraggingId(itemId);
    setPointerTargetIndex(null);
  }

  function handlePointerMove(event: PointerEvent<HTMLOListElement>): void {
    const drag = pointerDragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const targetElement =
      (event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-repertory-index]')
        : null) ??
      [...event.currentTarget.querySelectorAll<HTMLElement>('[data-repertory-index]')].find(
        (element) => {
          const rect = element.getBoundingClientRect();
          return event.clientY >= rect.top && event.clientY <= rect.bottom;
        },
      );
    const targetIndex = Number(targetElement?.dataset.repertoryIndex);
    if (!Number.isInteger(targetIndex)) return;
    drag.targetIndex = targetIndex;
    setPointerTargetIndex(targetIndex);
  }

  function finishPointerDrag(): void {
    const drag = pointerDragRef.current;
    const items = detail?.items;
    resetPointerDrag();
    if (!drag || !items || drag.targetIndex === null) return;
    const from = items.findIndex((entry) => entry.item.id === drag.itemId);
    if (from < 0 || from === drag.targetIndex) return;
    void handleMove(drag.itemId, drag.targetIndex);
  }

  useEffect(() => {
    finishPointerDragRef.current = finishPointerDrag;
  });

  useEffect(() => {
    if (!pointerDraggingId) return undefined;
    function handleFinish(): void {
      finishPointerDragRef.current();
    }
    function handleCancel(): void {
      resetPointerDrag();
    }
    window.addEventListener('pointerup', handleFinish);
    window.addEventListener('pointercancel', handleCancel);
    return () => {
      window.removeEventListener('pointerup', handleFinish);
      window.removeEventListener('pointercancel', handleCancel);
    };
  }, [pointerDraggingId, resetPointerDrag]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timeoutId = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

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

      <header className={styles.header}>
        <div className={styles.heading}>
          {editingName ? (
            <div className={styles.titleEdit}>
              <input
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleRename();
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    restoreNameFocusRef.current = true;
                    setEditingName(false);
                  }
                }}
                autoFocus
              />
              <Button
                size="sm"
                onClick={() => void handleRename()}
                disabled={pendingAction !== null}
              >
                <Save size={15} /> {pendingAction === 'rename' ? 'Salvando…' : 'Salvar'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  restoreNameFocusRef.current = true;
                  setEditingName(false);
                }}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <div className={styles.titleLine}>
              <h1 className={styles.title}>{detail.repertory.name}</h1>
              <button
                ref={(node) => {
                  if (!node || !restoreNameFocusRef.current) return;
                  restoreNameFocusRef.current = false;
                  node.focus();
                }}
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
        <Button size="sm" onClick={() => onOpenShow()} disabled={detail.items.length === 0}>
          <Play size={16} /> Tocar
        </Button>
      </header>

      {feedback ? (
        <p className={styles.success} role="status">
          {feedback}
        </p>
      ) : null}
      {errorMessage ? (
        <div className={styles.alert} role="alert">
          <span>{errorMessage}</span>
          {revisionConflict ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                refresh();
                clearMessages();
              }}
            >
              Atualizar versão
            </Button>
          ) : null}
        </div>
      ) : null}

      <section className={styles.orderPanel} aria-labelledby="order-heading">
        <div className={styles.sectionHeading}>
          <div className={styles.sectionTitle}>
            <h2 id="order-heading">Músicas do repertório</h2>
            <span className={styles.orderHint}>Arraste pelo ícone para reordenar</span>
          </div>
          <Button
            className={styles.addButton}
            size="sm"
            variant="secondary"
            aria-label="Adicionar músicas"
            onClick={openAddDialog}
          >
            <Plus size={16} aria-hidden="true" />
            <span className={styles.addLabel}>Adicionar</span>
          </Button>
        </div>
        {detail.items.length === 0 ? (
          <div className={styles.emptyOrder}>
            <p>Nenhuma música neste repertório ainda.</p>
            <span>Use “Adicionar” para escolher músicas da biblioteca.</span>
          </div>
        ) : null}
        <ol
          className={styles.itemList}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPointerDrag}
          onPointerCancel={() => resetPointerDrag()}
        >
          {detail.items.map((entry, index) => {
            const song = entry.song;
            const title = song?.title ?? 'Música removida';
            const artist = song?.artist ?? null;
            const displayedKey = entry.item.preferredKey ?? song?.preferredKey ?? song?.originalKey;
            return (
              <li
                className={`${styles.item} ${draggingId === entry.item.id ? styles.dragging : ''} ${
                  pointerDraggingId && pointerTargetIndex === index ? styles.dropTarget : ''
                }`}
                data-testid="repertory-item"
                data-repertory-index={index}
                data-editing={editingToneId === entry.item.id || undefined}
                draggable
                key={entry.item.id}
                onDragStart={() => setDraggingId(entry.item.id)}
                onDragEnd={() => setDraggingId(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggingId && draggingId !== entry.item.id) {
                    const from = detail.items.findIndex((item) => item.item.id === draggingId);
                    void handleMove(draggingId, index);
                    setDraggingId(null);
                    if (from < 0) setErrorMessage('Não foi possível localizar o item arrastado.');
                  }
                }}
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
                  <span className={styles.itemMeta}>
                    {song ? (
                      <>
                        {artist ? <small>{artist}</small> : null}
                        <button
                          type="button"
                          className={styles.toneChip}
                          data-custom={entry.item.preferredKey ? 'true' : undefined}
                          aria-label={`Editar tom próprio de ${title}`}
                          onClick={() => {
                            clearMessages();
                            skipToneCommitRef.current = false;
                            setEditingToneId(entry.item.id);
                          }}
                        >
                          Tom: {displayedKey ?? '—'}
                        </button>
                      </>
                    ) : (
                      <small className={styles.removedLabel}>
                        O arquivo original não está mais na biblioteca.
                      </small>
                    )}
                  </span>
                </span>
                <div className={styles.itemActions}>
                  <button
                    type="button"
                    disabled={pendingAction !== null || index === 0}
                    onClick={() => void handleMove(entry.item.id, index - 1)}
                  >
                    <ArrowUp size={16} />
                    <span className={styles.srOnly}>Subir {title}</span>
                  </button>
                  <button
                    type="button"
                    disabled={pendingAction !== null || index === detail.items.length - 1}
                    onClick={() => void handleMove(entry.item.id, index + 1)}
                  >
                    <ArrowDown size={16} />
                    <span className={styles.srOnly}>Descer {title}</span>
                  </button>
                  <button
                    type="button"
                    disabled={pendingAction !== null}
                    onClick={() => void handleRemove(entry.item.id)}
                  >
                    <Trash2 size={16} />
                    <span className={styles.srOnly}>Remover {title}</span>
                  </button>
                </div>
                {editingToneId === entry.item.id ? (
                  <div className={styles.toneEditor}>
                    <label>
                      <span>Tom próprio</span>
                      <input
                        key={`${entry.item.id}-${entry.item.preferredKey ?? ''}`}
                        aria-label={`Tom próprio de ${title}`}
                        defaultValue={entry.item.preferredKey ?? ''}
                        placeholder={song?.originalKey ?? 'Tom'}
                        autoFocus
                        onBlur={(event) => {
                          if (skipToneCommitRef.current) {
                            skipToneCommitRef.current = false;
                            return;
                          }
                          setEditingToneId(null);
                          void handleItemKey(entry.item.id, event.target.value);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            event.currentTarget.blur();
                          }
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            skipToneCommitRef.current = true;
                            setEditingToneId(null);
                          }
                        }}
                      />
                    </label>
                    <span className={styles.toneHint}>Vazio usa o tom da música</span>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      </section>

      {addOpen ? (
        <AddSongsDialog
          existingSongIds={existingSongIds}
          adding={pendingAction === 'add'}
          error={addError}
          onClose={closeAddDialog}
          onAdd={(songIds) => void handleAddSongs(songIds)}
        />
      ) : null}
    </div>
  );
}
