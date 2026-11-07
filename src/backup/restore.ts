import { db, openDatabase, type MeuRepertorioDatabase } from '@/database';
import type { Favorite, Preference, Repertory, RepertoryItem, Song } from '@/types';
import { notifyLocalSyncChange } from '@/sync';

import { validateBackupDocument, type BackupDocument } from './format';
import { createBackup } from './service';

export type RestoreStrategy = 'merge' | 'replace';

export interface RestoreCounts {
  readonly added: number;
  readonly updated: number;
  readonly ignored: number;
}

export interface RestorePreview {
  readonly strategy: RestoreStrategy;
  readonly songs: RestoreCounts;
  readonly repertories: RestoreCounts;
  readonly repertoryItems: RestoreCounts;
  readonly favorites: RestoreCounts;
  readonly preferences: RestoreCounts;
  readonly warnings: readonly string[];
  readonly blockedResurrections: number;
}

export interface RestoreOptions {
  readonly strategy?: RestoreStrategy;
  readonly confirmation?: string;
  readonly allowTombstoneResurrection?: boolean;
  readonly database?: MeuRepertorioDatabase;
  readonly onAutomaticBackup?: (backup: BackupDocument) => void;
}

export interface RestoreResult {
  readonly preview: RestorePreview;
  readonly automaticBackup: BackupDocument | null;
}

interface RestoreOperation {
  readonly table: 'songs' | 'repertories' | 'repertoryItems' | 'favorites' | 'preferences';
  readonly action: 'add' | 'update';
  readonly value: Song | Repertory | RepertoryItem | Favorite | Preference;
}

interface PreparedRestore {
  readonly preview: RestorePreview;
  readonly operations: readonly RestoreOperation[];
}

const emptyCounts = (): RestoreCounts => ({ added: 0, updated: 0, ignored: 0 });

function isNewer(incoming: { updatedAt: string }, local: { updatedAt: string }): boolean {
  return Date.parse(incoming.updatedAt) > Date.parse(local.updatedAt);
}

function restoredEntity<T extends Song | Repertory | RepertoryItem>(
  value: T,
  local: T | undefined,
): T {
  return {
    ...value,
    revision: Math.max(value.revision, local?.revision ?? 0) + 1,
    updatedAt: new Date().toISOString(),
    syncPending: true,
    syncError: null,
  };
}

function tombstoneEntity<T extends Song | Repertory | RepertoryItem>(value: T): T {
  return {
    ...value,
    deletedAt: new Date().toISOString(),
    revision: value.revision + 1,
    updatedAt: new Date().toISOString(),
    syncPending: true,
    syncError: null,
  };
}

function countsFor(values: { added: number; updated: number; ignored: number }): RestoreCounts {
  return { added: values.added, updated: values.updated, ignored: values.ignored };
}

