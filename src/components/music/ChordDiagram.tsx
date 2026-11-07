import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { getChordVoicings, type ChordVoicing } from '@/features/transpose';
import { getPreference, setPreference } from '@/services';

import styles from './ChordDiagram.module.css';

interface ChordDiagramProps {
  readonly symbol: string;
  readonly onClose?: () => void;
}

function FretLabel({ fret }: { readonly fret: number }) {
  return <span className={styles.fretLabel}>{fret === 1 ? '1' : fret}</span>;
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
          <strong>{symbol}</strong>
          {onClose ? (
            <button
              className={styles.iconButton}
              type="button"
              onClick={onClose}
              aria-label="Fechar diagrama"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>
        <p className={styles.empty}>Não há uma posição conhecida para este acorde.</p>
      </aside>
    );
  }

  return (
    <aside className={styles.panel} aria-label={`Diagrama de ${symbol}`}>
      <div className={styles.panelHeader}>
        <div>
          <strong>{symbol}</strong>
          <span className={styles.positionLabel}>
            {voicing.baseFret > 1 ? `Casa ${voicing.baseFret}` : 'Posição aberta'}
          </span>
        </div>
        {onClose ? (
          <button
            className={styles.iconButton}
            type="button"
            onClick={onClose}
            aria-label="Fechar diagrama"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>
      <div className={styles.diagramRow}>
        <svg
          className={styles.diagram}
          viewBox="0 0 150 142"
          role="img"
          aria-label={`Posição ${variation + 1} de ${voicings.length}`}
        >
          <FretLabel fret={voicing.baseFret} />
          <g className={styles.grid}>
            {Array.from({ length: 6 }, (_, index) => (
              <line
                key={`string-${index}`}
                x1={30 + index * 18}
                y1="25"
                x2={30 + index * 18}
                y2="115"
              />
            ))}
            {Array.from({ length: 6 }, (_, index) => (
              <line
                key={`fret-${index}`}
                x1="30"
                y1={25 + index * 18}
                x2="120"
                y2={25 + index * 18}
              />
            ))}
          </g>
          <line className={styles.nut} x1="30" y1="25" x2="120" y2="25" />
          {voicing.strings.map((stringPosition) => {
            const x = 30 + stringPosition.stringIndex * 18;
            if (stringPosition.state === 'muted') {
              return (
                <text
                  className={styles.muted}
                  key={stringPosition.stringIndex}
                  x={x}
                  y="15"
                  textAnchor="middle"
                >
                  ×
                </text>
              );
            }
            if (stringPosition.state === 'open') {
              return (
                <circle
                  className={styles.open}
                  key={stringPosition.stringIndex}
                  cx={x}
                  cy="14"
                  r="4"
                />
              );
            }
            const y =
              25 + ((stringPosition.fret ?? voicing.baseFret) - voicing.baseFret + 1.5) * 18;
            return (
              <circle
                className={styles.finger}
                key={stringPosition.stringIndex}
                cx={x}
                cy={y}
                r="6"
              />
            );
          })}
          {voicing.barre ? (
            <line
              className={styles.barre}
              x1={30 + voicing.barre.fromStringIndex * 18}
              x2={30 + voicing.barre.toStringIndex * 18}
              y1={25 + (voicing.barre.fret - voicing.baseFret + 1.5) * 18}
              y2={25 + (voicing.barre.fret - voicing.baseFret + 1.5) * 18}
            />
          ) : null}
        </svg>
        <div className={styles.fingerList} aria-label="Posições dos dedos">
          {voicing.fingers.length > 0 ? (
            voicing.fingers.map((finger) => (
              <span key={`${finger.finger}-${finger.stringIndex}`}>
                {finger.finger}: {finger.fret}
              </span>
            ))
          ) : (
            <span>Sem pestana</span>
          )}
        </div>
      </div>
      {voicings.length > 1 ? (
        <div className={styles.variations} aria-label="Variações do acorde">
          <button
            type="button"
            onClick={() => chooseVariation(Math.max(0, variation - 1))}
            disabled={variation === 0}
            aria-label="Variação anterior"
          >
            <ChevronLeft size={15} />
          </button>
          <span>
            Variação {variation + 1} de {voicings.length}
          </span>
          <button
            type="button"
            onClick={() => chooseVariation(Math.min(voicings.length - 1, variation + 1))}
            disabled={variation === voicings.length - 1}
            aria-label="Próxima variação"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      ) : null}
    </aside>
  );
}

export type { ChordVoicing };
