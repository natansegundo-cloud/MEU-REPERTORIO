import type { ChordVoicing } from '@/features/transpose';

import styles from './ChordDiagramGraphic.module.css';

interface ChordDiagramGraphicProps {
  readonly voicing: ChordVoicing;
}

const STRING_COUNT = 6;
const FRET_COUNT = 5;
const STRING_GAP = 16;
const FRET_GAP = 18;
const LEFT = 24;
const TOP = 28;
const WIDTH = LEFT + (STRING_COUNT - 1) * STRING_GAP + 12;
const HEIGHT = TOP + FRET_COUNT * FRET_GAP + 8;

function stringX(stringIndex: number): number {
  return LEFT + stringIndex * STRING_GAP;
}

function fretY(fret: number, baseFret: number): number {
  return TOP + (fret - baseFret + 0.5) * FRET_GAP;
}

function markerY(fret: number, baseFret: number): number {
  return fretY(fret, baseFret);
}

export function ChordDiagramGraphic({ voicing }: ChordDiagramGraphicProps) {
  const { baseFret, barre } = voicing;
  const openPosition = baseFret === 1;

  return (
    <svg
      className={styles.diagram}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`Diagrama de ${voicing.symbol}`}
      focusable="false"
    >
      <g className={styles.grid} aria-hidden="true">
        {Array.from({ length: STRING_COUNT }, (_, index) => (
          <line
            key={`string-${index}`}
            className={styles.string}
            x1={stringX(index)}
            y1={TOP}
            x2={stringX(index)}
            y2={TOP + FRET_COUNT * FRET_GAP}
          />
        ))}
        {Array.from({ length: FRET_COUNT + 1 }, (_, index) => (
          <line
            key={`fret-${index}`}
            className={styles.fret}
            x1={LEFT}
            y1={TOP + index * FRET_GAP}
            x2={stringX(STRING_COUNT - 1)}
            y2={TOP + index * FRET_GAP}
          />
        ))}
      </g>

      {openPosition ? (
        <line
          className={styles.nut}
          x1={LEFT}
          y1={TOP}
          x2={stringX(STRING_COUNT - 1)}
          y2={TOP}
          aria-hidden="true"
        />
      ) : (
        <text className={styles.position} x={12} y={TOP + FRET_GAP / 2} textAnchor="middle">
          {baseFret}ª
        </text>
      )}

      {voicing.strings.map((stringPosition) => {
        const x = stringX(stringPosition.stringIndex);

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
            x1={stringX(barre.fromStringIndex)}
            x2={stringX(barre.toStringIndex)}
            y1={markerY(barre.fret, baseFret)}
            y2={markerY(barre.fret, baseFret)}
          />
          <text
            className={styles.barreLabel}
            x={(stringX(barre.fromStringIndex) + stringX(barre.toStringIndex)) / 2}
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
