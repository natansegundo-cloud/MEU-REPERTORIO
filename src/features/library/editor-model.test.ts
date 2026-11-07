import { describe, expect, it } from 'vitest';

import { parseSongText } from '@/features/parser';

import {
  addChord,
  addLine,
  removeChord,
  removeLine,
  updateChord,
  updateChordPosition,
  updateLineText,
  validateSongStructure,
} from './editor-model';

describe('editor model', () => {
  it('edita letra sem achatar a estrutura da cifra', () => {
    const original = parseSongText('C       G\nMinha letra\nOutra linha');
    const edited = updateLineText(original, 0, 'Letra corrigida');

    expect(edited.originalText).toBe(original.originalText);
    expect(edited.lines[0]?.kind).toBe('chord-lyric');
    expect(edited.lines[0]?.lyricText).toBe('Letra corrigida');
    expect(edited.lines[0]?.chords).toHaveLength(2);
    expect(edited.reconstructedText).toContain('Letra corrigida');
  });

  it('adiciona, altera, reposiciona e remove cifras', () => {
    const original = parseSongText('C\nMinha letra');
    const withChord = addChord(original, 0, 'Am', 4);
    const changed = updateChord(withChord, 0, 1, 'F#m7');
    const repositioned = updateChordPosition(changed, 0, 1, 8);
    const removed = removeChord(repositioned, 0, 0);

    expect(withChord.lines[0]?.chords[1]?.symbol).toBe('Am');
    expect(removed.lines[0]?.chords).toHaveLength(1);
    expect(removed.lines[0]?.chords[0]).toMatchObject({ symbol: 'F#m7', position: 8 });
    expect(removed.report.chordCount).toBe(1);
  });

  it('insere e remove versos preservando as demais linhas', () => {
    const original = parseSongText('C\nPrimeira\nSegunda');
    const inserted = addLine(original, 0);
    const edited = updateLineText(inserted, 1, 'Nova linha');
    const removed = removeLine(edited, 1);

    expect(inserted.lines).toHaveLength(original.lines.length + 1);
    expect(edited.lines[1]?.text).toBe('Nova linha');
    expect(removed.lines.map((line) => line.text)).toEqual(original.lines.map((line) => line.text));
  });

  it('impede salvar cifras inválidas', () => {
    const edited = updateChord(parseSongText('C\nLetra'), 0, 0, 'H7');
    const issues = validateSongStructure(edited);

    expect(issues[0]?.lineIndex).toBe(0);
    expect(issues[0]?.message).toContain('inválida');
  });
});
