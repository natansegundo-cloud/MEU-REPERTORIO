import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';

import { MeuRepertorioDatabase } from '@/database';

import { importLegacyData, parseLegacyBackupText, prepareLegacyImport } from './v1';

const legacyText = JSON.stringify({
  app: 'meu-repertorio',
  v: 3,
  songs: [
    { id: 'petala', title: 'Pétala', artist: 'Djavan', key: 'C', body: 'C\nPétala' },
    { id: 'zoio', title: 'Zóio de Lula', artist: 'Charlie Brown Jr.', key: 'A', body: 'A\nZóio' },
  ],
  setlists: [{ id: 'show', name: 'Show', items: [{ songId: 'petala' }, { songId: 'missing' }] }],
});

describe('migração da V1', () => {
  const databases: MeuRepertorioDatabase[] = [];

  afterEach(async () => {
    for (const database of databases.splice(0)) {
      database.close();
      await Dexie.delete(database.name);
    }
  });

  it('converte fixture antigo, avisa item inexistente e é idempotente', async () => {
    const database = new MeuRepertorioDatabase('migration-v1');
    await database.open();
    databases.push(database);
    const prepared = prepareLegacyImport(parseLegacyBackupText(legacyText));
    expect(prepared.songs.map((song) => song.title)).toEqual(['Pétala', 'Zóio de Lula']);
    expect(prepared.report.warnings[0]).toMatch(/música inexistente/i);

    const first = await importLegacyData(prepared, database);
    const second = await importLegacyData(prepared, database);
    expect(first.imported).toBe(4);
    expect(second.imported).toBe(0);
    expect(second.ignored).toBeGreaterThanOrEqual(3);
    expect(await database.songs.count()).toBe(2);
    expect(await database.repertories.count()).toBe(1);
    expect(await database.repertoryItems.count()).toBe(1);
  });
});