async function prepareRestore(
  document: BackupDocument,
  database: MeuRepertorioDatabase,
  strategy: RestoreStrategy,
  allowTombstoneResurrection: boolean,
): Promise<PreparedRestore> {
  await openDatabase(database);
  if (strategy === 'replace') {
    const [localSongs, localRepertories, localItems] = await Promise.all([
      database.songs.toArray(),
      database.repertories.toArray(),
      database.repertoryItems.toArray(),
    ]);
    const backupSongIds = new Set(document.songs.map((value) => value.id));
    const backupRepertoryIds = new Set(document.repertories.map((value) => value.id));
    const backupItemIds = new Set(document.repertoryItems.map((value) => value.id));
    const missingSongs = localSongs.filter((value) => !backupSongIds.has(value.id));
    const missingRepertories = localRepertories.filter(
      (value) => !backupRepertoryIds.has(value.id),
    );
    const missingItems = localItems.filter((value) => !backupItemIds.has(value.id));
    return {
      preview: {
        strategy,
        songs: { added: document.songs.length, updated: missingSongs.length, ignored: 0 },
        repertories: {
          added: document.repertories.length,
          updated: missingRepertories.length,
          ignored: 0,
        },
        repertoryItems: {
          added: document.repertoryItems.length,
          updated: missingItems.length,
          ignored: 0,
        },
        favorites: { added: document.favorites.length, updated: 0, ignored: 0 },
        preferences: { added: document.preferences.length, updated: 0, ignored: 0 },
        warnings: [
          ...(missingSongs.length > 0
            ? [`${missingSongs.length} música(s) local(is) serão preservada(s) como tombstone.`]
            : []),
          ...(missingRepertories.length > 0
            ? [
                `${missingRepertories.length} repertório(s) local(is) serão preservado(s) como tombstone.`,
              ]
            : []),
          ...(missingItems.length > 0
            ? [`${missingItems.length} item(ns) local(is) serão preservado(s) como tombstone.`]
            : []),
        ],
        blockedResurrections: 0,
      },
      operations: [
        ...document.songs.map((value) => ({
          table: 'songs' as const,
          action: 'add' as const,
          value: restoredEntity(
            value as Song,
            localSongs.find((local) => local.id === value.id),
          ),
        })),
        ...document.repertories.map((value) => ({
          table: 'repertories' as const,
          action: 'add' as const,
          value: restoredEntity(
            value as Repertory,
            localRepertories.find((local) => local.id === value.id),
          ),
        })),
        ...document.repertoryItems.map((value) => ({
          table: 'repertoryItems' as const,
          action: 'add' as const,
          value: restoredEntity(
            value as RepertoryItem,
            localItems.find((local) => local.id === value.id),
          ),
        })),
        ...missingSongs.map((value) => ({
          table: 'songs' as const,
          action: 'update' as const,
          value: tombstoneEntity(value),
        })),
        ...missingRepertories.map((value) => ({
          table: 'repertories' as const,
          action: 'update' as const,
          value: tombstoneEntity(value),
        })),
        ...missingItems.map((value) => ({
          table: 'repertoryItems' as const,
          action: 'update' as const,
          value: tombstoneEntity(value),
        })),
        ...document.favorites.map((value) => ({
          table: 'favorites' as const,
          action: 'add' as const,
          value,
        })),
        ...document.preferences.map((value) => ({
          table: 'preferences' as const,
          action: 'add' as const,
          value,
        })),
      ],
    };
  }

  const [songs, repertories, repertoryItems, favorites, preferences] = await Promise.all([
    database.songs.toArray(),
    database.repertories.toArray(),
    database.repertoryItems.toArray(),
    database.favorites.toArray(),
    database.preferences.toArray(),
  ]);
  const localSongs = new Map(songs.map((value) => [value.id, value]));
  const localRepertories = new Map(repertories.map((value) => [value.id, value]));
  const localItems = new Map(repertoryItems.map((value) => [value.id, value]));
  const localFavorites = new Map(favorites.map((value) => [value.songId, value]));
  const localPreferences = new Map(preferences.map((value) => [value.key, value]));
  const warnings: string[] = [];
  let blockedResurrections = 0;
  const operations: RestoreOperation[] = [];

  function mergeEntity<T extends Song | Repertory | RepertoryItem>(
    value: T,
    local: T | undefined,
    table: 'songs' | 'repertories' | 'repertoryItems',
  ): RestoreCounts {
    if (!local) {
      operations.push({ table, action: 'add', value: restoredEntity(value, undefined) });
      return { added: 1, updated: 0, ignored: 0 };
    }
    if (!isNewer(value, local)) return { added: 0, updated: 0, ignored: 1 };
    if (local.deletedAt !== null && value.deletedAt === null && !allowTombstoneResurrection) {
      blockedResurrections += 1;
      return { added: 0, updated: 0, ignored: 1 };
    }
    operations.push({ table, action: 'update', value: restoredEntity(value, local) });
    return { added: 0, updated: 1, ignored: 0 };
  }

  const songCounts = document.songs.reduce((total, value) => {
    const current = mergeEntity(value as Song, localSongs.get(value.id), 'songs');
    return {
      added: total.added + current.added,
      updated: total.updated + current.updated,
      ignored: total.ignored + current.ignored,
    };
  }, emptyCounts());
  const repertoryCounts = document.repertories.reduce((total, value) => {
    const current = mergeEntity(value as Repertory, localRepertories.get(value.id), 'repertories');
    return {
      added: total.added + current.added,
      updated: total.updated + current.updated,
      ignored: total.ignored + current.ignored,
    };
  }, emptyCounts());
  const itemCounts = document.repertoryItems.reduce((total, value) => {
    const current = mergeEntity(value as RepertoryItem, localItems.get(value.id), 'repertoryItems');
    return {
      added: total.added + current.added,
      updated: total.updated + current.updated,
      ignored: total.ignored + current.ignored,
    };
  }, emptyCounts());

  function mergeSimple<T extends { updatedAt: string }>(
    value: T,
    local: T | undefined,
    table: 'favorites' | 'preferences',
    key: string,
  ): RestoreCounts {
    if (!local) {
      operations.push({
        table,
        action: 'add',
        value: value as unknown as RestoreOperation['value'],
      });
      return { added: 1, updated: 0, ignored: 0 };
    }
    if (!isNewer(value, local)) return { added: 0, updated: 0, ignored: 1 };
    operations.push({
      table,
      action: 'update',
      value: value as unknown as RestoreOperation['value'],
    });
    void key;
    return { added: 0, updated: 1, ignored: 0 };
  }

  const favoriteCounts = document.favorites.reduce((total, value) => {
    const current = mergeSimple(value, localFavorites.get(value.songId), 'favorites', value.songId);
    return {
      added: total.added + current.added,
      updated: total.updated + current.updated,
      ignored: total.ignored + current.ignored,
    };
  }, emptyCounts());
  const preferenceCounts = document.preferences.reduce((total, value) => {
    const current = mergeSimple(value, localPreferences.get(value.key), 'preferences', value.key);
    return {
      added: total.added + current.added,
      updated: total.updated + current.updated,
      ignored: total.ignored + current.ignored,
    };
  }, emptyCounts());

  if (blockedResurrections > 0) {
    warnings.push(
      `${blockedResurrections} registro(s) excluído(s) localmente não foram ressuscitados.`,
    );
  }
  const songIds = new Set(document.songs.map((value) => value.id));
  const repertoryIds = new Set(document.repertories.map((value) => value.id));
  for (const item of document.repertoryItems) {
    if (!songIds.has(item.songId) || !repertoryIds.has(item.repertoryId)) {
      warnings.push(`O item ${item.id} aponta para uma música ou repertório ausente no backup.`);
    }
  }

  return {
    preview: {
      strategy,
      songs: countsFor(songCounts),
      repertories: countsFor(repertoryCounts),
      repertoryItems: countsFor(itemCounts),
      favorites: countsFor(favoriteCounts),
      preferences: countsFor(preferenceCounts),
      warnings,
      blockedResurrections,
    },
    operations,
  };
}

