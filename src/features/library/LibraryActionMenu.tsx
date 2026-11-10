import { FileStack, ListMusic, Music2, Plus, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import styles from './LibraryActionMenu.module.css';

interface LibraryActionMenuProps {
  readonly onAddSong: () => void;
  readonly onImportBatch: () => void;
  readonly onCreateRepertory: () => void;
}

export function LibraryActionMenu({
  onAddSong,
  onImportBatch,
  onCreateRepertory,
}: LibraryActionMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent): void {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    firstItemRef.current?.focus();

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function runAction(action: () => void): void {
    setOpen(false);
    action();
  }

  return (
    <div ref={rootRef} className={styles.root}>
      <div
        id={menuId}
        className={styles.menu}
        data-open={open}
        role="menu"
        aria-label="Adicionar conteúdo"
        aria-hidden={!open}
      >
        <button
          ref={firstItemRef}
          className={styles.menuItem}
          type="button"
          role="menuitem"
          onClick={() => runAction(onAddSong)}
        >
          <Music2 size={17} aria-hidden="true" />
          <span>Adicionar música</span>
        </button>
        <button
          className={styles.menuItem}
          type="button"
          role="menuitem"
          onClick={() => runAction(onImportBatch)}
        >
          <FileStack size={17} aria-hidden="true" />
          <span>Importar em lote</span>
        </button>
        <button
          className={styles.menuItem}
          type="button"
          role="menuitem"
          onClick={() => runAction(onCreateRepertory)}
        >
          <ListMusic size={17} aria-hidden="true" />
          <span>Criar repertório</span>
        </button>
      </div>

      <button
        ref={triggerRef}
        className={styles.trigger}
        type="button"
        aria-label={open ? 'Fechar ações' : 'Adicionar conteúdo'}
        aria-controls={menuId}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? (
          <X size={21} strokeWidth={2.2} aria-hidden="true" />
        ) : (
          <Plus size={22} strokeWidth={2.2} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
