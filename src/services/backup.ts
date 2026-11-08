import type { Table } from 'dexie';

import { db, openDatabase, type MeuRepertorioDatabase } from '@/database';
import type {
  Favorite,
  JsonValue,
  Preference,
  Repertory,
  RepertoryItem,
  Setting,
  Song,
} from '@/types';

export const BACKUP_FORMAT = 'meu-repertorio-backup';
export const BACKUP_VERSION = 1 as const;
export const BACKUP_MAX_BYTES = 50 * 1024 * 1024;
const BACKUP_APPLICATION = 'Meu Repertório V2';
const INTEGRITY_ALGORITHM = 'SHA-256';

export type BackupTableName =
  'songs' | 'repertories' | 'repertoryItems' | 'favorites' | 'preferences' | 'settings';

export type BackupData = {
  readonly songs: readonly Song[];
  readonly repertories: readonly Repertory[];
  readonly repertoryItems: readonly RepertoryItem[];
  readonly favorites: readonly Favorite[];
  readonly preferences: readonly Preference[];
  readonly settings: readonly Setting[];
};

export interface BackupFile {
  readonly format: typeof BACKUP_FORMAT;
  readonly version: typeof BACKUP_VERSION;
  readonly application: typeof BACKUP_APPLICATION;
  readonly createdAt: string;
  readonly data: BackupData;
  readonly integrity: {
    readonly algorithm: typeof INTEGRITY_ALGORITHM;
    readonly digest: string;
  };
}

export type RestoreMode = 'merge' | 'replace-conflicts';

export interface RestoreTablePlan {
  readonly table: BackupTableName;
  readonly backupCount: number;
  readonly newCount: number;
  readonly unchangedCount: number;
  readonly conflictCount: number;
}

export interface RestorePlan {
  readonly tables: readonly RestoreTablePlan[];
  readonly total: number;
  readonly newCount: number;
  readonly unchangedCount: number;
  readonly conflictCount: number;
}

export interface RestoreProgress {
  readonly table: BackupTableName;
  readonly tableIndex: number;
  readonly tableCount: number;
  readonly processed: number;
  readonly total: number;
}

export interface RestoreResult {
  readonly mode: RestoreMode;
  readonly added: number;
  readonly unchanged: number;
  readonly overwritten: number;
  readonly conflicts: number;
  readonly total: number;
}

export interface RestoreOptions {
  readonly database?: MeuRepertorioDatabase;
  readonly onProgress?: (progress: RestoreProgress) => void;
}

export class BackupError extends Error {
  readonly code: string;

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'BackupError';
    this.code = code;
  }
}

export class BackupValidationError extends BackupError {
  constructor(message: string) {
    super('INVALID_BACKUP', message);
    this.name = 'BackupValidationError';
  }
}

export class BackupIntegrityError extends BackupError {
  constructor(message = 'A integridade do backup não pôde ser confirmada.') {
    super('INVALID_INTEGRITY', message);
    this.name = 'BackupIntegrityError';
  }
}

export class BackupRestoreError extends BackupError {
  constructor(message: string, options?: ErrorOptions) {
    super('RESTORE_FAILED', message, options);
    this.name = 'BackupRestoreError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every((item) => isJsonValue(item));
  if (!isRecord(value)) return false;
  return Object.values(value).every((item) => isJsonValue(item));
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value);
}

function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0;
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

function isArrayOf<T>(value: unknown, guard: (item: unknown) => boolean): value is T[] {
  return Array.isArray(value) && value.every(guard);
}

function isBaseEntity(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    isString(value.createdAt) &&
    isString(value.updatedAt) &&
    isNullableString(value.deletedAt) &&
    isInteger(value.revision) &&
    value.revision > 0 &&
    typeof value.syncPending === 'boolean' &&
    (value.syncError === undefined || isNullableString(value.syncError)) &&
    (value.legacyId === undefined || isString(value.legacyId))
  );
}

function isParsedChord(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    isInteger(value.position) &&
    isString(value.symbol) &&
    isString(value.rawSymbol) &&
    isInteger(value.sourceStart) &&
    isInteger(value.sourceEnd) &&
    isInteger(value.sourceStartOffset) &&
    isInteger(value.sourceEndOffset) &&
    isInteger(value.visualPosition) &&
    value.positionUnit === 'code-point' &&
    typeof value.inline === 'boolean'
  );
}

