import { useEffect, useRef, useState } from 'react';

import styles from './RepertoryOrderPanel.module.css';

interface ToneEditorProps {
  readonly title: string;
  readonly preferredKey: string | null;
  readonly inheritedKey: string | null;
  readonly onSave: (value: string) => Promise<boolean>;
  readonly onCancel: () => void;
}

/**
 * Editor inline do tom próprio. O valor digitado permanece no componente
 * enquanto a gravação não é confirmada, para não perder a alteração em caso
 * de tom inválido ou conflito de revisão.
 */
export function ToneEditor({
  title,
  preferredKey,
  inheritedKey,
  onSave,
  onCancel,
}: ToneEditorProps) {
  const [draft, setDraft] = useState(preferredKey ?? '');
  const cancelledRef = useRef(false);
  const savingRef = useRef(false);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    inputRef.current?.focus();
    return () => {
      const previous = previousFocusRef.current;
      if (!previous?.isConnected || previous === document.body) return;
      const active = document.activeElement;
      // Só devolve o foco se ele não foi para outro controle de propósito
      // (por exemplo, ao trocar para o tom de outra música).
      if (!active || active === document.body || !active.isConnected) previous.focus();
    };
  }, []);

  function commit(): void {
    if (cancelledRef.current || savingRef.current) return;
    const value = draft.trim();
    if (value === (preferredKey ?? '')) {
      onCancel();
      return;
    }
    savingRef.current = true;
    void onSave(value)
      .catch(() => false)
      .finally(() => {
        savingRef.current = false;
      });
  }

  return (
    <div className={styles.toneEditor}>
      <label>
        <span>Tom próprio</span>
        <input
          ref={inputRef}
          aria-label={`Tom próprio de ${title}`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={inheritedKey ?? 'Tom'}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commit();
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              if (savingRef.current) return;
              cancelledRef.current = true;
              onCancel();
            }
          }}
        />
      </label>
      <span className={styles.toneHint}>Vazio usa o tom da música</span>
    </div>
  );
}
