import { db, openDatabase, type MeuRepertorioDatabase } from '@/database';
import { parseSongText } from '@/features/parser';
import { transposeTonality } from '@/features/transpose';
import type { Repertory, RepertoryItem, Song } from '@/types';
import { notifyLocalSyncChange } from '@/sync';

export interface LegacySongRecord {
  readonly id?: string | number;
  readonly title?: string;
  readonly artist?: string;
  readonly key?: string;
  readonly body?: string;
  readonly structure?: Song['structure'];
  readonly semi?: number;
  readonly pref?: string;
  readonly capo?: number | string | null;
  readonly notes?: string | null;
  readonly observation?: string | null;
  readonly createdAt?: string | number;
  readonly updatedAt?: string | number;
}

export interface LegacySetlistItem {
  readonly id?: string | number;
  readonly songId?: string | number;
  readonly song_id?: string | number;
  readonly idSong?: string | number;
  readonly preferredKey?: string | null;
  readonly key?: string | null;
  readonly pref?: string | null;
  readonly semi?: number | null;
}

export interface LegacySetlistRecord {
  readonly id?: string | number;
  readonly name?: string;
  readonly items?: readonly (string | number | LegacySetlistItem)[];
  readonly deleted?: boolean;
  readonly createdAt?: string | number;
  readonly updatedAt?: string | number;
}

export interface LegacyPayload {
  readonly app?: string;
  readonly v?: number;
  readonly songs: readonly LegacySongRecord[];
  readonly setlists: readonly LegacySetlistRecord[];
  readonly legacyPdfCount?: number;
}

export interface LegacyImportReport {
  readonly imported: number;
  readonly ignored: number;
  readonly warnings: readonly string[];
  readonly errors: readonly string[];
}

export interface PreparedLegacyImport {
  readonly songs: readonly Song[];
  readonly repertories: readonly Repertory[];
  readonly items: readonly RepertoryItem[];
  readonly legacyPdfCount?: number;
  readonly report: LegacyImportReport;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function normalizedPair(title: string, artist: string | null): string {
  return `${title} ${artist ?? ''}`
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '');
}

function deterministicId(kind: string, legacyId: string): string {
  return `v1-${kind}-${stableHash(legacyId)}`;
}

function toIso(value: string | number | undefined, fallback: string): string {
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value).toISOString();
  if (typeof value === 'string' && Number.isFinite(Date.parse(value)))
    return new Date(value).toISOString();
  return fallback;
}

function parseLegacyPayload(input: unknown): LegacyPayload {
  if (!isRecord(input) || !Array.isArray(input.songs)) {
    throw new Error('O arquivo não possui o formato de backup da V1.');
  }
  const rawSetlists = Array.isArray(input.setlists)
    ? input.setlists
    : Array.isArray(input.repertoires)
      ? input.repertoires
      : [];
  if (input.v !== undefined && input.v !== 3) {
    throw new Error('A versão do backup antigo não é compatível.');
  }
  return {
    ...(typeof input.app === 'string' ? { app: input.app } : {}),
    ...(typeof input.v === 'number' ? { v: input.v } : {}),
    songs: input.songs as LegacySongRecord[],
    setlists: rawSetlists as LegacySetlistRecord[],
  };
}

export function parseLegacyBackupText(text: string): LegacyPayload {
  try {
    return parseLegacyPayload(JSON.parse(text) as unknown);
  } catch (cause: unknown) {
    throw new Error(cause instanceof Error ? cause.message : 'Backup antigo inválido.', { cause });
  }
}

export function looksLikeLegacyBackup(input: unknown): boolean {
  return (
    isRecord(input) &&
    Array.isArray(input.songs) &&
    (input.v === 3 || Array.isArray(input.setlists))
  );
}