function isParserDiagnostic(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const severities = ['error', 'warning', 'info'];
  const codes = [
    'EMPTY_INPUT',
    'NO_CONTENT',
    'KEY_NOT_PROVIDED',
    'KEY_INFERRED',
    'NO_CHORDS_FOUND',
    'UNRECOGNIZED_CHORD',
    'INVALID_KEY',
    'METADATA_IGNORED',
    'PARTIAL_PARSE',
  ];
  return (
    typeof value.severity === 'string' &&
    severities.includes(value.severity) &&
    isString(value.code) &&
    codes.includes(value.code) &&
    isString(value.message) &&
    (value.lineNumber === null || isInteger(value.lineNumber)) &&
    (value.column === null || isInteger(value.column)) &&
    isNullableString(value.sourceText)
  );
}

function isParsedSongMetadata(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    isNullableString(value.title) &&
    isNullableString(value.artist) &&
    isNullableString(value.originalKey) &&
    isNullableString(value.currentKey) &&
    isNullableString(value.capo) &&
    isArrayOf(value.extraLines, isString) &&
    (value.originalKeyInferred === undefined || typeof value.originalKeyInferred === 'boolean')
  );
}

function isParsedSongLine(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const kinds = ['blank', 'section', 'lyric', 'chords', 'chord-lyric'];
  return (
    typeof value.kind === 'string' &&
    kinds.includes(value.kind) &&
    isInteger(value.lineNumber) &&
    isArrayOf(value.sourceLineNumbers, isInteger) &&
    isString(value.sourceText) &&
    isArrayOf(value.sourceTexts, isString) &&
    isNullableString(value.text) &&
    isNullableString(value.chordText) &&
    isNullableString(value.lyricText) &&
    isNullableString(value.sectionLabel) &&
    isArrayOf(value.chords, isParsedChord) &&
    isString(value.reconstructedText)
  );
}

function isParsedSongReport(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    isInteger(value.lineCount) &&
    isInteger(value.chordCount) &&
    isInteger(value.lyricCount) &&
    isInteger(value.warningCount) &&
    isInteger(value.errorCount)
  );
}

function isParsedSong(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    value.version === 1 &&
    typeof value.valid === 'boolean' &&
    isString(value.originalText) &&
    isString(value.normalizedText) &&
    isString(value.body) &&
    isString(value.reconstructedText) &&
    isNullableString(value.title) &&
    isNullableString(value.artist) &&
    isNullableString(value.originalKey) &&
    isNullableString(value.currentKey) &&
    isNullableString(value.capo) &&
    isParsedSongMetadata(value.metadata) &&
    isArrayOf(value.lines, isParsedSongLine) &&
    isArrayOf(value.diagnostics, isParserDiagnostic) &&
    isParsedSongReport(value.report) &&
    isJsonValue(value)
  );
}

function isSong(value: unknown): value is Song {
  if (!isBaseEntity(value) || !isRecord(value)) return false;
  return (
    isNonEmptyString(value.title) &&
    isNullableString(value.artist) &&
    isNullableString(value.originalKey) &&
    isNullableString(value.currentKey) &&
    isNullableString(value.preferredKey) &&
    (value.capo === null || (typeof value.capo === 'number' && Number.isInteger(value.capo))) &&
    isNullableString(value.tuning) &&
    isNullableString(value.rhythm) &&
    isNullableString(value.strumming) &&
    isNullableString(value.difficulty) &&
    isString(value.content) &&
    isParsedSong(value.structure) &&
    isNullableString(value.notes) &&
    isJsonValue(value)
  );
}

function isRepertory(value: unknown): value is Repertory {
  if (!isBaseEntity(value) || !isRecord(value)) return false;
  return isNonEmptyString(value.name) && isNullableString(value.description) && isJsonValue(value);
}

