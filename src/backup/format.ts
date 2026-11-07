import type { Favorite, Preference, Repertory, RepertoryItem, Song } from '@/types';

export const BACKUP_APP = 'meu-repertorio';
export const BACKUP_FORMAT_VERSION = 1;
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;

export type BackupSong = Omit<Song, 'syncPending' | 'syncError'>;
export type BackupRepertory = Omit<Repertory, 'syncPending' | 'syncError'>;
export type BackupRepertoryItem = Omit<RepertoryItem, 'syncPending' | 'syncError'>;

export interface BackupCounts {
  readonly songs: number;
  readonly repertories: number;
  readonly repertoryItems: number;
  readonly favorites: number;
  readonly preferences: number;
}

export interface BackupDocument {
  readonly app: typeof BACKUP_APP;
  readonly formatVersion: typeof BACKUP_FORMAT_VERSION;
  readonly exportedAt: string;
  readonly counts: BackupCounts;
  readonly songs: readonly BackupSong[];
  readonly repertories: readonly BackupRepertory[];
  readonly repertoryItems: readonly BackupRepertoryItem[];
  readonly favorites: readonly Favorite[];
  readonly preferences: readonly Preference[];
}

export class BackupValidationError extends Error {
  readonly code: 'empty' | 'size' | 'format' | 'future' | 'field';

  constructor(code: BackupValidationError['code'], message: string) {
    super(message);
    this.name = 'BackupValidationError';
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value);
}

function validDate(value: unknown): boolean {
  return isString(value) && Number.isFinite(Date.parse(value));
}

function validateEntity(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (
    !isRecord(value) ||
    !isString(value.id) ||
    !validDate(value.createdAt) ||
    !validDate(value.updatedAt)
  ) {
    throw new BackupValidationError(
      'field',
      `${label} possui campos de identificação ou data inválidos.`,
    );
  }
  if (
    !isNullableString(value.deletedAt) ||
    typeof value.revision !== 'number' ||
    !Number.isInteger(value.revision) ||
    value.revision < 1
  ) {
    throw new BackupValidationError('field', `${label} possui revision ou deletedAt inválidos.`);
  }
}

function validateArray(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value))
    throw new BackupValidationError('format', `${label} precisa ser uma lista.`);
  return value;
}

export function validateBackupDocument(input: unknown): BackupDocument {
  if (!isRecord(input) || input.app !== BACKUP_APP) {
    throw new BackupValidationError('format', 'Este arquivo não é um backup do Meu Repertório.');
  }
  if (typeof input.formatVersion !== 'number' || input.formatVersion > BACKUP_FORMAT_VERSION) {
    throw new BackupValidationError(
      'future',
      'Este backup foi criado por uma versão mais nova do app.',
    );
  }
  if (input.formatVersion !== BACKUP_FORMAT_VERSION || !validDate(input.exportedAt)) {
    throw new BackupValidationError(
      'format',
      'O cabeçalho do backup é inválido ou está incompleto.',
    );
  }

  const songs = validateArray(input.songs, 'songs');
  const repertories = validateArray(input.repertories, 'repertories');
  const repertoryItems = validateArray(input.repertoryItems, 'repertoryItems');
  const favorites = validateArray(input.favorites, 'favorites');
  const preferences = validateArray(input.preferences, 'preferences');

  for (const song of songs) {
    validateEntity(song, 'Uma música');
    if (!isString(song.title) || !isString(song.content) || !isRecord(song.structure)) {
      throw new BackupValidationError('field', 'Uma música possui conteúdo inválido.');
    }
  }
  for (const repertory of repertories) {
    validateEntity(repertory, 'Um repertório');
    if (!isString(repertory.name) || !isNullableString(repertory.description)) {
      throw new BackupValidationError('field', 'Um repertório possui campos inválidos.');
    }
  }
  for (const item of repertoryItems) {
    validateEntity(item, 'Um item de repertório');
    if (
      !isString(item.repertoryId) ||
      !isString(item.songId) ||
      typeof item.position !== 'number' ||
      !Number.isFinite(item.position) ||
      !isNullableString(item.preferredKey)
    ) {
      throw new BackupValidationError('field', 'Um item de repertório possui campos inválidos.');
    }
  }
  for (const favorite of favorites) {
    if (
      !isRecord(favorite) ||
      !isString(favorite.songId) ||
      !validDate(favorite.createdAt) ||
      !validDate(favorite.updatedAt) ||
      !isNullableString(favorite.deletedAt) ||
      typeof favorite.revision !== 'number' ||
      !Number.isInteger(favorite.revision) ||
      favorite.revision < 1
    ) {
      throw new BackupValidationError('field', 'Um favorito possui campos inválidos.');
    }
  }
  for (const preference of preferences) {
    if (!isRecord(preference) || !isString(preference.key) || !validDate(preference.updatedAt)) {
      throw new BackupValidationError('field', 'Uma preferência possui campos inválidos.');
    }
  }

  return input as unknown as BackupDocument;
}

export function parseBackupText(text: string): BackupDocument {
  if (!text.trim()) throw new BackupValidationError('empty', 'O arquivo de backup está vazio.');
  if (new Blob([text]).size > MAX_BACKUP_BYTES) {
    throw new BackupValidationError('size', 'O backup excede o limite de 20 MB.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new BackupValidationError('format', 'O arquivo de backup não contém JSON válido.');
  }
  return validateBackupDocument(parsed);
}

export function serializeBackup(document: BackupDocument): string {
  return JSON.stringify(document, null, 2);
}
