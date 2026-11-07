import { describe, expect, it } from 'vitest';

import type { RepertoryEntry } from '@/services';
import type { Song } from '@/types';

import {
  canMoveShowSession,
  createShowSession,
  getPlayableEntries,
  jumpShowSession,
  moveShowSession,
} from './show-session';

const song = (id: string): Song => ({
  id,
  title: id,
  artist: null,
  originalKey: 'C',
  currentKey: 'C',
  preferredKey: null,
  capo: null,
  tuning: null,
  rhythm: null,
  strumming: null,
  difficulty: null,
  content: 'C\nLetra',
  structure: {
    version: 1,
    valid: true,
    originalText: 'C\nLetra',
    normalizedText: 'C\nLetra',
    body: 'C\nLetra',
    reconstructedText: 'C\nLetra',
    title: id,
    artist: null,
    originalKey: 'C',
    currentKey: 'C',
    capo: null,
    metadata: {
      title: id,
      artist: null,
      originalKey: 'C',
      currentKey: 'C',
      capo: null,
      extraLines: [],
    },
    lines: [],
    diagnostics: [],
    report: { lineCount: 0, chordCount: 0, lyricCount: 0, warningCount: 0, errorCount: 0 },
  },
  notes: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  deletedAt: null,
  revision: 1,
  syncPending: false,
});

const entry = (id: string, songValue: Song | null): RepertoryEntry => ({
  item: {
    id: `item-${id}`,
    repertoryId: 'rep-1',
    songId: id,
    position: 1,
    preferredKey: null,
    createdAt: '',
    updatedAt: '',
    deletedAt: null,
    revision: 1,
    syncPending: false,
  },
  song: songValue,
});

describe('show session', () => {
  it('ignora itens cuja música foi removida e respeita limites', () => {
    const session = createShowSession([
      entry('a', song('a')),
      entry('gone', null),
      entry('b', song('b')),
    ]);
    expect(getPlayableEntries([entry('a', song('a')), entry('gone', null)])).toHaveLength(1);
    expect(session.entries).toHaveLength(2);
    expect(moveShowSession(session, -1).index).toBe(0);
    expect(moveShowSession(session, 1).index).toBe(1);
    expect(canMoveShowSession(session, -1)).toBe(false);
  });

  it('restaura posição salva, permite item solicitado e salto direto', () => {
    const entries = [entry('a', song('a')), entry('b', song('b')), entry('c', song('c'))];
    expect(createShowSession(entries, 1).index).toBe(1);
    expect(createShowSession(entries, 0, 'item-c').index).toBe(2);
    expect(jumpShowSession(createShowSession(entries), 2).entries[2]?.song.id).toBe('c');
    expect(createShowSession([], 4).index).toBe(0);
  });
});
