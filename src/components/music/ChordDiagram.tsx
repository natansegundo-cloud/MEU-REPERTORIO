import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { chordPositionLabel, getChordVoicings, type ChordVoicing } from '@/features/transpose';
import { getPreference, setPreference } from '@/services';

import { ChordDiagramGraphic } from './ChordDiagramGraphic';
import styles from './ChordDiagram.module.css';

interface ChordDiagramProps {
  readonly symbol: string;
  readonly onClose?: () => void;
}

function fingerSummary(voicing: ChordVoicing): string {
  if (voicing.fingerCount === 0) return 'Cordas soltas';

  const fingers = `${voicing.fingerCount} ${voicing.fingerCount === 1 ? 'dedo' : 'dedos'}`;
  return voicing.barre ? `Pestana · ${fingers}` : fingers;
}

export function ChordDiagram({ symbol, onClose }: ChordDiagramProps) {
  const voicings = useMemo(() => getChordVoicings(symbol), [symbol]);
  const [variation, setVariation] = useState(0);
  const voicing = voicings[variation] ?? voicings[0];

  useEffect(() => {
    let active = true;
    void getPreference(`chord.diagram.${symbol}`, 0).then((saved) => {
      if (active) setVariation(Math.max(0, Math.min(voicings.length - 1, saved)));
    });
    return () => {
      active = false;
    };
  }, [symbol, voicings.length]);

  function chooseVariation(next: number): void {
    setVariation(next);
    void setPreference(`chord.diagram.${symbol}`, next);
  }

  if (!voicing) {
    return (
      <aside className={styles.panel} aria-label={`Diagrama de ${symbol}`}>
        <div className={styles.panelHeader}>
          <div className={styles.identity}>
            <strong className={styles.name}>{symbol}</strong>
            <span className={styles.position}>Sem posição confiável</span>
          </div>
          {onClose ? (
            <button
              className={styles.iconButton}
              type="button"
              onClick={onClose}
              aria-label="Fechar diagrama"
            >
              <X size={15} />
            </button>
          ) : null}
        </div>
        <p className={styles.empty} role="status">
          Não há uma posição confiável para este acorde.
        </p>
      </aside>
    );
  }

  const positionLabel = chordPositionLabel(voicing);
  const variationLabel =
    voicings.length > 1 ? `Variação ${variation + 1} de ${voicings.length}` : 'Posição única';

  return (
    <aside className={styles.panel} aria-label={`Diagrama de ${symbol}`}>
      <div className={styles.panelHeader}>
        <div className={styles.identity}>
          <strong className={styles.name}>{voicing.symbol}</strong>
          <span className={styles.position}>{positionLabel}</span>
        </div>
        {onClose ? (
          <button
            className={styles.iconButton}
            type="button"
            onClick={onClose}
            aria-label="Fechar diagrama"
          >
            <X size={15} />
          </button>
        ) : null}
      </div>

      <div className={styles.graphic}>
        <ChordDiagramGraphic voicing={voicing} />
      </div>

      <div className={styles.meta}>
        <span className={styles.fingerSummary}>{fingerSummary(voicing)}</span>
        {voicings.length > 1 ? (
          <div className={styles.variations} aria-label="Variações do acorde">
            <button
              className={styles.navButton}
              type="button"
              onClick={() => chooseVariation(Math.max(0, variation - 1))}
              disabled={variation === 0}
              aria-label="Variação anterior"
            >
              <ChevronLeft size={14} />
            </button>
            <span className={styles.variationLabel}>{variationLabel}</span>
            <button
              className={styles.navButton}
              type="button"
              onClick={() => chooseVariation(Math.min(voicings.length - 1, variation + 1))}
              disabled={variation === voicings.length - 1}
              aria-label="Próxima variação"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        ) : (
          <span className={styles.variationLabel}>{variationLabel}</span>
        )}
      </div>
    </aside>
  );
}

export type { ChordVoicing };
