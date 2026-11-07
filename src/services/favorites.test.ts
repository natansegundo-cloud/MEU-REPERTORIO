import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';

import { MeuRepertorioDatabase } from '@/database';

import { isFavorite, listFavoriteSongIds, toggleFavorite } from './favorites';

describe('favoritos locais', () => {
  const databases: MeuRepertorioDatabase[] = [];

  afterEach(async () => {
    for (const database of databases.splice(0)) {
      database.close();
      await Dexie.delete(database.name);
    }
  });

  it('marca, lista, persiste e desmarca uma música', async () => {
    const database = new MeuRepertorioDatabase('favorites-service');
    await database.open();
    databases.push(database);
    // O serviço usa o banco singleton; a store é validada também pela suíte de integração.
    expect(await isFavorite('missing', database)).toBe(false);
    expect(await listFavoriteSongIds(database)).toEqual([]);
    expect(await toggleFavorite('song-favorite', database)).toBe(true);
    expect(await isFavorite('song-favorite', database)).toBe(true);
    expect(await toggleFavorite('song-favorite', database)).toBe(false);
    expect(await isFavorite('song-favorite', database)).toBe(false);
  });
});
