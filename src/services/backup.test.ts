import { afterEach, describe, expect, it } from 'vitest';

import { MeuRepertorioDatabase } from '@/database';
import { parseSongText } from '@/features/parser';
import type { Favorite, Preference, Repertory, RepertoryItem, Setting, Song } from '@/types';

import {
  BACKUP_FORMAT,
  BackupIntegrityError,
  BackupRestoreError,
  BackupValidationError,
  createBackup,
  parseBackupText,
  planRestore,
  restoreBackup,
  serializeBackup,
} from './backup';

const databases: MeuRepertorioDatabase[] = [];
const timestamp = '2026-11-08T12:00:00.000Z';

function makeDatabase(label: string): MeuRepertorioDatabase {
  const database = new MeuRepertorioDatabase(`backup-test-${label}-${crypto.randomUUID()}`);
  databases.push(database);
  return database;
}

function makeSong(id: string, title: string): Song {
  const content = `Tom: C\nC       G\n${title}`;
  return {
    id,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    revision: 1,
    syncPending: false,
    syncError: null,
    title,
    artist: 'Artista de teste',
    originalKey: 'C',
    currentKey: 'C',
    preferredKey: null,
    capo: null,
    tuning: null,
    rhythm: null,
    strumming: null,
    difficulty: null,
    content,
    structure: parseSongText(content),
    notes: 'Observação preservada',
  };
}

async function seedCompleteDatabase(
  database: MeuRepertorioDatabase,
  song = makeSong('song-1', 'Canção'),
) {
  const repertory: Repertory = {
    id: 'repertory-1',
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    revision: 1,
    syncPending: false,
    name: 'Repertório principal',
    description: 'Para tocar ao vivo',
  };
  const repertoryItem: RepertoryItem = {
    id: 'repertory-item-1',
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    revision: 1,
    syncPending: false,
    repertoryId: repertory.id,
    songId: song.id,
    position: 0,
    preferredKey: 'D',
  };
  const favorite: Favorite = {
    songId: song.id,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    revision: 1,
  };
  const preference: Preference = {
    key: 'theme',
    value: 'dark',
    updatedAt: timestamp,
  };
  const setting: Setting = {
    key: 'backup.lastViewed',
    value: true,
    updatedAt: timestamp,
  };

  await database.open();
  await database.songs.add(song);
  await database.repertories.add(repertory);
  await database.repertoryItems.add(repertoryItem);
  await database.favorites.add(favorite);
  await database.preferences.add(preference);
  await database.settings.bulkAdd([
    setting,
    { key: 'sync.ownerUserId', value: 'must-not-export', updatedAt: timestamp },
  ]);
}

async function readAll(database: MeuRepertorioDatabase) {
  return {
    songs: await database.songs.toArray(),
    repertories: await database.repertories.toArray(),
    repertoryItems: await database.repertoryItems.toArray(),
    favorites: await database.favorites.toArray(),
    preferences: await database.preferences.toArray(),
    settings: await database.settings.toArray(),
  };
}

afterEach(async () => {
  for (const database of databases.splice(0)) {
    if (database.isOpen()) database.close();
    await database.delete();
  }
});

