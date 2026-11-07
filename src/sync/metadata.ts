import { db, openDatabase, type MeuRepertorioDatabase } from '@/database';

import type { SyncCursor, SyncErrorInfo, SyncTable } from './contracts';

export const SYNC_OWNER_KEY = 'sync.ownerUserId';
export const SYNC_LAST_SYNC_KEY = 'sync.lastSyncedAt';

export const SYNC_CURSOR_KEYS = {
  songs: 'sync.cursor.songs',
  repertories: 'sync.cursor.repertories',
  repertoryItems: 'sync.cursor.repertoryItems',
} as const;

export function encodeSyncCursor(cursor: SyncCursor): string {
  return JSON.stringify(cursor);
}

export function decodeSyncCursor(value: string | null): SyncCursor | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'updatedAt' in parsed &&
      'id' in parsed &&
      typeof parsed.updatedAt === 'string' &&
      typeof parsed.id === 'string'
    ) {
      return { updatedAt: parsed.updatedAt, id: parsed.id };
    }
  } catch {
    // Cursor da primeira versao era somente updated_at.
  }
  return { updatedAt: value, id: '' };
}

export function compareSyncCursors(left: SyncCursor, right: SyncCursor): number {
  const timeComparison = left.updatedAt.localeCompare(right.updatedAt);
  return timeComparison !== 0 ? timeComparison : left.id.localeCompare(right.id);
}

export function cursorFromRemoteRow(row: { updated_at: string; id: string }): SyncCursor {
  return { updatedAt: row.updated_at, id: row.id };
}

export function cursorWithMargin(cursor: SyncCursor): SyncCursor {
  const timestamp = Date.parse(cursor.updatedAt);
  if (!Number.isFinite(timestamp)) return cursor;
  return { updatedAt: new Date(timestamp - 2 * 60 * 1000).toISOString(), id: '' };
}

export async function readSyncSetting(
  key: string,
  database: MeuRepertorioDatabase = db,
): Promise<string | null> {
  await openDatabase(database);
  const setting = await database.settings.get(key);
  return typeof setting?.value === 'string' ? setting.value : null;
}

export async function writeSyncSetting(
  key: string,
  value: string | null,
  database: MeuRepertorioDatabase = db,
): Promise<void> {
  await openDatabase(database);
  if (value === null) {
    await database.settings.delete(key);
    return;
  }
  await database.settings.put({ key, value, updatedAt: new Date().toISOString() });
}

export async function readSyncMetadata(database: MeuRepertorioDatabase = db): Promise<{
  ownerUserId: string | null;
  lastSyncedAt: string | null;
  cursors: Record<keyof typeof SYNC_CURSOR_KEYS, string | null>;
}> {
  await openDatabase(database);
  const keys = [SYNC_OWNER_KEY, SYNC_LAST_SYNC_KEY, ...Object.values(SYNC_CURSOR_KEYS)];
  const settings = await database.settings.bulkGet(keys);
  const values = new Map(settings.filter(Boolean).map((setting) => [setting?.key, setting?.value]));
  const stringValue = (key: string): string | null => {
    const value = values.get(key);
    return typeof value === 'string' ? value : null;
  };
  return {
    ownerUserId: stringValue(SYNC_OWNER_KEY),
    lastSyncedAt: stringValue(SYNC_LAST_SYNC_KEY),
    cursors: {
      songs: stringValue(SYNC_CURSOR_KEYS.songs),
      repertories: stringValue(SYNC_CURSOR_KEYS.repertories),
      repertoryItems: stringValue(SYNC_CURSOR_KEYS.repertoryItems),
    },
  };
}

export async function pendingSyncCount(database: MeuRepertorioDatabase = db): Promise<number> {
  await openDatabase(database);
  const [songs, repertories, items] = await Promise.all([
    database.songs.filter((row) => row.syncPending === true).count(),
    database.repertories.filter((row) => row.syncPending === true).count(),
    database.repertoryItems.filter((row) => row.syncPending === true).count(),
  ]);
  return songs + repertories + items;
}

export async function listSyncErrors(
  database: MeuRepertorioDatabase = db,
): Promise<SyncErrorInfo[]> {
  await openDatabase(database);
  const tables: readonly [SyncTable, MeuRepertorioDatabase[keyof MeuRepertorioDatabase]][] = [
    ['songs', database.songs],
    ['repertories', database.repertories],
    ['repertoryItems', database.repertoryItems],
  ];
  const errors: SyncErrorInfo[] = [];
  for (const [table, source] of tables) {
    const rows = await (source as typeof database.songs)
      .filter((row) => typeof row.syncError === 'string' && row.syncError.length > 0)
      .toArray();
    for (const row of rows) {
      if (row.syncError) errors.push({ table, id: row.id, message: row.syncError });
    }
  }
  return errors;
}
