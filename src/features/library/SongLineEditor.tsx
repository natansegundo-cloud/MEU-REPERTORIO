import { Plus, Trash2 } from 'lucide-react';

import type { ParsedSongLine } from '@/types';

import styles from './SongEditorPage.module.css';

interface SongLineEditorProps {
  readonly line: ParsedSongLine;
  readonly lineIndex: number;
  readonly onTextChange: (lineIndex: number, text: string) => void;
  readonly onSectionChange: (lineIndex: number, label: string) => void;
  readonly onChordChange: (lineIndex: number, chordIndex: number, symbol: string) => void;
  readonly onPositionChange: (lineIndex: number, chordIndex: number, position: number) => void;
  readonly onAddChord: (lineIndex: number) => void;
  readonly onRemoveChord: (lineIndex: number, chordIndex: number) => void;
  readonly onAddLine: (lineIndex: number) => void;
  readonly onRemoveLine: (lineIndex: number) => void;
}

export function SongLineEditor({
  line,
  lineIndex,
  onTextChange,
  onSectionChange,
  onChordChange,
  onPositionChange,
  onAddChord,
  onRemoveChord,
  onAddLine,
  onRemoveLine,
}: SongLineEditorProps) {
  if (line.kind === 'blank') {
    return (
      <div className={styles.lineRow} data-testid={`song-line-${lineIndex}`}>
        <span className={styles.lineNumber}>{lineIndex + 1}</span>
        <span className={styles.blankLine}>Linha vazia</span>
        <button className={styles.iconButton} type="button" onClick={() => onRemoveLine(lineIndex)}>
          <Trash2 size={16} />
          <span className={styles.srOnly}>Remover linha {lineIndex + 1}</span>
        </button>
      </div>
    );
  }

  return (
    <div className={styles.lineRow} data-testid={`song-line-${lineIndex}`}>
      <span className={styles.lineNumber}>{lineIndex + 1}</span>
      <div className={styles.lineContent}>
        {line.kind === 'section' ? (
          <label className={styles.lineField}>
            <span>Seção</span>
            <input
              value={line.sectionLabel ?? ''}
              onChange={(event) => onSectionChange(lineIndex, event.target.value)}
              placeholder="Ex.: Refrão"
            />
          </label>
        ) : (
          <label className={styles.lineField}>
            <span>Letra</span>
            <textarea
              value={line.lyricText ?? ''}
              onChange={(event) => onTextChange(lineIndex, event.target.value)}
              rows={2}
            />
          </label>
        )}

        <div className={styles.chordEditor}>
          <div className={styles.chordHeader}>
            <span>Cifras e posições</span>
            <button
              className={styles.inlineButton}
              type="button"
              onClick={() => onAddChord(lineIndex)}
            >
              <Plus size={14} />
              Adicionar cifra
            </button>
          </div>
          {line.chords.length === 0 ? (
            <p className={styles.muted}>Nenhuma cifra nesta linha.</p>
          ) : null}
          {line.chords.map((chord, chordIndex) => (
            <div className={styles.chordRow} key={`${lineIndex}-${chordIndex}`}>
              <input
                aria-label={`Cifra ${chordIndex + 1} da linha ${lineIndex + 1}`}
                value={chord.symbol}
                onChange={(event) => onChordChange(lineIndex, chordIndex, event.target.value)}
              />
              <input
                aria-label={`Posição da cifra ${chordIndex + 1} da linha ${lineIndex + 1}`}
                type="number"
                min={0}
                value={chord.position}
                onChange={(event) =>
                  onPositionChange(lineIndex, chordIndex, Number(event.target.value))
                }
              />
              <button
                className={styles.iconButton}
                type="button"
                onClick={() => onRemoveChord(lineIndex, chordIndex)}
              >
                <Trash2 size={16} />
                <span className={styles.srOnly}>Remover cifra {chordIndex + 1}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.lineActions}>
        <button className={styles.iconButton} type="button" onClick={() => onAddLine(lineIndex)}>
          <Plus size={16} />
          <span className={styles.srOnly}>Adicionar linha depois da linha {lineIndex + 1}</span>
        </button>
        <button className={styles.iconButton} type="button" onClick={() => onRemoveLine(lineIndex)}>
          <Trash2 size={16} />
          <span className={styles.srOnly}>Remover linha {lineIndex + 1}</span>
        </button>
      </div>
    </div>
  );
}
