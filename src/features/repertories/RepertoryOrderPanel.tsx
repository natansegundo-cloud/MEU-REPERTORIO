import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type DragEvent, type PointerEvent } from 'react';

import { Button } from '@/components/ui/Button';
import type { RepertoryEntry } from '@/services';

import { ToneEditor } from './ToneEditor';
import styles from './RepertoryOrderPanel.module.css';

interface RepertoryOrderPanelProps {
  readonly items: readonly RepertoryEntry[];
  readonly busy: boolean;
  readonly onAdd: () => void;
  readonly onClearMessages: () => void;
  readonly onMove: (itemId: string, targetIndex: number) => Promise<void>;
  readonly onRemove: (itemId: string) => Promise<void>;
  readonly onSaveTone: (itemId: string, value: string) => Promise<boolean>;
}

interface DragState {
  readonly itemId: string;
  readonly source: 'mouse' | 'pointer';
  readonly targetIndex: number | null;
}

interface PointerDrag {
  readonly itemId: string;
  readonly pointerId: number;
  targetIndex: number | null;
}

export function RepertoryOrderPanel({
  items,
  busy,
  onAdd,
  onClearMessages,
  onMove,
  onRemove,
  onSaveTone,
}: RepertoryOrderPanelProps) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [editingToneId, setEditingToneId] = useState<string | null>(null);
  const pointerDragRef = useRef<PointerDrag | null>(null);
  const mouseDragRef = useRef<string | null>(null);
  const finishPointerDragRef = useRef<() => void>(() => undefined);

  const resetPointerDrag = useCallback((): void => {
    pointerDragRef.current = null;
    setDrag((current) => (current?.source === 'pointer' ? null : current));
  }, []);

  function handlePointerDown(event: PointerEvent<HTMLSpanElement>, itemId: string): void {
    if (busy || pointerDragRef.current) return;
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
    // O handle tem touch-action: none apenas nele; o restante da lista continua rolando.
    pointerDragRef.current = { itemId, pointerId: event.pointerId, targetIndex: null };
    setDrag({ itemId, source: 'pointer', targetIndex: null });
  }

  function handlePointerMove(event: PointerEvent<HTMLOListElement>): void {
    const pointer = pointerDragRef.current;
    if (!pointer || event.pointerId !== pointer.pointerId) return;
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
    pointer.targetIndex = targetIndex;
    setDrag((current) => (current?.source === 'pointer' ? { ...current, targetIndex } : current));
  }

  function finishPointerDrag(): void {
    const pointer = pointerDragRef.current;
    resetPointerDrag();
    if (!pointer || pointer.targetIndex === null) return;
    const from = items.findIndex((entry) => entry.item.id === pointer.itemId);
    if (from < 0 || from === pointer.targetIndex) return;
    void onMove(pointer.itemId, pointer.targetIndex);
  }

  useEffect(() => {
    finishPointerDragRef.current = finishPointerDrag;
  });

  const pointerDragging = drag?.source === 'pointer';
  useEffect(() => {
    if (!pointerDragging) return undefined;
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
  }, [pointerDragging, resetPointerDrag]);

  function handleMouseDragStart(event: DragEvent<HTMLSpanElement>, itemId: string): void {
    if (busy || pointerDragRef.current) {
      event.preventDefault();
      return;
    }
    mouseDragRef.current = itemId;
    setDrag({ itemId, source: 'mouse', targetIndex: null });
  }

  function handleMouseDragEnd(): void {
    mouseDragRef.current = null;
    setDrag((current) => (current?.source === 'mouse' ? null : current));
  }

  function handleDrop(event: DragEvent<HTMLLIElement>, targetIndex: number): void {
    event.preventDefault();
    const itemId = mouseDragRef.current;
    mouseDragRef.current = null;
    setDrag((current) => (current?.source === 'mouse' ? null : current));
    if (!itemId) return;
    const from = items.findIndex((entry) => entry.item.id === itemId);
    if (from < 0 || from === targetIndex) return;
    void onMove(itemId, targetIndex);
  }

  async function handleToneSave(itemId: string, value: string): Promise<boolean> {
    const saved = await onSaveTone(itemId, value);
    if (saved) {
      setEditingToneId((current) => (current === itemId ? null : current));
    }
    return saved;
  }

  const dropIndex = drag?.source === 'pointer' ? drag.targetIndex : null;

  return (
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
          disabled={busy}
          onClick={onAdd}
        >
          <Plus size={16} aria-hidden="true" />
          <span className={styles.addLabel}>Adicionar</span>
        </Button>
      </div>

      {items.length === 0 ? (
        <div className={styles.emptyOrder}>
          <p>Nenhuma música neste repertório ainda.</p>
          <span>Use “Adicionar” para escolher músicas da biblioteca.</span>
        </div>
      ) : null}

      <ol
        className={styles.itemList}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerDrag}
        onPointerCancel={resetPointerDrag}
      >
        {items.map((entry, index) => {
          const song = entry.song;
          const title = song?.title ?? 'Música removida';
          const artist = song?.artist ?? null;
          const displayedKey = entry.item.preferredKey ?? song?.preferredKey ?? song?.originalKey;
          return (
            <li
              className={`${styles.item} ${drag?.itemId === entry.item.id ? styles.dragging : ''} ${
                dropIndex === index ? styles.dropTarget : ''
              }`}
              data-testid="repertory-item"
              data-repertory-index={index}
              data-editing={editingToneId === entry.item.id || undefined}
              key={entry.item.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDrop(event, index)}
            >
              <span className={styles.position}>{index + 1}</span>
              <span
                className={styles.dragHandle}
                aria-label={`Arrastar ${title}`}
                draggable={!busy}
                role="button"
                tabIndex={0}
                onDragEnd={handleMouseDragEnd}
                onDragStart={(event) => handleMouseDragStart(event, entry.item.id)}
                onPointerDown={(event) => handlePointerDown(event, entry.item.id)}
                onKeyDown={(event) => {
                  if (busy) return;
                  if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    if (index > 0) void onMove(entry.item.id, index - 1);
                  }
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    if (index < items.length - 1) void onMove(entry.item.id, index + 1);
                  }
                }}
              >
                <GripVertical size={18} aria-hidden="true" />
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
                        disabled={busy}
                        aria-label={`Editar tom próprio de ${title} (atual: ${
                          displayedKey ?? 'tom da música'
                        })`}
                        onClick={() => {
                          onClearMessages();
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
                  disabled={busy || index === 0}
                  onClick={() => void onMove(entry.item.id, index - 1)}
                >
                  <ArrowUp size={16} aria-hidden="true" />
                  <span className={styles.srOnly}>Subir {title}</span>
                </button>
                <button
                  type="button"
                  disabled={busy || index === items.length - 1}
                  onClick={() => void onMove(entry.item.id, index + 1)}
                >
                  <ArrowDown size={16} aria-hidden="true" />
                  <span className={styles.srOnly}>Descer {title}</span>
                </button>
                <button type="button" disabled={busy} onClick={() => void onRemove(entry.item.id)}>
                  <Trash2 size={16} aria-hidden="true" />
                  <span className={styles.srOnly}>Remover {title}</span>
                </button>
              </div>
              {editingToneId === entry.item.id ? (
                <ToneEditor
                  title={title}
                  preferredKey={entry.item.preferredKey}
                  inheritedKey={song?.originalKey ?? null}
                  onSave={(value) => handleToneSave(entry.item.id, value)}
                  onCancel={() =>
                    setEditingToneId((current) => (current === entry.item.id ? null : current))
                  }
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
