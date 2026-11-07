import { db, openDatabase, type MeuRepertorioDatabase } from '@/database';
import type { Favorite, Preference, Repertory, RepertoryItem, Song } from '@/types';

import {
  BACKUP_APP,
  BACKUP_FORMAT_VERSION,
  type BackupDocument,
  serializeBackup,
  validateBackupDocument,
} from './format';

export const LAST_BACKUP_EXPORT_KEY = 'backup.lastExportedAt';

function withoutSyncFields<T extends { syncPending?: boolean; syncError?: string | null }>(
  value: T,
): Omit<T, 'syncPending' | 'syncError'> {
  const copy = { ...value };
  delete copy.syncPending;
  delete copy.syncError;
  return copy;
}

export async function createBackup(database: MeuRepertorioDatabase = db): Promise<BackupDocument> {
  await openDatabase(database);
  const [songs, repertories, repertoryItems, favorites, preferences] = await Promise.all([
    database.songs.toArray(),
    database.repertories.toArray(),
    database.repertoryItems.toArray(),
    database.favorites.toArray(),
    database.preferences.toArray(),
  ]);
  const document: BackupDocument = {
    app: BACKUP_APP,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    counts: {
      songs: songs.length,
      repertories: repertories.length,
      repertoryItems: repertoryItems.length,
      favorites: favorites.length,
      preferences: preferences.length,
    },
    songs: songs.map(withoutSyncFields),
    repertories: repertories.map(withoutSyncFields),
    repertoryItems: repertoryItems.map(withoutSyncFields),
    favorites,
    preferences,
  };
  return document;
}

export function backupFilename(date = new Date()): string {
  return `meu-repertorio-backup-${date.toISOString().slice(0, 10)}.json`;
}

export function downloadBackupDocument(backup: BackupDocument, filename = backupFilename()): void {
  if (typeof window === 'undefined' || typeof window.document === 'undefined') {
    throw new Error('O download só pode ser iniciado no navegador.');
  }
  const blob = new Blob([serializeBackup(backup)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportBackup(database: MeuRepertorioDatabase = db): Promise<BackupDocument> {
  const backup = await createBackup(database);
  await database.settings.put({
    key: LAST_BACKUP_EXPORT_KEY,
    value: backup.exportedAt,
    updatedAt: backup.exportedAt,
  });
  downloadBackupDocument(backup);
  return backup;
}

export async function getLastBackupExportedAt(
  database: MeuRepertorioDatabase = db,
): Promise<string | null> {
  await openDatabase(database);
  const setting = await database.settings.get(LAST_BACKUP_EXPORT_KEY);
  return typeof setting?.value === 'string' ? setting.value : null;
}

export function parseAndValidateBackup(text: string): BackupDocument {
  return validateBackupDocument(JSON.parse(text) as unknown);
}

export type BackupEntity = Song | Repertory | RepertoryItem | Favorite | Preference;