function isRepertoryItem(value: unknown): value is RepertoryItem {
  if (!isBaseEntity(value) || !isRecord(value)) return false;
  return (
    isNonEmptyString(value.repertoryId) &&
    isNonEmptyString(value.songId) &&
    typeof value.position === 'number' &&
    Number.isFinite(value.position) &&
    isNullableString(value.preferredKey) &&
    isJsonValue(value)
  );
}

function isFavorite(value: unknown): value is Favorite {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.songId) &&
    isString(value.createdAt) &&
    isString(value.updatedAt) &&
    isNullableString(value.deletedAt) &&
    isInteger(value.revision) &&
    value.revision > 0 &&
    isJsonValue(value)
  );
}

function isPreference(value: unknown): value is Preference {
  if (!isRecord(value)) return false;
  return isNonEmptyString(value.key) && isString(value.updatedAt) && isJsonValue(value.value);
}

function isSafeSettingKey(key: string): boolean {
  return !/^(?:sync\.|auth\.|session\.|token\.)/iu.test(key);
}

function isSetting(value: unknown): value is Setting {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.key) &&
    isSafeSettingKey(value.key) &&
    isString(value.updatedAt) &&
    isJsonValue(value.value)
  );
}

function assertUnique<T>(items: readonly T[], keyOf: (item: T) => string, label: string): void {
  const keys = new Set<string>();
  for (const item of items) {
    const key = keyOf(item);
    if (keys.has(key))
      throw new BackupValidationError(`O backup contém ${label} duplicado: ${key}.`);
    keys.add(key);
  }
}

function assertBackupData(value: unknown): asserts value is BackupData {
  if (!isRecord(value)) throw new BackupValidationError('A seção de dados do backup é inválida.');
  const { songs, repertories, repertoryItems, favorites, preferences, settings } = value;
  if (
    !Array.isArray(songs) ||
    !songs.every(isSong) ||
    !Array.isArray(repertories) ||
    !repertories.every(isRepertory) ||
    !Array.isArray(repertoryItems) ||
    !repertoryItems.every(isRepertoryItem) ||
    !Array.isArray(favorites) ||
    !favorites.every(isFavorite) ||
    !Array.isArray(preferences) ||
    !preferences.every(isPreference) ||
    !Array.isArray(settings) ||
    !settings.every(isSetting)
  ) {
    throw new BackupValidationError('Um ou mais registros do backup têm formato inválido.');
  }

  assertUnique(songs, (song) => song.id, 'música');
  assertUnique(repertories, (repertory) => repertory.id, 'repertório');
  assertUnique(repertoryItems, (item) => item.id, 'item de repertório');
  assertUnique(favorites, (favorite) => favorite.songId, 'favorito');
  assertUnique(preferences, (preference) => preference.key, 'preferência');
  assertUnique(settings, (setting) => setting.key, 'configuração');

  const songIds = new Set(songs.map((song) => song.id));
  const repertoryIds = new Set(repertories.map((repertory) => repertory.id));
  for (const item of repertoryItems) {
    if (!songIds.has(item.songId) || !repertoryIds.has(item.repertoryId)) {
      throw new BackupValidationError(
        `O item de repertório ${item.id} aponta para uma música ou repertório inexistente.`,
      );
    }
  }
  for (const favorite of favorites) {
    if (!songIds.has(favorite.songId)) {
      throw new BackupValidationError(
        `O favorito aponta para uma música inexistente: ${favorite.songId}.`,
      );
    }
  }
}

function safeSettings(settings: readonly Setting[]): Setting[] {
  return settings.filter((setting) => isSafeSettingKey(setting.key));
}

function sortBy<T>(items: readonly T[], keyOf: (item: T) => string): T[] {
  return [...items].sort((left, right) => keyOf(left).localeCompare(keyOf(right)));
}

async function readBackupData(database: MeuRepertorioDatabase): Promise<BackupData> {
  await openDatabase(database);
  const [songs, repertories, repertoryItems, favorites, preferences, settings] = await Promise.all([
    database.songs.toArray(),
    database.repertories.toArray(),
    database.repertoryItems.toArray(),
    database.favorites.toArray(),
    database.preferences.toArray(),
    database.settings.toArray(),
  ]);
  return {
    songs: sortBy(songs, (song) => song.id),
    repertories: sortBy(repertories, (repertory) => repertory.id),
    repertoryItems: sortBy(repertoryItems, (item) => item.id),
    favorites: sortBy(favorites, (favorite) => favorite.songId),
    preferences: sortBy(preferences, (preference) => preference.key),
    settings: sortBy(safeSettings(settings), (setting) => setting.key),
  };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => canonicalize(item));
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

