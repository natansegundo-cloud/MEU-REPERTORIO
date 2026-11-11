import { ListMusic, Plus } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { addSongsToRepertory, observeRepertories, type RepertorySummary } from '@/services';

import styles from './SongViewPage.module.css';

interface RepertoryPickerProps {
  readonly songId: string;
}

export function RepertoryPicker({ songId }: RepertoryPickerProps) {
  const [open, setOpen] = useState(false);
  const [repertories, setRepertories] = useState<readonly RepertorySummary[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const subscription = observeRepertories().subscribe({
      next: (items) => setRepertories(items),
      error: () => setError('Não foi possível carregar os repertórios.'),
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const root = rootRef.current;

    function handlePointerDown(event: PointerEvent): void {
      if (root && !root.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    const firstControl =
      panelRef.current?.querySelector<HTMLElement>('select, button:not(:disabled)') ??
      panelRef.current;
    firstControl?.focus();

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      const trigger = root?.querySelector<HTMLButtonElement>('button[aria-expanded]');
      if (trigger?.isConnected) trigger.focus();
    };
  }, [open]);

  async function handleAdd(): Promise<void> {
    const repertory = repertories.find((item) => item.id === selectedId);
    if (!repertory) return;
    setFeedback(null);
    setError(null);
    try {
      await addSongsToRepertory(repertory.id, [songId], repertory.revision);
      setFeedback(`Adicionada a “${repertory.name}”.`);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível adicionar a música.');
    }
  }

  return (
    <div ref={rootRef} className={styles.repertoryPicker}>
      <Button
        variant="ghost"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
      >
        <ListMusic size={17} />
        Adicionar a um repertório
      </Button>
      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          className={styles.repertoryPickerPanel}
          role="dialog"
          aria-label="Adicionar a um repertório"
          tabIndex={-1}
        >
          {repertories.length > 0 ? (
            <>
              <label>
                <span>Escolha um repertório</span>
                <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
                  <option value="">Selecionar…</option>
                  {repertories.map((repertory) => (
                    <option value={repertory.id} key={repertory.id}>
                      {repertory.name}
                    </option>
                  ))}
                </select>
              </label>
              <Button size="sm" onClick={() => void handleAdd()} disabled={!selectedId}>
                <Plus size={15} /> Adicionar
              </Button>
            </>
          ) : (
            <p>Crie um repertório na aba Repertórios para adicioná-la.</p>
          )}
          {feedback ? (
            <span className={styles.pickerSuccess} role="status">
              {feedback}
            </span>
          ) : null}
          {error ? (
            <span className={styles.pickerError} role="alert">
              {error}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
