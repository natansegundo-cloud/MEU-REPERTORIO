import { Copy, ListMusic, Pencil, Play, Plus, Search, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { Button } from '@/components/ui/Button';
import {
  createRepertory,
  duplicateRepertory,
  renameRepertory,
  softDeleteRepertory,
  type RepertorySummary,
} from '@/services';

import { LibraryTabs } from '@/features/library/LibraryTabs';
import { useRepertories } from './useRepertories';
import styles from './RepertoriesPage.module.css';

interface RepertoriesPageProps {
  readonly onOpenSongs: () => void;
  readonly onOpenRepertory: (id: string) => void;
  readonly onOpenShow: (id: string) => void;
}

export function RepertoriesPage({
  onOpenSongs,
  onOpenRepertory,
  onOpenShow,
}: RepertoriesPageProps) {
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [pendingDelete, setPendingDelete] = useState<RepertorySummary | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const pendingActionRef = useRef<string | null>(null);
  const focusRenameIdRef = useRef<string | null>(null);
  const { data: repertories, loading, error } = useRepertories(query);

  function cancelRename(repertoryId: string): void {
    focusRenameIdRef.current = repertoryId;
    setEditingId(null);
  }

  function startAction(action: string): boolean {
    if (pendingActionRef.current) return false;
    pendingActionRef.current = action;
    setPendingAction(action);
    return true;
  }

  function finishAction(): void {
    pendingActionRef.current = null;
    setPendingAction(null);
  }

  async function handleCreate(): Promise<void> {
    if (!startAction('create')) return;
    setFeedback(null);
    setErrorMessage(null);
    try {
      const repertory = await createRepertory(name);
      setName('');
      setFeedback(`“${repertory.name}” criado.`);
    } catch (cause: unknown) {
      setErrorMessage(
        cause instanceof Error ? cause.message : 'Não foi possível criar o repertório.',
      );
    } finally {
      finishAction();
    }
  }

  async function handleRename(repertory: RepertorySummary): Promise<void> {
    if (!startAction(`rename:${repertory.id}`)) return;
    setFeedback(null);
    setErrorMessage(null);
    try {
      await renameRepertory(repertory.id, editingName, repertory.revision);
      cancelRename(repertory.id);
      setFeedback('Nome do repertório atualizado.');
    } catch (cause: unknown) {
      setErrorMessage(
        cause instanceof Error ? cause.message : 'Não foi possível renomear o repertório.',
      );
    } finally {
      finishAction();
    }
  }

  async function handleDuplicate(repertory: RepertorySummary): Promise<void> {
    if (!startAction(`duplicate:${repertory.id}`)) return;
    setFeedback(null);
    setErrorMessage(null);
    try {
      const copy = await duplicateRepertory(repertory.id);
      setFeedback(`“${copy.name}” duplicado.`);
    } catch (cause: unknown) {
      setErrorMessage(
        cause instanceof Error ? cause.message : 'Não foi possível duplicar o repertório.',
      );
    } finally {
      finishAction();
    }
  }

  async function handleDelete(): Promise<void> {
    if (!pendingDelete || !startAction(`delete:${pendingDelete.id}`)) return;
    setFeedback(null);
    setErrorMessage(null);
    try {
      await softDeleteRepertory(pendingDelete.id, pendingDelete.revision);
      setFeedback(`“${pendingDelete.name}” excluído.`);
      setPendingDelete(null);
    } catch (cause: unknown) {
      setErrorMessage(
        cause instanceof Error ? cause.message : 'Não foi possível excluir o repertório.',
      );
    } finally {
      finishAction();
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Repertórios</h1>
        <span className={styles.count}>
          {repertories.length} {repertories.length === 1 ? 'repertório' : 'repertórios'}
        </span>
      </header>

      <LibraryTabs
        active="repertories"
        onChange={(tab) => {
          if (tab === 'songs') onOpenSongs();
        }}
      />

      <section className={styles.createPanel} aria-label="Criar repertório">
        <label className={styles.createField}>
          <span>Novo repertório</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void handleCreate();
            }}
            placeholder="Ex.: Set acústico de sábado"
          />
        </label>
        <Button
          onClick={() => void handleCreate()}
          disabled={!name.trim() || pendingAction !== null}
        >
          <Plus size={17} />
          {pendingAction === 'create' ? 'Criando…' : 'Criar repertório'}
        </Button>
      </section>

      <section className={styles.toolbar} aria-label="Ferramentas de repertórios">
        <label className={styles.search}>
          <Search size={18} aria-hidden="true" />
          <span className={styles.srOnly}>Pesquisar repertórios</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pesquisar repertórios"
          />
        </label>
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
      {loading ? <p className={styles.feedback}>Carregando repertórios…</p> : null}
      {error ? (
        <p className={styles.error}>Não foi possível carregar os repertórios locais.</p>
      ) : null}

      {!loading && !error && repertories.length === 0 ? (
        query ? (
          <p className={styles.feedback}>Nenhum repertório corresponde à sua pesquisa.</p>
        ) : (
          <EmptyState
            icon={ListMusic}
            badge="Setlists offline"
            title="Crie seu primeiro repertório"
            description="Monte uma sequência de músicas para cada apresentação e ajuste a ordem quando quiser."
          />
        )
      ) : null}

      {!loading && !error && repertories.length > 0 ? (
        <div className={styles.list} aria-label="Repertórios cadastrados">
          {repertories.map((repertory) => (
            <article className={styles.card} data-testid="repertory-card" key={repertory.id}>
              {editingId === repertory.id ? (
                <div className={styles.renameForm}>
                  <label>
                    <span className={styles.srOnly}>Novo nome de {repertory.name}</span>
                    <input
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void handleRename(repertory);
                        }
                        if (event.key === 'Escape') {
                          event.preventDefault();
                          cancelRename(repertory.id);
                        }
                      }}
                      autoFocus
                    />
                  </label>
                  <Button
                    size="sm"
                    onClick={() => void handleRename(repertory)}
                    disabled={pendingAction !== null}
                  >
                    {pendingAction === `rename:${repertory.id}` ? 'Salvando…' : 'Salvar'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => cancelRename(repertory.id)}
                    disabled={pendingAction !== null}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <button
                  className={styles.cardMain}
                  type="button"
                  onClick={() => onOpenRepertory(repertory.id)}
                >
                  <span className={styles.cardIcon}>
                    <ListMusic size={19} />
                  </span>
                  <span className={styles.cardText}>
                    <strong>{repertory.name}</strong>
                    <small>
                      {repertory.songCount} {repertory.songCount === 1 ? 'música' : 'músicas'}
                    </small>
                  </span>
                </button>
              )}
              {editingId !== repertory.id ? (
                <div className={styles.cardActions}>
                  <button type="button" onClick={() => onOpenShow(repertory.id)}>
                    <Play size={16} />
                    <span className={styles.srOnly}>Tocar {repertory.name}</span>
                  </button>
                  <button
                    ref={(node) => {
                      if (!node) return;
                      if (focusRenameIdRef.current === repertory.id) {
                        focusRenameIdRef.current = null;
                        node.focus();
                      }
                    }}
                    type="button"
                    disabled={pendingAction !== null}
                    onClick={() => {
                      setEditingId(repertory.id);
                      setEditingName(repertory.name);
                    }}
                  >
                    <Pencil size={16} />
                    <span className={styles.srOnly}>Renomear {repertory.name}</span>
                  </button>
                  <button
                    type="button"
                    disabled={pendingAction !== null}
                    onClick={() => void handleDuplicate(repertory)}
                  >
                    <Copy size={16} />
                    <span className={styles.srOnly}>Duplicar {repertory.name}</span>
                  </button>
                  <button
                    type="button"
                    disabled={pendingAction !== null}
                    onClick={() => setPendingDelete(repertory)}
                  >
                    <Trash2 size={16} />
                    <span className={styles.srOnly}>Excluir {repertory.name}</span>
                  </button>
                </div>
              ) : null}
              {pendingDelete?.id === repertory.id ? (
                <div
                  className={styles.confirmation}
                  role="group"
                  aria-label={`Confirmar exclusão de ${repertory.name}`}
                >
                  <span>Excluir este repertório?</span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setPendingDelete(null)}
                    disabled={pendingAction !== null}
                  >
                    Manter
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void handleDelete()}
                    disabled={pendingAction !== null}
                  >
                    {pendingAction === `delete:${repertory.id}` ? 'Excluindo…' : 'Excluir'}
                  </Button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
