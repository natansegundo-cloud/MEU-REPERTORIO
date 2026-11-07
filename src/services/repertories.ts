import { liveQuery } from 'dexie';

import { db, openDatabase } from '@/database';
import { parseTonality } from '@/features/transpose';
import type { EntityId, Repertory, RepertoryItem, Song } from '@/types';
import { notifyLocalSyncChange } from '@/sync';

const POSITION_STEP = 1000;

export interface RepertorySummary extends Repertory {
  readonly songCount: number;
}

export interface RepertoryEntry {
  readonly item: RepertoryItem;
  readonly song: Song | null;
}

export interface RepertoryDetail {
  readonly repertory: Repertory;
  readonly items: readonly RepertoryEntry[];
}

export class RepertoryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RepertoryValidationError';
  }
}

export class RepertoryNotFoundError extends Error {
  constructor(repertoryId: EntityId) {
    super(`Repertório não encontrado: ${repertoryId}`);
    this.name = 'RepertoryNotFoundError';
  }
}

export class RepertoryItemNotFoundError extends Error {
  constructor(itemId: EntityId) {
    super(`Item de repertório não encontrado: ${itemId}`);
    this.name = 'RepertoryItemNotFoundError';
  }
}

export class RepertoryRevisionConflictError extends Error {
  readonly repertoryId: EntityId;
  readonly expectedRevision: number;
  readonly actualRevision: number;

  constructor(repertoryId: EntityId, expectedRevision: number, actualRevision: number) {
    super('O repertório foi alterado em outro lugar. Recarregue antes de salvar novamente.');
    this.name = 'RepertoryRevisionConflictError';
    this.repertoryId = repertoryId;
    this.expectedRevision = expectedRevision;
    this.actualRevision = actualRevision;
  }
}

function now(): string {
  return new Date().toISOString();
}

