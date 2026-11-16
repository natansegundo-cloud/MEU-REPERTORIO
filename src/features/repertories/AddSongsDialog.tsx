import { Search, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { useSongs } from '@/features/library/useSongs';
import { lockBodyScroll } from '@/utils/scroll-lock';

import styles from './AddSongsDialog.module.css';

interface AddSongsDialogProps {
  readonly existingSongIds: ReadonlySet<string>;
  readonly adding: boolean;
  readonly error: string | null;
  readonly onClose: () => void;
  readonly onAdd: (songIds: readonly string[]) => void;
}

const FOCUSABLE =
  'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]';

export function AddSongsDialog({
  existingSongIds,
  adding,
  error,
  onClose,
  onAdd,
}: AddSongsDialogProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<readonly string[]>([]);
  const { data: songs, loading } = useSongs(query);
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const releaseScrollLock = lockBodyScroll();
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    searchRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (element) => element.offsetParent !== null,
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      releaseScrollLock();
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, []);

  const available = songs.filter((song) => !existingSongIds.has(song.id));

  function toggle(songId: string): void {
    setSelected((current) =>
      current.includes(songId) ? current.filter((id) => id !== songId) : [...current, songId],
    );
  }

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={panelRef}
      >
        <header className={styles.header}>
          <div className={styles.heading}>
            <h2 className={styles.title} id={titleId}>
              Adicionar músicas
            </h2>
            <p className={styles.subtitle}>Escolha uma ou mais músicas da biblioteca.</p>
          </div>
          <button className={styles.close} type="button" aria-label="Fechar" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <label className={styles.search}>
          <Search size={16} aria-hidden="true" />
          <span className={styles.srOnly}>Pesquisar músicas para adicionar</span>
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pesquisar por título, artista ou tom"
          />
        </label>

        <div className={styles.list} role="group" aria-label="Músicas disponíveis">
          {loading ? <p className={styles.empty}>Carregando músicas…</p> : null}
          {!loading && songs.length === 0 ? (
            <p className={styles.empty}>
              {query
                ? 'Nenhuma música encontrada para esta busca.'
                : 'Sua biblioteca ainda está vazia. Importe músicas para montar repertórios.'}
            </p>
          ) : null}
          {!loading && songs.length > 0 && available.length === 0 ? (
            <p className={styles.empty}>
              {query
                ? 'Nenhuma música disponível para esta busca.'
                : 'Todas as músicas da biblioteca já estão neste repertório.'}
            </p>
          ) : null}
          {available.map((song) => {
            const checked = selected.includes(song.id);
            return (
              <label className={styles.option} key={song.id} data-checked={checked || undefined}>
                <input type="checkbox" checked={checked} onChange={() => toggle(song.id)} />
                <span className={styles.optionText}>
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

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        <footer className={styles.footer}>
          <span className={styles.selection} role="status">
            {selected.length === 0
              ? 'Nenhuma selecionada'
              : `${selected.length} ${selected.length === 1 ? 'selecionada' : 'selecionadas'}`}
          </span>
          <div className={styles.footerActions}>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={adding}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => onAdd(selected)}
              disabled={selected.length === 0 || adding}
            >
              {adding
                ? 'Adicionando…'
                : selected.length > 0
                  ? `Adicionar (${selected.length})`
                  : 'Adicionar'}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
