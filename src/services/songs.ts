import { liveQuery } from 'dexie';

import { parseSongText, type ParsedSong } from '@/features/parser';
import { db, openDatabase } from '@/database';
import type { EntityId, Song } from '@/types';
import { notifyLocalSyncChange } from '@/sync';

export interface SongMetadataOverrides {
  readonly title?: string;
  readonly artist?: string;
  readonly notes?: string;
}

export interface BatchSongImportInput extends SongMetadataOverrides {
  readonly content: string;
}

export interface BatchSongImportResult {
  readonly saved: readonly Song[];
  readonly duplicates: readonly string[];
}

export interface SongEditInput {
  readonly title: string;
  readonly artist: string | null;
  readonly structure: ParsedSong;
  readonly preferredKey: string | null;
  readonly capo: number | null;
  readonly tuning: string | null;
  readonly rhythm: string | null;
  readonly strumming: string | null;
  readonly difficulty: string | null;
  readonly notes: string | null;
}

export class SongImportError extends Error {
  readonly parsed: ParsedSong;

  constructor(parsed: ParsedSong) {
    super('A música contém erros impeditivos e não foi salva.');
    this.name = 'SongImportError';
    this.parsed = parsed;
  }
}

export class SongAlreadyExistsError extends Error {
  readonly songId: EntityId;

  constructor(songId: EntityId) {
    super('Esta música já está cadastrada na biblioteca.');
    this.name = 'SongAlreadyExistsError';
    this.songId = songId;
  }
}

export class SongNotFoundError extends Error {
  constructor(songId: EntityId) {
    super(`Música não encontrada: ${songId}`);
    this.name = 'SongNotFoundError';
  }
}

export class SongRevisionConflictError extends Error {
  readonly songId: EntityId;
  readonly expectedRevision: number;
  readonly actualRevision: number;

  constructor(songId: EntityId, expectedRevision: number, actualRevision: number) {
    super('A música foi alterada em outro lugar. Recarregue antes de salvar novamente.');
    this.name = 'SongRevisionConflictError';
    this.songId = songId;
    this.expectedRevision = expectedRevision;
    this.actualRevision = actualRevision;
  }
}

function now(): string {
  return new Date().toISOString();
}

