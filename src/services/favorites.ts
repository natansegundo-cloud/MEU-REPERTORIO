import { liveQuery } from 'dexie';

import { db, openDatabase, type MeuRepertorioDatabase } from '@/database';
import type { EntityId, Favorite } from '@/types';

function now(): string {
  return new Date().toISOString();
}

export function observeFavoriteSongIds() {
  return liveQuery(async () => {
    await openDatabase();
    const favorites = await db.favorites
      .filter((favorite) => favorite.deletedAt === null)
      .toArray();
    return new Set(favorites.map((favorite) => favorite.songId));
  });
}

export function observeIsFavorite(songId: EntityId) {
  return liveQuery(async () => {
    await openDatabase();
    const favorite = await db.favorites.get(songId);
    return favorite?.deletedAt === null;
  });
}

export async function isFavorite(
  songId: EntityId,
  database: MeuRepertorioDatabase = db,
): Promise<boolean> {
  await openDatabase(database);
  const favorite = await database.favorites.get(songId);
  return favorite?.deletedAt === null;
}

export async function toggleFavorite(
  songId: EntityId,
  database: MeuRepertorioDatabase = db,
): Promise<boolean> {
  await openDatabase(database);
  const current = await database.favorites.get(songId);
  if (current?.deletedAt === null) {
    await database.favorites.delete(songId);
    return false;
  }
  const timestamp = now();
  const favorite: Favorite = {
    songId,
    createdAt: current?.createdAt ?? timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    revision: (current?.revision ?? 0) + 1,
  };
  await database.favorites.put(favorite);
  return true;
}

export async function listFavoriteSongIds(
  database: MeuRepertorioDatabase = db,
): Promise<readonly string[]> {
  await openDatabase(database);
  const favorites = await database.favorites
    .filter((favorite) => favorite.deletedAt === null)
    .toArray();
  return favorites.map((favorite) => favorite.songId);
}
