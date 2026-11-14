import type { ChordVoicing } from '@/features/transpose';

import styles from './ChordDiagramGraphic.module.css';

interface ChordDiagramGraphicProps {
  readonly voicing: ChordVoicing;
}

const STRING_COUNT = 6;
const FRET_COUNT = 5;
const STRING_GAP = 16;
const FRET_GAP = 18;
const LABELED_LEFT = 40;
const CENTERED_LEFT = 30;
const RIGHT = 20;
const TOP = 28;
const WIDTH = LABELED_LEFT + (STRING_COUNT - 1) * STRING_GAP + RIGHT;
const HEIGHT = TOP + FRET_COUNT * FRET_GAP + 8;

function stringX(stringIndex: number, left: number): number {
  return left + stringIndex * STRING_GAP;
}

function fretY(fret: number, baseFret: number): number {
  return TOP + (fret - baseFret + 0.5) * FRET_GAP;
}

function markerY(fret: number, baseFret: number): number {
  return fretY(fret, baseFret);
}

/**
 * Janela visual de cinco casas. Acordes que cabem nas cinco primeiras casas
 * são sempre desenhados desde o início do braço; os demais começam na menor
 * casa pressionada, para não perder nenhuma nota do desenho.
 */
function visibleBaseFret(voicing: ChordVoicing): number {
  const highestFret = voicing.frets.reduce((highest, fret) => Math.max(highest, fret), 0);
  return highestFret > FRET_COUNT ? voicing.baseFret : 1;
}

export function ChordDiagramGraphic({ voicing }: ChordDiagramGraphicProps) {
  const { barre } = voicing;
  const baseFret = visibleBaseFret(voicing);
  const showNut = baseFret === 1;
  // Sem rótulo o braço fica centralizado; com rótulo abre-se a calha à esquerda.
  const left = showNut ? CENTERED_LEFT : LABELED_LEFT;

  return (
    <svg
      className={styles.diagram}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`Diagrama de ${voicing.symbol}`}
      data-fret-count={FRET_COUNT}
      data-base-fret={baseFret}
      focusable="false"
    >
      <g className={styles.grid} aria-hidden="true">
        {Array.from({ length: STRING_COUNT }, (_, index) => (
          <line
            key={`string-${index}`}
            className={styles.string}
            x1={stringX(index, left)}
            y1={TOP}
            x2={stringX(index, left)}
            y2={TOP + FRET_COUNT * FRET_GAP}
          />
        ))}
        {Array.from({ length: FRET_COUNT + 1 }, (_, index) => (
          <line
            key={`fret-${index}`}
            className={styles.fret}
            x1={left}
            y1={TOP + index * FRET_GAP}
            x2={stringX(STRING_COUNT - 1, left)}
            y2={TOP + index * FRET_GAP}
          />
        ))}
      </g>

      {showNut ? (
        <line
          className={styles.nut}
          x1={left}
          y1={TOP}
          x2={stringX(STRING_COUNT - 1, left)}
          y2={TOP}
          aria-hidden="true"
        />
      ) : (
        <text
          className={styles.position}
          x={LABELED_LEFT - 4}
          y={TOP + FRET_GAP / 2}
          textAnchor="end"
        >
          Casa {baseFret}
        </text>
      )}

      {voicing.strings.map((stringPosition) => {
        const x = stringX(stringPosition.stringIndex, left);

        if (stringPosition.state === 'muted') {
          return (
            <text
              key={`marker-${stringPosition.stringIndex}`}
              className={styles.muted}
              x={x}
              y={TOP - 9}
              textAnchor="middle"
              dominantBaseline="central"
              aria-hidden="true"
            >
              ×
            </text>
          );
        }

        if (stringPosition.state === 'open') {
          return (
            <circle
              key={`marker-${stringPosition.stringIndex}`}
              className={styles.open}
              cx={x}
              cy={TOP - 9}
              r="3.2"
              aria-hidden="true"
            />
          );
        }

        const fret = stringPosition.fret;
        const finger = stringPosition.finger;
        if (fret === null) return null;

        const coveredByBarre =
          barre !== null &&
          stringPosition.stringIndex >= barre.fromStringIndex &&
          stringPosition.stringIndex <= barre.toStringIndex &&
          fret === barre.fret;

        if (coveredByBarre) return null;

        const y = markerY(fret, baseFret);

        return (
          <g key={`marker-${stringPosition.stringIndex}`} aria-hidden="true">
            <circle className={styles.finger} cx={x} cy={y} r="6.5" />
            {finger !== null ? (
              <text
                className={styles.fingerLabel}
                x={x}
                y={y + 0.5}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {finger}
              </text>
            ) : null}
          </g>
        );
      })}

      {barre ? (
        <g aria-hidden="true">
          <line
            className={styles.barre}
            x1={stringX(barre.fromStringIndex, left)}
            x2={stringX(barre.toStringIndex, left)}
            y1={markerY(barre.fret, baseFret)}
            y2={markerY(barre.fret, baseFret)}
          />
          <text
            className={styles.barreLabel}
            x={(stringX(barre.fromStringIndex, left) + stringX(barre.toStringIndex, left)) / 2}
            y={markerY(barre.fret, baseFret) + 0.5}
            textAnchor="middle"
            dominantBaseline="central"
          >
            1
          </text>
        </g>
      ) : null}
    </svg>
  );
}