function createId(): EntityId {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `song-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function textOverride(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

const UNTITLED_SONG_TITLE = 'Música sem título';

/**
 * Compara textos ignorando caixa, acentos e variações de espaço em branco.
 * Usado apenas para detectar reimportações da mesma música.
 */
function comparisonValue(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

/**
 * Gera assinaturas de duplicidade. O corpo musical é comparado separadamente
 * do texto original para reconhecer a mesma música mesmo quando o cabeçalho
 * (título, artista ou tom) muda. Título + artista só bloqueiam quando ambos
 * são informados, evitando falsos positivos de músicas sem artista.
 */
function duplicateKeys(song: Song): string[] {
  const keys: string[] = [];
  const content = comparisonValue(song.content);
  if (content) keys.push(`content:${content}`);

  const body = comparisonValue(song.structure.body);
  if (body) keys.push(`body:${body}`);

  const title = comparisonValue(song.title);
  const artist = comparisonValue(song.artist);
  if (title && title !== comparisonValue(UNTITLED_SONG_TITLE) && artist) {
    keys.push(`identity:${title}\u0000${artist}`);
  }

  return keys;
}

function findDuplicate(candidate: Song, existing: readonly Song[]): Song | undefined {
  const candidateKeys = new Set(duplicateKeys(candidate));
  if (candidateKeys.size === 0) return undefined;

  return existing.find((song) => duplicateKeys(song).some((key) => candidateKeys.has(key)));
}

function capoNumber(value: string | null): number | null {
  if (!value) return null;
  const match = /\d+/u.exec(value);
  if (!match) return null;
  return Number(match[0]);
}

function applyMetadata(parsed: ParsedSong, overrides: SongMetadataOverrides): ParsedSong {
  const title = textOverride(overrides.title) ?? parsed.title ?? UNTITLED_SONG_TITLE;
  const artist = textOverride(overrides.artist) ?? parsed.artist;

  return {
    ...parsed,
    title,
    artist,
    metadata: { ...parsed.metadata, title, artist },
  };
}

function toSong(parsed: ParsedSong): Song {
  const timestamp = now();
  return {
    id: createId(),
    title: parsed.title ?? UNTITLED_SONG_TITLE,
    artist: parsed.artist,
    originalKey: parsed.originalKey,
    currentKey: parsed.currentKey,
    preferredKey: null,
    capo: capoNumber(parsed.capo),
    tuning: null,
    rhythm: null,
    strumming: null,
    difficulty: null,
    content: parsed.originalText,
    structure: parsed,
    notes: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    revision: 1,
    syncPending: true,
    syncError: null,
  };
}

async function activeSongs(): Promise<Song[]> {
  await openDatabase();
  const songs = await db.songs.filter((song) => song.deletedAt === null).toArray();
  return songs.sort((left, right) => {
    const titleOrder = left.title.localeCompare(right.title, 'pt-BR', { sensitivity: 'base' });
    if (titleOrder !== 0) return titleOrder;
    return left.artist?.localeCompare(right.artist ?? '', 'pt-BR', { sensitivity: 'base' }) ?? -1;
  });
}

export function observeSongs(query = '') {
  return liveQuery(async () => {
    const songs = await activeSongs();
    const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
    if (!normalizedQuery) return songs;

    return songs.filter((song) =>
      [song.title, song.artist, song.originalKey]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLocaleLowerCase('pt-BR').includes(normalizedQuery)),
    );
  });
}

export function observeSong(id: EntityId) {
  return liveQuery(() => getSong(id));
}

export async function listSongs(): Promise<Song[]> {
  return activeSongs();
}

export async function searchSongs(query: string): Promise<Song[]> {
  const songs = await activeSongs();
  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
  if (!normalizedQuery) return songs;

  return songs.filter((song) =>
    [song.title, song.artist, song.originalKey]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLocaleLowerCase('pt-BR').includes(normalizedQuery)),
  );
}

export async function getSong(id: EntityId): Promise<Song | undefined> {
  await openDatabase();
  const song = await db.songs.get(id);
  return song?.deletedAt === null ? song : undefined;
}

export async function importSong(
  input: string,
  overrides: SongMetadataOverrides = {},
): Promise<Song> {
  const parsed = applyMetadata(parseSongText(input), overrides);
  if (!parsed.valid) throw new SongImportError(parsed);

  const song = { ...toSong(parsed), notes: textOverride(overrides.notes) };
  await openDatabase();

  const saved = await db.transaction('rw', db.songs, async () => {
    const existing = await db.songs.filter((candidate) => candidate.deletedAt === null).toArray();
    const duplicate = findDuplicate(song, existing);
    if (duplicate) throw new SongAlreadyExistsError(duplicate.id);

    await db.songs.add(song);
    return song;
  });
  notifyLocalSyncChange();
  return saved;
}

/** Grava vários blocos numa única transação, sem sobrescrever músicas existentes. */
export async function importSongsBatch(
  inputs: readonly BatchSongImportInput[],
): Promise<BatchSongImportResult> {
  const prepared = inputs.map((input) => {
    const parsed = applyMetadata(parseSongText(input.content), input);
    if (!parsed.valid) throw new SongImportError(parsed);
    return { input, song: { ...toSong(parsed), notes: textOverride(input.notes) } };
  });
  await openDatabase();

  const result = await db.transaction('rw', db.songs, async () => {
    const existing = await db.songs.filter((song) => song.deletedAt === null).toArray();
    const knownKeys = new Set(existing.flatMap((song) => duplicateKeys(song)));
    const saved: Song[] = [];
    const duplicates: string[] = [];
    for (const item of prepared) {
      const keys = duplicateKeys(item.song);
      if (keys.some((key) => knownKeys.has(key))) {
        duplicates.push(item.song.title);
        continue;
      }
      await db.songs.add(item.song);
      for (const key of keys) knownKeys.add(key);
      saved.push(item.song);
    }
    return { saved, duplicates };
  });
  if (result.saved.length > 0) notifyLocalSyncChange();
  return result;
}

export async function softDeleteSong(id: EntityId): Promise<void> {
  await openDatabase();
  await db.transaction('rw', db.songs, async () => {
    const song = await db.songs.get(id);
    if (!song || song.deletedAt !== null) throw new SongNotFoundError(id);

    await db.songs.update(id, {
      deletedAt: now(),
      updatedAt: now(),
      revision: song.revision + 1,
      syncPending: true,
      syncError: null,
    });
  });
  notifyLocalSyncChange();
}

export async function updateSongMetadata(
  id: EntityId,
  changes: SongMetadataOverrides,
): Promise<Song> {
  await openDatabase();
  const updated = await db.transaction('rw', db.songs, async () => {
    const song = await db.songs.get(id);
    if (!song || song.deletedAt !== null) throw new SongNotFoundError(id);

    const title = textOverride(changes.title) ?? song.title;
    const artist = changes.artist === undefined ? song.artist : textOverride(changes.artist);
    const structure: ParsedSong = {
      ...song.structure,
      title,
      artist,
      metadata: { ...song.structure.metadata, title, artist },
    };
    const updated: Song = {
      ...song,
      title,
      artist,
      structure,
      updatedAt: now(),
      revision: song.revision + 1,
      syncPending: true,
      syncError: null,
    };

    await db.songs.put(updated);
    return updated;
  });
  notifyLocalSyncChange();
  return updated;
}

function normalizedNullable(value: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function applyEditToSong(song: Song, changes: SongEditInput): Song {
  const title = changes.title.trim() || song.title;
  const artist = normalizedNullable(changes.artist);
  const preferredKey = normalizedNullable(changes.preferredKey);
  const structure: ParsedSong = {
    ...changes.structure,
    title,
    artist,
    metadata: { ...changes.structure.metadata, title, artist },
  };

  return {
    ...song,
    title,
    artist,
    structure,
    preferredKey,
    currentKey: preferredKey ?? song.originalKey,
    capo: changes.capo,
    tuning: normalizedNullable(changes.tuning),
    rhythm: normalizedNullable(changes.rhythm),
    strumming: normalizedNullable(changes.strumming),
    difficulty: normalizedNullable(changes.difficulty),
    notes: normalizedNullable(changes.notes),
    updatedAt: now(),
    revision: song.revision + 1,
    syncPending: true,
    syncError: null,
  };
}

export async function updateSong(
  id: EntityId,
  changes: SongEditInput,
  expectedRevision: number,
): Promise<Song> {
  await openDatabase();
  const updated = await db.transaction('rw', db.songs, async () => {
    const song = await db.songs.get(id);
    if (!song || song.deletedAt !== null) throw new SongNotFoundError(id);
    if (song.revision !== expectedRevision) {
      throw new SongRevisionConflictError(id, expectedRevision, song.revision);
    }

    const updated = applyEditToSong(song, changes);
    await db.songs.put(updated);
    return updated;
  });
  notifyLocalSyncChange();
  return updated;
}

export async function updateSongPreferredKey(
  id: EntityId,
  preferredKey: string | null,
  expectedRevision: number,
): Promise<Song> {
  await openDatabase();
  const updated = await db.transaction('rw', db.songs, async () => {
    const song = await db.songs.get(id);
    if (!song || song.deletedAt !== null) throw new SongNotFoundError(id);
    if (song.revision !== expectedRevision) {
      throw new SongRevisionConflictError(id, expectedRevision, song.revision);
    }

    const normalizedKey = normalizedNullable(preferredKey);
    const updated: Song = {
      ...song,
      preferredKey: normalizedKey,
      currentKey: normalizedKey ?? song.originalKey,
      updatedAt: now(),
      revision: song.revision + 1,
      syncPending: true,
      syncError: null,
    };
    await db.songs.put(updated);
    return updated;
  });
  notifyLocalSyncChange();
  return updated;
}
