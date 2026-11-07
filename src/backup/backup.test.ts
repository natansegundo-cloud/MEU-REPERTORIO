import Dexie from 'dexie';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MeuRepertorioDatabase } from '@/database';
import { parseSongText } from '@/features/parser';
import type { Song } from '@/types';

import { createBackup } from './service';
import { parseBackupText } from './format';
import { previewRestore, restoreBackup } from './restore';

function makeSong(id: string, title: string): Song {
  const content = `Tom: C\nC\n${title}`;
  const structure = parseSongText(content);
  const timestamp = '2026-01-01T00:00:00.000Z';
  return {
    id,
    title,
    artist: 'Artista',
    originalKey: 'C',
    currentKey: 'C',
    preferredKey: null,
    capo: null,
    tuning: null,
    rhythm: null,
    strumming: null,
    difficulty: null,
    content,
    structure,
    notes: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    revision: 1,
    syncPending: false,
    syncError: null,
  };
}

describe('backup e restauração', () => {
  const databases: MeuRepertorioDatabase[] = [];

  afterEach(async () => {
    for (const database of databases.splice(0)) {
      database.close();
      await Dexie.delete(database.name);
    }
  });

  async function createDatabase(name: string): Promise<MeuRepertorioDatabase> {
    const database = new MeuRepertorioDatabase(name);
    await database.open();
    databases.push(database);
    return database;
  }

  it('exporta, mescla e substitui dados sem carregar outbox ou cursor', async () => {
    const database = await createDatabase('backup-round-trip');
    await database.songs.add(makeSong('song-backup', 'Backup'));
    await database.favorites.put({
      songId: 'song-backup',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      deletedAt: null,
      revision: 1,
    });
    await database.preferences.put({
      key: 'theme',
      value: 'dark',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    await database.settings.put({
      key: 'sync.cursor.songs',
      value: 'secret-cursor',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    const backup = await createBackup(database);
    expect(backup.counts).toMatchObject({ songs: 1, favorites: 1, preferences: 1 });
    expect(backup.songs[0]).not.toHaveProperty('syncPending');
    expect(backup).not.toHaveProperty('settings');
    expect(parseBackupText(JSON.stringify(backup)).app).toBe('meu-repertorio');

    await database.songs.clear();
    await database.favorites.clear();
    await database.preferences.clear();
    const preview = await previewRestore(backup, { database });
    expect(preview.songs.added).toBe(1);
    await restoreBackup(backup, { database });
    expect(await database.songs.get('song-backup')).toMatchObject({
      syncPending: true,
      revision: 2,
    });
    expect(await database.favorites.get('song-backup')).toBeTruthy();
    expect(await database.settings.get('sync.cursor.songs')).toMatchObject({
      value: 'secret-cursor',
    });

    await database.songs.add(makeSong('local-only', 'Local'));
    const result = await restoreBackup(backup, {
      database,
      strategy: 'replace',
      confirmation: 'SUBSTITUIR',
    });
    expect(result.automaticBackup).not.toBeNull();
    expect(await database.songs.get('local-only')).toMatchObject({
      deletedAt: expect.any(String),
      revision: 2,
      syncPending: true,
    });
    expect(await database.songs.get('song-backup')).toBeTruthy();
  });

  it('rejeita arquivo inválido ou de versão futura antes de escrever', async () => {
    const database = await createDatabase('backup-invalid');
    await database.songs.add(makeSong('existing', 'Intacta'));
    const backup = await createBackup(database);
    const future = { ...backup, formatVersion: 99 };
    expect(() => parseBackupText(JSON.stringify(future))).toThrow(/versão mais nova/i);
    const invalid = { ...backup, songs: [{ ...backup.songs[0], title: 42 }] };
    await expect(restoreBackup(invalid as never, { database })).rejects.toThrow(
      /conteúdo inválido/i,
    );
    expect(await database.songs.get('existing')).toMatchObject({ title: 'Intacta' });
  });

  it('faz rollback quando uma escrita falha no meio da substituição', async () => {
    const database = await createDatabase('backup-atomic');
    await database.songs.add(makeSong('existing', 'Intacta'));
    const backup = await createBackup(database);
    const bulkPut = vi
      .spyOn(database.songs, 'bulkPut')
      .mockRejectedValue(new Error('falha simulada'));

    await expect(
      restoreBackup(backup, { database, strategy: 'replace', confirmation: 'SUBSTITUIR' }),
    ).rejects.toThrow('falha simulada');

    bulkPut.mockRestore();
    expect(await database.songs.get('existing')).toMatchObject({ title: 'Intacta' });
  });
});