export function prepareLegacyImport(
  payload: LegacyPayload,
  now = new Date().toISOString(),
): PreparedLegacyImport {
  const warnings: string[] = [];
  const errors: string[] = [];
  const songs: Song[] = [];
  const songIdByLegacyId = new Map<string, string>();

  for (const [index, legacy] of payload.songs.entries()) {
    const title = asString(legacy.title) ?? `Música importada ${index + 1}`;
    const artist = asString(legacy.artist);
    const content = typeof legacy.body === 'string' ? legacy.body : '';
    const legacyId = String(legacy.id ?? normalizedPair(title, artist));
    if (!content.trim()) {
      warnings.push(`A música "${title}" não possui conteúdo e foi ignorada.`);
      continue;
    }
    const parsed = parseSongText(content);
    if (!parsed.valid) {
      errors.push(`A música "${title}" não pôde ser interpretada pelo parser da V2.`);
      continue;
    }
    const originalKey = asString(legacy.key) ?? parsed.originalKey;
    const song: Song = {
      id: deterministicId('song', legacyId),
      legacyId: `v1:song:${legacyId}`,
      title,
      artist,
      originalKey,
      currentKey: originalKey,
      preferredKey: null,
      capo: typeof legacy.capo === 'number' ? legacy.capo : null,
      tuning: null,
      rhythm: null,
      strumming: null,
      difficulty: null,
      content,
      structure: {
        ...parsed,
        title,
        artist,
        originalKey,
        currentKey: originalKey,
        metadata: { ...parsed.metadata, title, artist, originalKey, currentKey: originalKey },
      },
      notes: asString(legacy.notes) ?? asString(legacy.observation),
      createdAt: toIso(legacy.createdAt, now),
      updatedAt: toIso(legacy.updatedAt, now),
      deletedAt: null,
      revision: 1,
      syncPending: true,
      syncError: null,
    };
    songs.push(song);
    songIdByLegacyId.set(legacyId, song.id);
  }

  const repertories: Repertory[] = [];
  const items: RepertoryItem[] = [];
  for (const [index, legacy] of payload.setlists.entries()) {
    const name = asString(legacy.name) ?? `Repertório importado ${index + 1}`;
    const legacyId = String(legacy.id ?? name);
    const repertoryId = deterministicId('repertory', legacyId);
    const createdAt = toIso(legacy.createdAt, now);
    repertories.push({
      id: repertoryId,
      legacyId: `v1:setlist:${legacyId}`,
      name,
      description: null,
      createdAt,
      updatedAt: toIso(legacy.updatedAt, createdAt),
      deletedAt: legacy.deleted ? toIso(legacy.updatedAt, now) : null,
      revision: 1,
      syncPending: true,
      syncError: null,
    });
    for (const [position, rawItem] of (legacy.items ?? []).entries()) {
      const item = typeof rawItem === 'object' && rawItem !== null ? rawItem : { songId: rawItem };
      const legacySongId = String(item.songId ?? item.song_id ?? item.idSong ?? '');
      const songId = songIdByLegacyId.get(legacySongId);
      if (!songId) {
        warnings.push(
          `O repertório "${name}" possui uma música inexistente na posição ${position + 1}.`,
        );
        continue;
      }
      const itemLegacyId = String(item.id ?? `${legacyId}:${legacySongId}:${position}`);
      const legacySong = songs.find((song) => song.id === songId);
      const itemKey =
        asString(item.preferredKey) ??
        asString(item.key) ??
        (typeof item.semi === 'number' && legacySong?.originalKey
          ? transposeTonality(
              legacySong.originalKey,
              item.semi,
              asString(item.pref) === 'flat' ? 'flat' : 'auto',
            )
          : null);
      items.push({
        id: deterministicId('item', itemLegacyId),
        legacyId: `v1:item:${itemLegacyId}`,
        repertoryId,
        songId,
        position: (position + 1) * 1000,
        preferredKey: itemKey,
        createdAt,
        updatedAt: toIso(legacy.updatedAt, createdAt),
        deletedAt: null,
        revision: 1,
        syncPending: true,
        syncError: null,
      });
    }
  }

  return {
    songs,
    repertories,
    items,
    ...(typeof payload.legacyPdfCount === 'number'
      ? { legacyPdfCount: payload.legacyPdfCount }
      : {}),
    report: {
      imported: songs.length + repertories.length + items.length,
      ignored: warnings.length,
      warnings,
      errors,
    },
  };
}

export async function importLegacyData(
  prepared: PreparedLegacyImport,
  database: MeuRepertorioDatabase = db,
): Promise<LegacyImportReport> {
  await openDatabase(database);
  let imported = 0;
  let ignored = prepared.report.ignored;
  const warnings = [...prepared.report.warnings];
  const errors = [...prepared.report.errors];
  await database.transaction(
    'rw',
    database.songs,
    database.repertories,
    database.repertoryItems,
    async () => {
      const [songs, repertories, items] = await Promise.all([
        database.songs.toArray(),
        database.repertories.toArray(),
        database.repertoryItems.toArray(),
      ]);
      const existingSongIds = new Set(songs.map((song) => song.legacyId));
      const existingSongPairs = new Set(
        songs.map((song) => normalizedPair(song.title, song.artist)),
      );
      for (const song of prepared.songs) {
        if (
          existingSongIds.has(song.legacyId) ||
          existingSongPairs.has(normalizedPair(song.title, song.artist))
        ) {
          ignored += 1;
          continue;
        }
        await database.songs.put(song);
        imported += 1;
        existingSongIds.add(song.legacyId);
        existingSongPairs.add(normalizedPair(song.title, song.artist));
      }
      const existingRepertories = new Set(repertories.map((repertory) => repertory.legacyId));
      for (const repertory of prepared.repertories) {
        if (existingRepertories.has(repertory.legacyId)) {
          ignored += 1;
          continue;
        }
        await database.repertories.put(repertory);
        imported += 1;
      }
      const existingItems = new Set(items.map((item) => item.legacyId));
      for (const item of prepared.items) {
        if (existingItems.has(item.legacyId)) {
          ignored += 1;
          continue;
        }
        await database.repertoryItems.put(item);
        imported += 1;
      }
    },
  );
  if (imported > 0) notifyLocalSyncChange();
  return { imported, ignored, warnings, errors };
}

export async function readLegacyIndexedDb(
  databaseName = 'caderno-cifras',
): Promise<LegacyPayload | null> {
  if (typeof indexedDB === 'undefined' || typeof indexedDB.databases !== 'function') return null;
  const databases = await indexedDB.databases();
  if (!databases.some((entry) => entry.name === databaseName)) return null;
  const legacyDb = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName);
    request.onupgradeneeded = () => {
      request.transaction?.abort();
      reject(new Error('O banco antigo não possui uma versão compatível.'));
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('Não foi possível ler o banco antigo.'));
  });
  try {
    const readStore = (storeName: string): Promise<unknown[]> => {
      if (!legacyDb.objectStoreNames.contains(storeName)) return Promise.resolve([]);
      return new Promise((resolve, reject) => {
        const request = legacyDb.transaction(storeName, 'readonly').objectStore(storeName).getAll();
        request.onsuccess = () => resolve(request.result as unknown[]);
        request.onerror = () =>
          reject(request.error ?? new Error(`Não foi possível ler ${storeName}.`));
      });
    };
    const [songs, setlists] = await Promise.all([readStore('songs'), readStore('setlists')]);
    return parseLegacyPayload({ songs, setlists });
  } finally {
    legacyDb.close();
  }
}