async function digestForData(data: BackupData): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new BackupError(
      'CRYPTO_UNAVAILABLE',
      'Este navegador não oferece validação criptográfica para backups.',
    );
  }
  const bytes = new TextEncoder().encode(canonicalJson(data));
  const hash = await subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function verifyBackup(value: BackupFile): Promise<void> {
  assertBackupData(value.data);
  const expected = await digestForData(value.data);
  if (expected !== value.integrity.digest.toLocaleLowerCase('en-US')) {
    throw new BackupIntegrityError();
  }
}

export async function createBackup(database: MeuRepertorioDatabase = db): Promise<BackupFile> {
  const data = await readBackupData(database);
  assertBackupData(data);
  const digest = await digestForData(data);
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    application: BACKUP_APPLICATION,
    createdAt: new Date().toISOString(),
    data,
    integrity: { algorithm: INTEGRITY_ALGORITHM, digest },
  };
}

export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2);
}

export async function parseBackupText(text: string): Promise<BackupFile> {
  if (new TextEncoder().encode(text).byteLength > BACKUP_MAX_BYTES) {
    throw new BackupValidationError('O arquivo de backup excede o limite de 50 MB.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new BackupValidationError('O arquivo selecionado não contém um JSON válido.');
  }
  if (!isRecord(parsed))
    throw new BackupValidationError('O arquivo de backup precisa ser um objeto JSON.');
  if (parsed.format !== BACKUP_FORMAT) {
    throw new BackupValidationError('Este arquivo não é um backup do Meu Repertório.');
  }
  if (parsed.version !== BACKUP_VERSION) {
    throw new BackupValidationError(
      `A versão do backup não é compatível: ${String(parsed.version)}.`,
    );
  }
  if (parsed.application !== BACKUP_APPLICATION || !isString(parsed.createdAt)) {
    throw new BackupValidationError('O cabeçalho do backup está incompleto.');
  }
  if (
    !isRecord(parsed.integrity) ||
    parsed.integrity.algorithm !== INTEGRITY_ALGORITHM ||
    !isString(parsed.integrity.digest) ||
    !/^[a-f0-9]{64}$/iu.test(parsed.integrity.digest)
  ) {
    throw new BackupValidationError('A seção de integridade do backup é inválida.');
  }

  assertBackupData(parsed.data);
  const backup = parsed as unknown as BackupFile;
  await verifyBackup(backup);
  return backup;
}

export async function readBackupFile(file: Blob): Promise<BackupFile> {
  if (file.size > BACKUP_MAX_BYTES) {
    throw new BackupValidationError('O arquivo de backup excede o limite de 50 MB.');
  }
  return parseBackupText(await file.text());
}

function keyOf(table: BackupTableName, row: BackupData[BackupTableName][number]): string {
  if (table === 'favorites') return (row as Favorite).songId;
  if (table === 'preferences' || table === 'settings') return (row as Preference | Setting).key;
  return (row as Song | Repertory | RepertoryItem).id;
}

function tableRows(
  data: BackupData,
  table: BackupTableName,
): readonly BackupData[BackupTableName][number][] {
  return data[table];
}

function tablesFor(database: MeuRepertorioDatabase): Record<BackupTableName, Table<never, string>> {
  return {
    songs: database.songs as unknown as Table<never, string>,
    repertories: database.repertories as unknown as Table<never, string>,
    repertoryItems: database.repertoryItems as unknown as Table<never, string>,
    favorites: database.favorites as unknown as Table<never, string>,
    preferences: database.preferences as unknown as Table<never, string>,
    settings: database.settings as unknown as Table<never, string>,
  };
}

const BACKUP_TABLES: readonly BackupTableName[] = [
  'songs',
  'repertories',
  'repertoryItems',
  'favorites',
  'preferences',
  'settings',
];

function sameRecord(left: unknown, right: unknown): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

export async function planRestore(
  backup: BackupFile,
  database: MeuRepertorioDatabase = db,
): Promise<RestorePlan> {
  await verifyBackup(backup);
  await openDatabase(database);
  const tables = tablesFor(database);
  const plans: RestoreTablePlan[] = [];

  for (const table of BACKUP_TABLES) {
    const rows = tableRows(backup.data, table);
    let newCount = 0;
    let unchangedCount = 0;
    let conflictCount = 0;
    for (const row of rows) {
      const existing = await tables[table].get(keyOf(table, row));
      if (!existing) newCount += 1;
      else if (sameRecord(existing, row)) unchangedCount += 1;
      else conflictCount += 1;
    }
    plans.push({
      table,
      backupCount: rows.length,
      newCount,
      unchangedCount,
      conflictCount,
    });
  }

  return {
    tables: plans,
    total: plans.reduce((sum, plan) => sum + plan.backupCount, 0),
    newCount: plans.reduce((sum, plan) => sum + plan.newCount, 0),
    unchangedCount: plans.reduce((sum, plan) => sum + plan.unchangedCount, 0),
    conflictCount: plans.reduce((sum, plan) => sum + plan.conflictCount, 0),
  };
}

async function restoreTable(
  table: BackupTableName,
  rows: readonly BackupData[BackupTableName][number][],
  target: Table<never, string>,
  mode: RestoreMode,
): Promise<{ added: number; unchanged: number; overwritten: number; conflicts: number }> {
  let added = 0;
  let unchanged = 0;
  let overwritten = 0;
  let conflicts = 0;
  for (const row of rows) {
    const key = keyOf(table, row);
    const existing = await target.get(key);
    if (!existing) {
      await target.add(row as never);
      added += 1;
    } else if (sameRecord(existing, row)) {
      unchanged += 1;
    } else if (mode === 'replace-conflicts') {
      await target.put(row as never);
      overwritten += 1;
    } else {
      conflicts += 1;
    }
  }
  return { added, unchanged, overwritten, conflicts };
}

export async function restoreBackup(
  backup: BackupFile,
  mode: RestoreMode,
  options: RestoreOptions = {},
): Promise<RestoreResult> {
  await verifyBackup(backup);
  const database = options.database ?? db;
  await openDatabase(database);
  const tables = tablesFor(database);
  const total = BACKUP_TABLES.reduce((sum, table) => sum + tableRows(backup.data, table).length, 0);
  let added = 0;
  let unchanged = 0;
  let overwritten = 0;
  let conflicts = 0;
  let processed = 0;

  try {
    await database.transaction(
      'rw',
      [
        database.songs,
        database.repertories,
        database.repertoryItems,
        database.favorites,
        database.preferences,
        database.settings,
      ],
      async () => {
        for (const [tableIndex, table] of BACKUP_TABLES.entries()) {
          const result = await restoreTable(
            table,
            tableRows(backup.data, table),
            tables[table],
            mode,
          );
          added += result.added;
          unchanged += result.unchanged;
          overwritten += result.overwritten;
          conflicts += result.conflicts;
          processed += tableRows(backup.data, table).length;
          options.onProgress?.({
            table,
            tableIndex: tableIndex + 1,
            tableCount: BACKUP_TABLES.length,
            processed,
            total,
          });
        }
      },
    );
  } catch (cause: unknown) {
    throw new BackupRestoreError(
      cause instanceof BackupError
        ? cause.message
        : 'Não foi possível restaurar o backup. A biblioteca original foi preservada.',
      { cause },
    );
  }

  return { mode, added, unchanged, overwritten, conflicts, total };
}

export function songTextFileName(song: Pick<Song, 'title'>): string {
  const safeTitle = song.title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .replace(/[^a-z0-9]+/giu, '-')
    .replace(/^-+|-+$/gu, '')
    .toLocaleLowerCase('en-US');
  return `${safeTitle || 'musica'}.txt`;
}

export function downloadTextFile(content: string, fileName: string, mimeType: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    throw new BackupError('DOWNLOAD_UNAVAILABLE', 'O download não está disponível neste ambiente.');
  }
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
