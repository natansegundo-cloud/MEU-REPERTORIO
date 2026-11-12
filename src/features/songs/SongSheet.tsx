import type { CSSProperties } from 'react';

import type { ParsedSong, ParsedSongLine } from '@/types';

import styles from './SongSheet.module.css';

interface SongSheetProps {
  readonly structure: ParsedSong;
  readonly title?: string;
  readonly fontScale?: number;
  readonly variant?: 'default' | 'stage';
  readonly onChordSelect?: (symbol: string) => void;
}

function ChordRow({
  line,
  onChordSelect,
}: {
  readonly line: ParsedSongLine;
  readonly onChordSelect?: (symbol: string) => void;
}) {
  return (
    <div className={styles.chords} aria-label="Cifras">
      {line.chords.map((chord, index) => {
        const position = Math.max(chord.visualPosition, chord.position, 0);
        const previousEnd = line.chords
          .slice(0, index)
          .reduce(
            (end, previous) =>
              Math.max(
                end,
                Math.max(previous.visualPosition, previous.position, 0) + previous.symbol.length,
              ),
            0,
          );
        const gap = Math.max(0, position - previousEnd);
        const className = onChordSelect ? styles.chordButton : styles.chordText;
        return (
          <span className={styles.chordSlot} key={`${chord.sourceStart}-${index}`}>
            <span aria-hidden="true">{' '.repeat(gap)}</span>
            {onChordSelect ? (
              <button
                className={className}
                type="button"
                data-chord-trigger="true"
                onClick={() => onChordSelect(chord.symbol)}
                aria-label={`Ver diagrama de ${chord.symbol}`}
              >
                {chord.symbol}
              </button>
            ) : (
              <span className={className}>{chord.symbol}</span>
            )}
          </span>
        );
      })}
    </div>
  );
}

export function SongSheet({
  structure,
  title,
  fontScale = 1,
  variant = 'default',
  onChordSelect,
}: SongSheetProps) {
  return (
    <main
      className={styles.sheet}
      data-variant={variant}
      aria-label={title ? `Conteúdo de ${title}` : 'Conteúdo da música'}
      style={{ '--song-font-scale': fontScale } as CSSProperties}
    >
      {structure.lines.map((line, lineIndex) => {
        const key = `${line.lineNumber}-${lineIndex}`;
        if (line.kind === 'blank') return <div className={styles.blank} key={key} />;
        if (line.kind === 'section') {
          return (
            <h2 className={styles.section} key={key}>
              {line.sectionLabel}
            </h2>
          );
        }
        if (line.chords.length > 0) {
          return (
            <div className={styles.musicLine} key={key}>
              <ChordRow line={line} {...(onChordSelect ? { onChordSelect } : {})} />
              {line.lyricText !== null ? (
                <pre className={styles.lyric}>{line.lyricText}</pre>
              ) : null}
            </div>
          );
        }
        return (
          <pre className={styles.lyric} key={key}>
            {line.text ?? ''}
          </pre>
        );
      })}
    </main>
  );
}