export async function previewRestore(
  document: BackupDocument,
  options: Pick<RestoreOptions, 'strategy' | 'allowTombstoneResurrection' | 'database'> = {},
): Promise<RestorePreview> {
  validateBackupDocument(document);
  const database = options.database ?? db;
  return (
    await prepareRestore(
      document,
      database,
      options.strategy ?? 'merge',
      options.allowTombstoneResurrection ?? false,
    )
  ).preview;
}

export async function restoreBackup(
  document: BackupDocument,
  options: RestoreOptions = {},
): Promise<RestoreResult> {
  validateBackupDocument(document);
  const database = options.database ?? db;
  const strategy = options.strategy ?? 'merge';
  if (strategy === 'replace' && options.confirmation !== 'SUBSTITUIR') {
    throw new Error('Digite SUBSTITUIR para confirmar a substituição dos dados locais.');
  }
  const prepared = await prepareRestore(
    document,
    database,
    strategy,
    options.allowTombstoneResurrection ?? false,
  );
  const automaticBackup = strategy === 'replace' ? await createBackup(database) : null;
  if (automaticBackup) options.onAutomaticBackup?.(automaticBackup);

  await database.transaction(
    'rw',
    database.songs,
    database.repertories,
    database.repertoryItems,
    database.favorites,
    database.preferences,
    async () => {
      if (strategy === 'replace') {
        await database.favorites.clear();
        await database.preferences.clear();
      }
      const grouped = new Map<RestoreOperation['table'], RestoreOperation['value'][]>([
        ['songs', []],
        ['repertories', []],
        ['repertoryItems', []],
        ['favorites', []],
        ['preferences', []],
      ]);
      for (const operation of prepared.operations)
        grouped.get(operation.table)?.push(operation.value);
      if (grouped.get('songs')?.length)
        await database.songs.bulkPut(grouped.get('songs') as Song[]);
      if (grouped.get('repertories')?.length)
        await database.repertories.bulkPut(grouped.get('repertories') as Repertory[]);
      if (grouped.get('repertoryItems')?.length)
        await database.repertoryItems.bulkPut(grouped.get('repertoryItems') as RepertoryItem[]);
      if (grouped.get('favorites')?.length)
        await database.favorites.bulkPut(grouped.get('favorites') as Favorite[]);
      if (grouped.get('preferences')?.length)
        await database.preferences.bulkPut(grouped.get('preferences') as Preference[]);
    },
  );
  notifyLocalSyncChange();
  return { preview: prepared.preview, automaticBackup };
}
