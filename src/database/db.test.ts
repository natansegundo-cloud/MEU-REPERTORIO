import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Repertory, Song } from '@/types';

import { parseSongText } from '@/features/parser';

import { db, openDatabase } from './db';
import { DATABASE_VERSION, assertValidMigrations, migrations } from './migrations';

const now = '2026-01-01T00:00:00.000Z';

function makeSong(overrides: Partial<Song> = {}): Song {
  return {
    id: 'song-1',
    structure: parseSongText('Conteudo de teste'),
    title: 'Música de teste',
    artist: null,
    originalKey: null,
    currentKey: null,
    preferredKey: null,
    capo: null,
    tuning: null,
    rhythm: null,
    strumming: null,
    difficulty: null,
    content: 'Conteúdo de teste',
    notes: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    revision: 1,
    syncPending: true,
    ...overrides,
  };
}

function makeRepertory(overrides: Partial<Repertory> = {}): Repertory {
  return {
    id: 'repertory-1',
    name: 'Repertório de teste',
    description: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    revision: 1,
    syncPending: true,
    ...overrides,
  };
}

beforeEach(async () => {
  await openDatabase();
});

afterEach(async () => {
  if (db.isOpen()) {
    db.close();
  }

  await db.delete();
});

describe('MeuRepertorioDatabase', () => {
  it('cria as tabelas e a versão definidas nas migrações', () => {
    expect(db.verno).toBe(DATABASE_VERSION);
    expect(db.tables.map((table) => table.name).sort()).toEqual(
      ['favorites', 'preferences', 'repertories', 'repertoryItems', 'settings', 'songs'].sort(),
    );
  });

  it('persiste e consulta uma música pelos índices declarados', async () => {
    const song = makeSong();

    await db.songs.add(song);

    await expect(db.songs.get(song.id)).resolves.toEqual(song);
    await expect(db.songs.where('title').equals(song.title).first()).resolves.toEqual(song);
  });

  it('preserva registros com exclusão lógica em vez de apagá-los', async () => {
    await db.songs.add(makeSong());

    await db.songs.update('song-1', {
      deletedAt: now,
      updatedAt: now,
      revision: 2,
    });

    const activeSongs = await db.songs.filter((song) => song.deletedAt === null).toArray();
    const storedSong = await db.songs.get('song-1');

    expect(activeSongs).toHaveLength(0);
    expect(storedSong?.deletedAt).toBe(now);
  });

  it('consulta itens de repertório pelo índice composto de ordenação', async () => {
    await db.repertories.add(makeRepertory());
    await db.songs.add(makeSong());
    await db.repertoryItems.add({
      id: 'item-1',
      repertoryId: 'repertory-1',
      songId: 'song-1',
      position: 1,
      preferredKey: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      revision: 1,
      syncPending: true,
    });

    const items = await db.repertoryItems
      .where('[repertoryId+position]')
      .equals(['repertory-1', 1])
      .toArray();

    expect(items).toHaveLength(1);
    expect(items[0]?.songId).toBe('song-1');
  });

  it('armazena preferências serializáveis', async () => {
    await db.preferences.put({
      key: 'interface.theme',
      value: 'dark',
      updatedAt: now,
    });

    await expect(db.preferences.get('interface.theme')).resolves.toEqual({
      key: 'interface.theme',
      value: 'dark',
      updatedAt: now,
    });
  });

  it('valida a sequência de migrações', () => {
    expect(() => assertValidMigrations(migrations)).not.toThrow();
    expect(() => assertValidMigrations([{ version: 2 }])).toThrow();
    expect(() => assertValidMigrations([{ version: 1 }, { version: 1 }])).toThrow();
  });
});