describe('backup service', () => {
  it('exporta a biblioteca completa e exclui metadados de sincronização', async () => {
    const database = makeDatabase('complete');
    await seedCompleteDatabase(database);

    const backup = await createBackup(database);
    const restoredDocument = await parseBackupText(serializeBackup(backup));

    expect(restoredDocument.format).toBe(BACKUP_FORMAT);
    expect(restoredDocument.data.songs[0]).toMatchObject({
      title: 'Canção',
      content: expect.stringContaining('Canção'),
    });
    expect(restoredDocument.data.repertories).toHaveLength(1);
    expect(restoredDocument.data.repertoryItems[0]?.songId).toBe('song-1');
    expect(restoredDocument.data.favorites[0]?.songId).toBe('song-1');
    expect(restoredDocument.data.preferences[0]?.key).toBe('theme');
    expect(restoredDocument.data.settings.map((item) => item.key)).toEqual(['backup.lastViewed']);
  });

  it('gera backup válido de uma biblioteca vazia', async () => {
    const database = makeDatabase('empty');

    const backup = await createBackup(database);
    const parsed = await parseBackupText(serializeBackup(backup));

    expect(parsed.data.songs).toEqual([]);
    expect(parsed.data.repertories).toEqual([]);
    expect(parsed.data.repertoryItems).toEqual([]);
    expect(parsed.data.favorites).toEqual([]);
    expect(parsed.data.preferences).toEqual([]);
    expect(parsed.data.settings).toEqual([]);
  });

  it('restaura músicas, repertórios, relações, favoritos e preferências', async () => {
    const source = makeDatabase('source');
    const target = makeDatabase('target');
    await seedCompleteDatabase(source);
    const backup = await createBackup(source);

    const plan = await planRestore(backup, target);
    const result = await restoreBackup(backup, 'merge', { database: target });

    expect(plan.newCount).toBe(6);
    expect(plan.conflictCount).toBe(0);
    expect(result).toMatchObject({ added: 6, unchanged: 0, conflicts: 0 });
    expect((await readAll(target)).songs[0]?.structure.originalText).toContain('Canção');
    expect((await target.repertories.get('repertory-1'))?.name).toBe('Repertório principal');
    expect((await target.repertoryItems.get('repertory-item-1'))?.preferredKey).toBe('D');
    expect(await target.favorites.get('song-1')).toBeDefined();
    expect(await target.preferences.get('theme')).toMatchObject({ value: 'dark' });
  });

  it('rejeita JSON inválido e versão incompatível', async () => {
    await expect(parseBackupText('{ inválido')).rejects.toBeInstanceOf(BackupValidationError);

    const database = makeDatabase('version');
    const backup = await createBackup(database);
    const incompatible = JSON.parse(serializeBackup(backup)) as Record<string, unknown>;
    incompatible.version = 999;

    await expect(parseBackupText(JSON.stringify(incompatible))).rejects.toMatchObject({
      name: 'BackupValidationError',
      message: expect.stringContaining('compatível'),
    });
  });

  it('detecta corrupção pelo digest e relações inválidas antes da gravação', async () => {
    const source = makeDatabase('corruption');
    await seedCompleteDatabase(source);
    const backup = await createBackup(source);

    const corrupted = JSON.parse(serializeBackup(backup)) as {
      data: { songs: Array<Record<string, unknown>> };
    };
    corrupted.data.songs[0]!.title = 'Conteúdo adulterado';
    await expect(parseBackupText(JSON.stringify(corrupted))).rejects.toBeInstanceOf(
      BackupIntegrityError,
    );

    const brokenRelation = JSON.parse(serializeBackup(backup)) as {
      data: { repertoryItems: Array<Record<string, unknown>> };
    };
    brokenRelation.data.repertoryItems[0]!.songId = 'song-inexistente';
    await expect(parseBackupText(JSON.stringify(brokenRelation))).rejects.toBeInstanceOf(
      BackupValidationError,
    );
  });

  it('detecta conflitos e só sobrescreve com modo explícito', async () => {
    const source = makeDatabase('conflict-source');
    const target = makeDatabase('conflict-target');
    await seedCompleteDatabase(source);
    await target.open();
    await target.songs.add(makeSong('song-1', 'Título local'));
    const backup = await createBackup(source);

    const plan = await planRestore(backup, target);
    const merged = await restoreBackup(backup, 'merge', { database: target });
    expect(plan.conflictCount).toBe(1);
    expect(merged.conflicts).toBe(1);
    expect((await target.songs.get('song-1'))?.title).toBe('Título local');

    const replaced = await restoreBackup(backup, 'replace-conflicts', { database: target });
    expect(replaced.overwritten).toBe(1);
    expect((await target.songs.get('song-1'))?.title).toBe('Canção');
  });

  it('faz rollback quando a restauração falha durante a transação', async () => {
    const source = makeDatabase('rollback-source');
    const target = makeDatabase('rollback-target');
    await seedCompleteDatabase(source);
    const backup = await createBackup(source);

    await expect(
      restoreBackup(backup, 'merge', {
        database: target,
        onProgress: () => {
          throw new Error('falha simulada');
        },
      }),
    ).rejects.toBeInstanceOf(BackupRestoreError);

    expect(await target.songs.count()).toBe(0);
    expect(await target.repertories.count()).toBe(0);
    expect(await target.preferences.count()).toBe(0);
  });

  it('preserva dados existentes no modo merge', async () => {
    const source = makeDatabase('preserve-source');
    const target = makeDatabase('preserve-target');
    await seedCompleteDatabase(source);
    await target.open();
    await target.songs.add(makeSong('song-local', 'Música local'));

    await restoreBackup(await createBackup(source), 'merge', { database: target });

    expect(await target.songs.bulkGet(['song-local', 'song-1'])).toEqual([
      expect.objectContaining({ title: 'Música local' }),
      expect.objectContaining({ title: 'Canção' }),
    ]);
  });
});