function createId(prefix: string): EntityId {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function requiredName(name: string): string {
  const normalized = name.trim();
  if (!normalized) throw new RepertoryValidationError('Informe um nome para o repertório.');
  return normalized;
}

function nullableKey(key: string | null): string | null {
  const normalized = key?.trim() ?? '';
  if (!normalized) return null;
  if (!parseTonality(normalized)) {
    throw new RepertoryValidationError('O tom próprio não foi reconhecido.');
  }
  return normalized;
}

function activeItems(items: readonly RepertoryItem[]): RepertoryItem[] {
  return items.filter((item) => item.deletedAt === null).sort((a, b) => a.position - b.position);
}

async function activeRepertory(id: EntityId): Promise<Repertory> {
  const repertory = await db.repertories.get(id);
  if (!repertory || repertory.deletedAt !== null) throw new RepertoryNotFoundError(id);
  return repertory;
}

async function touchRepertory(repertory: Repertory, timestamp: string): Promise<Repertory> {
  const updated: Repertory = {
    ...repertory,
    updatedAt: timestamp,
    revision: repertory.revision + 1,
    syncPending: true,
    syncError: null,
  };
  await db.repertories.put(updated);
  return updated;
}

export async function listRepertories(): Promise<RepertorySummary[]> {
  await openDatabase();
  const [repertories, items] = await Promise.all([
    db.repertories.filter((repertory) => repertory.deletedAt === null).toArray(),
    db.repertoryItems.filter((item) => item.deletedAt === null).toArray(),
  ]);
  return repertories
    .map((repertory) => ({
      ...repertory,
      songCount: items.filter((item) => item.repertoryId === repertory.id).length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
}

export function observeRepertories() {
  return liveQuery(() => listRepertories());
}

export async function getRepertory(id: EntityId): Promise<Repertory | undefined> {
  await openDatabase();
  const repertory = await db.repertories.get(id);
  return repertory?.deletedAt === null ? repertory : undefined;
}

export async function getRepertoryDetail(id: EntityId): Promise<RepertoryDetail | undefined> {
  await openDatabase();
  const repertory = await getRepertory(id);
  if (!repertory) return undefined;

  const items = activeItems(await db.repertoryItems.where('repertoryId').equals(id).toArray());
  const songs = await Promise.all(items.map((item) => db.songs.get(item.songId)));
  return {
    repertory,
    items: items.map((item, index) => ({
      item,
      song: songs[index]?.deletedAt === null ? (songs[index] ?? null) : null,
    })),
  };
}

export function observeRepertoryDetail(id: EntityId) {
  return liveQuery(() => getRepertoryDetail(id));
}

export async function createRepertory(
  name: string,
  description: string | null = null,
): Promise<Repertory> {
  await openDatabase();
  const timestamp = now();
  const repertory: Repertory = {
    id: createId('repertory'),
    name: requiredName(name),
    description: description?.trim() || null,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    revision: 1,
    syncPending: true,
    syncError: null,
  };
  await db.repertories.add(repertory);
  notifyLocalSyncChange();
  return repertory;
}

export async function renameRepertory(
  id: EntityId,
  name: string,
  expectedRevision: number,
): Promise<Repertory> {
  await openDatabase();
  const updated = await db.transaction('rw', db.repertories, async () => {
    const repertory = await activeRepertory(id);
    if (repertory.revision !== expectedRevision) {
      throw new RepertoryRevisionConflictError(id, expectedRevision, repertory.revision);
    }
    const updated = {
      ...repertory,
      name: requiredName(name),
      updatedAt: now(),
      revision: repertory.revision + 1,
    };
    await db.repertories.put(updated);
    return updated;
  });
  notifyLocalSyncChange();
  return updated;
}

export async function duplicateRepertory(id: EntityId): Promise<Repertory> {
  await openDatabase();
  const copy = await db.transaction('rw', db.repertories, db.repertoryItems, async () => {
    const source = await activeRepertory(id);
    const sourceItems = activeItems(
      await db.repertoryItems.where('repertoryId').equals(id).toArray(),
    );
    const timestamp = now();
    const copy: Repertory = {
      id: createId('repertory'),
      name: `${source.name} (cópia)`,
      description: source.description,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
      revision: 1,
      syncPending: true,
      syncError: null,
    };
    await db.repertories.add(copy);
    await db.repertoryItems.bulkAdd(
      sourceItems.map((item) => ({
        ...item,
        id: createId('repertory-item'),
        repertoryId: copy.id,
        createdAt: timestamp,
        updatedAt: timestamp,
        deletedAt: null,
        revision: 1,
        syncPending: true,
        syncError: null,
      })),
    );
    return copy;
  });
  notifyLocalSyncChange();
  return copy;
}

export async function softDeleteRepertory(id: EntityId, expectedRevision: number): Promise<void> {
  await openDatabase();
  await db.transaction('rw', db.repertories, db.repertoryItems, async () => {
    const repertory = await activeRepertory(id);
    if (repertory.revision !== expectedRevision) {
      throw new RepertoryRevisionConflictError(id, expectedRevision, repertory.revision);
    }
    const timestamp = now();
    await db.repertories.put({
      ...repertory,
      deletedAt: timestamp,
      updatedAt: timestamp,
      revision: repertory.revision + 1,
      syncPending: true,
      syncError: null,
    });
    const items = await db.repertoryItems.where('repertoryId').equals(id).toArray();
    await Promise.all(
      items
        .filter((item) => item.deletedAt === null)
        .map((item) =>
          db.repertoryItems.put({
            ...item,
            deletedAt: timestamp,
            updatedAt: timestamp,
            revision: item.revision + 1,
            syncPending: true,
            syncError: null,
          }),
        ),
    );
  });
  notifyLocalSyncChange();
}

export async function addSongsToRepertory(
  repertoryId: EntityId,
  songIds: readonly EntityId[],
  expectedRevision: number,
): Promise<Repertory> {
  await openDatabase();
  const updated = await db.transaction(
    'rw',
    db.repertories,
    db.repertoryItems,
    db.songs,
    async () => {
      const repertory = await activeRepertory(repertoryId);
      if (repertory.revision !== expectedRevision) {
        throw new RepertoryRevisionConflictError(repertoryId, expectedRevision, repertory.revision);
      }
      const uniqueSongIds = [...new Set(songIds)];
      const existing = activeItems(
        await db.repertoryItems.where('repertoryId').equals(repertoryId).toArray(),
      );
      const existingIds = new Set(existing.map((item) => item.songId));
      const songs = await db.songs.bulkGet(uniqueSongIds);
      const toAdd = uniqueSongIds.filter((songId, index) => {
        const song = songs[index];
        return !existingIds.has(songId) && song?.deletedAt === null;
      });
      if (toAdd.length === 0) return repertory;

      const timestamp = now();
      const lastPosition = existing.at(-1)?.position ?? 0;
      await db.repertoryItems.bulkAdd(
        toAdd.map((songId, index) => ({
          id: createId('repertory-item'),
          repertoryId,
          songId,
          position: lastPosition + POSITION_STEP * (index + 1),
          preferredKey: null,
          createdAt: timestamp,
          updatedAt: timestamp,
          deletedAt: null,
          revision: 1,
          syncPending: true,
          syncError: null,
        })),
      );
      return touchRepertory(repertory, timestamp);
    },
  );
  notifyLocalSyncChange();
  return updated;
}

export async function removeRepertoryItem(itemId: EntityId): Promise<void> {
  await openDatabase();
  await db.transaction('rw', db.repertoryItems, db.repertories, async () => {
    const item = await db.repertoryItems.get(itemId);
    if (!item || item.deletedAt !== null) throw new RepertoryItemNotFoundError(itemId);
    const repertory = await activeRepertory(item.repertoryId);
    const timestamp = now();
    await db.repertoryItems.put({
      ...item,
      deletedAt: timestamp,
      updatedAt: timestamp,
      revision: item.revision + 1,
      syncPending: true,
      syncError: null,
    });
    await touchRepertory(repertory, timestamp);
  });
  notifyLocalSyncChange();
}

function shouldReindex(
  previous: RepertoryItem | undefined,
  next: RepertoryItem | undefined,
  position: number,
): boolean {
  if (!Number.isFinite(position)) return true;
  if (previous && position <= previous.position) return true;
  if (next && position >= next.position) return true;
  if (previous && next && Math.abs(next.position - previous.position) < Number.EPSILON * 1000) {
    return true;
  }
  return false;
}

export async function reorderRepertoryItem(
  repertoryId: EntityId,
  itemId: EntityId,
  targetIndex: number,
  expectedRevision: number,
): Promise<Repertory> {
  await openDatabase();
  const updated = await db.transaction('rw', db.repertoryItems, db.repertories, async () => {
    const repertory = await activeRepertory(repertoryId);
    if (repertory.revision !== expectedRevision) {
      throw new RepertoryRevisionConflictError(repertoryId, expectedRevision, repertory.revision);
    }
    const items = activeItems(
      await db.repertoryItems.where('repertoryId').equals(repertoryId).toArray(),
    );
    const currentIndex = items.findIndex((item) => item.id === itemId);
    if (currentIndex < 0) throw new RepertoryItemNotFoundError(itemId);
    const boundedIndex = Math.max(0, Math.min(items.length - 1, Math.trunc(targetIndex)));
    if (currentIndex === boundedIndex) return repertory;
    const [moving] = items.splice(currentIndex, 1);
    if (!moving) throw new RepertoryItemNotFoundError(itemId);
    items.splice(boundedIndex, 0, moving);
    const previous = items[boundedIndex - 1];
    const next = items[boundedIndex + 1];
    const position =
      !previous && !next
        ? POSITION_STEP
        : !previous
          ? (next?.position ?? POSITION_STEP) / 2
          : !next
            ? previous.position + POSITION_STEP
            : (previous.position + next.position) / 2;
    const timestamp = now();

    if (shouldReindex(previous, next, position)) {
      await Promise.all(
        items.map((item, index) =>
          db.repertoryItems.put({
            ...item,
            position: (index + 1) * POSITION_STEP,
            updatedAt: timestamp,
            revision: item.revision + 1,
            syncPending: true,
            syncError: null,
          }),
        ),
      );
    } else {
      await db.repertoryItems.put({
        ...moving,
        position,
        updatedAt: timestamp,
        revision: moving.revision + 1,
        syncPending: true,
        syncError: null,
      });
    }
    return touchRepertory(repertory, timestamp);
  });
  notifyLocalSyncChange();
  return updated;
}

export async function updateRepertoryItemKey(
  itemId: EntityId,
  preferredKey: string | null,
): Promise<void> {
  await openDatabase();
  await db.transaction('rw', db.repertoryItems, db.repertories, async () => {
    const item = await db.repertoryItems.get(itemId);
    if (!item || item.deletedAt !== null) throw new RepertoryItemNotFoundError(itemId);
    const repertory = await activeRepertory(item.repertoryId);
    const timestamp = now();
    await db.repertoryItems.put({
      ...item,
      preferredKey: nullableKey(preferredKey),
      updatedAt: timestamp,
      revision: item.revision + 1,
      syncPending: true,
      syncError: null,
    });
    await touchRepertory(repertory, timestamp);
  });
  notifyLocalSyncChange();
}
