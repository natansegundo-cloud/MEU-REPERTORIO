import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';

import { MeuRepertorioDatabase } from './db';

const databaseName = 'meu-repertorio-v2-migration-test';

afterEach(async () => {
  await Dexie.delete(databaseName);
});

describe('database migrations', () => {
  it('adiciona a estrutura do parser aos registros da versão anterior', async () => {
    const legacy = new Dexie(databaseName);
    legacy.version(1).stores({
      songs: 'id, title, artist, updatedAt',
      repertoryItems: 'id, repertoryId, songId, [repertoryId+position], updatedAt',
    });
    await legacy.open();
    await legacy.table('songs').add({
      id: 'legacy-song',
      title: 'Legado',
      artist: null,
      originalKey: 'A',
      currentKey: 'A',
      capo: null,
      content: 'Tom: A\nA\nLetra legada',
      notes: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      deletedAt: null,
      revision: 1,
    });
    await legacy.table('repertoryItems').add({
      id: 'legacy-item',
      repertoryId: 'legacy-repertory',
      songId: 'legacy-song',
      position: 1000,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      deletedAt: null,
      revision: 1,
    });
    legacy.close();

    const upgraded = new MeuRepertorioDatabase(databaseName);
    await upgraded.open();
    const song = await upgraded.songs.get('legacy-song');

    expect(upgraded.verno).toBe(5);
    expect(song?.content).toBe('Tom: A\nA\nLetra legada');
    expect(song?.structure.report.chordCount).toBe(1);
    expect(song?.structure.originalText).toBe(song?.content);
    expect(song?.preferredKey).toBeNull();
    expect(song?.tuning).toBeNull();
    expect(song?.difficulty).toBeNull();
    expect((await upgraded.repertoryItems.get('legacy-item'))?.preferredKey).toBeNull();
    expect(song?.syncPending).toBe(true);
    expect(song?.syncError).toBeNull();
    expect((await upgraded.repertoryItems.get('legacy-item'))?.syncPending).toBe(true);
    expect((await upgraded.repertoryItems.get('legacy-item'))?.syncError).toBeNull();

    upgraded.close();
  });
});
