import { ArrowLeft, Play, Save } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import {
  addSongsToRepertory,
  removeRepertoryItem,
  renameRepertory,
  reorderRepertoryItem,
  updateRepertoryItemKey,
} from '@/services';

import { AddSongsDialog } from './AddSongsDialog';
import { RepertoryOrderPanel } from './RepertoryOrderPanel';
import { useRepertoryDetail } from './useRepertories';
import styles from './RepertoryEditorPage.module.css';

interface RepertoryEditorPageProps {
  readonly repertoryId: string;
  readonly onBack: () => void;
  readonly onOpenShow: (itemId?: string) => void;
}

interface EditorNotice {
  readonly message: string;
  readonly conflict: boolean;
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
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const restoreNameFocusRef = useRef(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [notice, setNotice] = useState<EditorNotice | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const pendingActionRef = useRef(false);

  function clearMessages(): void {
    setFeedback(null);
    setNotice(null);
  }

  function describeActionError(cause: unknown, fallback: string): EditorNotice {
    return isRevisionConflict(cause)
      ? { message: REVISION_CONFLICT_MESSAGE, conflict: true }
      : {
          message: cause instanceof Error ? cause.message : fallback,
          conflict: false,
        };
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
    if (!detail) return;
    const name = nameDraft.trim();
    if (name === detail.repertory.name) {
      restoreNameFocusRef.current = true;
      setEditingName(false);
      return;
    }
    if (!startAction('rename')) return;

    clearMessages();
    try {
      await renameRepertory(detail.repertory.id, name, detail.repertory.revision);
      restoreNameFocusRef.current = true;
      setEditingName(false);
      setFeedback('Nome do repertório atualizado.');
    } catch (cause: unknown) {
      setNotice(describeActionError(cause, 'Não foi possível renomear o repertório.'));
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
      const actionError = describeActionError(cause, 'Não foi possível adicionar as músicas.');
      if (actionError.conflict) {
        // O conflito precisa ser resolvido na página; o diálogo sairia da frente do alerta.
        closeAddDialog();
        setNotice(actionError);
      } else {
        // Erros comuns pertencem ao diálogo e não devem ser anunciados duas vezes.
        setAddError(actionError.message);
      }
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
      setNotice(describeActionError(cause, 'Não foi possível reordenar o repertório.'));
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
      setNotice(describeActionError(cause, 'Não foi possível remover a música.'));
    } finally {
      finishAction();
    }
  }

  async function handleItemKey(itemId: string, value: string): Promise<boolean> {
    clearMessages();
    try {
      await updateRepertoryItemKey(itemId, value);
      setFeedback('Tom próprio atualizado.');
      return true;
    } catch (cause: unknown) {
      setNotice(describeActionError(cause, 'Não foi possível salvar o tom próprio.'));
      return false;
    }
  }

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
                aria-label="Nome do repertório"
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
      {notice ? (
        <div className={styles.alert} role="alert">
          <span>{notice.message}</span>
          {notice.conflict ? (
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

      <RepertoryOrderPanel
        items={detail.items}
        busy={pendingAction !== null}
        onAdd={openAddDialog}
        onClearMessages={clearMessages}
        onMove={handleMove}
        onRemove={handleRemove}
        onSaveTone={handleItemKey}
      />

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
