import { Copy, ListMusic, Pencil, Play, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';

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
  const { data: repertories, loading, error } = useRepertories(query);

  async function handleCreate(): Promise<void> {
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
    }
  }

  async function handleRename(repertory: RepertorySummary): Promise<void> {
    setFeedback(null);
    setErrorMessage(null);
    try {
      await renameRepertory(repertory.id, editingName, repertory.revision);
      setEditingId(null);
      setFeedback('Nome do repertório atualizado.');
    } catch (cause: unknown) {
      setErrorMessage(
        cause instanceof Error ? cause.message : 'Não foi possível renomear o repertório.',
      );
    }
  }

  async function handleDuplicate(repertory: RepertorySummary): Promise<void> {
    setFeedback(null);
    setErrorMessage(null);
    try {
      const copy = await duplicateRepertory(repertory.id);
      setFeedback(`“${copy.name}” duplicado.`);
    } catch (cause: unknown) {
      setErrorMessage(
        cause instanceof Error ? cause.message : 'Não foi possível duplicar o repertório.',
      );
    }
  }

  async function handleDelete(): Promise<void> {
    if (!pendingDelete) return;
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
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Meu repertório</p>
          <h1 className={styles.title}>Repertórios</h1>
          <p className={styles.description}>Organize a ordem das músicas para cada apresentação.</p>
        </div>
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
        <Button onClick={() => void handleCreate()} disabled={!name.trim()}>
          <Plus size={17} />
          Criar repertório
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
        <span className={styles.count}>{repertories.length} repertórios</span>
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
                      autoFocus
                    />
                  </label>
                  <Button size="sm" onClick={() => void handleRename(repertory)}>
                    Salvar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
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
                    type="button"
                    onClick={() => {
                      setEditingId(repertory.id);
                      setEditingName(repertory.name);
                    }}
                  >
                    <Pencil size={16} />
                    <span className={styles.srOnly}>Renomear {repertory.name}</span>
                  </button>
                  <button type="button" onClick={() => void handleDuplicate(repertory)}>
                    <Copy size={16} />
                    <span className={styles.srOnly}>Duplicar {repertory.name}</span>
                  </button>
                  <button type="button" onClick={() => setPendingDelete(repertory)}>
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
                  <Button size="sm" variant="secondary" onClick={() => setPendingDelete(null)}>
                    Manter
                  </Button>
                  <Button size="sm" onClick={() => void handleDelete()}>
                    Excluir
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
