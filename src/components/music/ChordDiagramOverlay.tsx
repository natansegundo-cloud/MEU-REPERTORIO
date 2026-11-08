import { useEffect, useId, useRef } from 'react';

import { ChordDiagram } from './ChordDiagram';
import styles from './ChordDiagramOverlay.module.css';

interface ChordDiagramOverlayProps {
  readonly symbol: string;
  readonly onClose: () => void;
}

export function ChordDiagramOverlay({ symbol, onClose }: ChordDiagramOverlayProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelector<HTMLElement>('button:not(:disabled)');
    focusable?.focus();

    function handlePointerDown(event: PointerEvent): void {
      const target = event.target as Element | null;
      if (dialog?.contains(target)) return;

      // Keep the song sheet interactive so another chord replaces this panel.
      if (target?.closest('[data-chord-trigger="true"]')) return;
      onClose();
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [onClose]);

  return (
    <div className={styles.overlay} data-testid="chord-diagram-overlay">
      <div className={styles.backdrop} aria-hidden="true" />
      <div ref={dialogRef} className={styles.dialog} role="dialog" aria-labelledby={titleId}>
        <h2 className={styles.title} id={titleId}>
          Diagrama de acorde {symbol}
        </h2>
        <ChordDiagram symbol={symbol} onClose={onClose} />
      </div>
    </div>
  );
}
