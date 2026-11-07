import type { Transaction } from 'dexie';

import { parseSongText } from '@/features/parser';

/**
 * Uma versão de schema do IndexedDB.
 *
 * Regras:
 * - Versões publicadas são imutáveis.
 * - Cada nova versão deve informar apenas as stores que mudaram.
 * - O upgrade deve transformar dados sem apagar registros existentes.
 */
export interface DatabaseMigration {
  readonly version: number;
  readonly stores?: Record<string, string>;
  readonly upgrade?: (transaction: Transaction) => void | Promise<void>;
}

export const migrations: readonly DatabaseMigration[] = [
  {
    version: 1,
    stores: {
      songs: 'id, title, artist, updatedAt',
      repertories: 'id, name, updatedAt',
      repertoryItems: 'id, repertoryId, songId, [repertoryId+position], updatedAt',
      favorites: 'songId, createdAt',
      preferences: 'key, updatedAt',
      settings: 'key, updatedAt',
    },
  },
  {
    version: 2,
    stores: {
      songs: 'id, title, artist, updatedAt, deletedAt',
    },
    async upgrade(transaction) {
      await transaction
        .table('songs')
        .toCollection()
        .modify((song: Record<string, unknown>) => {
          if (!('structure' in song)) {
            const content = typeof song.content === 'string' ? song.content : '';
            song.structure = parseSongText(content);
          }
        });
    },
  },
  {
    version: 3,
    async upgrade(transaction) {
      await transaction
        .table('songs')
        .toCollection()
        .modify((song: Record<string, unknown>) => {
          song.preferredKey ??= null;
          song.tuning ??= null;
          song.rhythm ??= null;
          song.strumming ??= null;
          song.difficulty ??= null;
        });
    },
  },
  {
    version: 4,
    async upgrade(transaction) {
      await transaction
        .table('repertoryItems')
        .toCollection()
        .modify((item: Record<string, unknown>) => {
          item.preferredKey ??= null;
        });
    },
  },
  {
    version: 5,
    async upgrade(transaction) {
      for (const tableName of ['songs', 'repertories', 'repertoryItems']) {
        await transaction
          .table(tableName)
          .toCollection()
          .modify((record: Record<string, unknown>) => {
            // Registros existentes precisam ser enviados na primeira sync.
            record.syncPending ??= true;
            record.syncError ??= null;
          });
      }
    },
  },
];

export const DATABASE_VERSION = migrations.at(-1)?.version ?? 0;

export function assertValidMigrations(items: readonly DatabaseMigration[]): void {
  if (items.length === 0) {
    throw new Error('O banco local precisa de pelo menos uma migração.');
  }

  if (items[0]?.version !== 1) {
    throw new Error('A primeira migração do banco local deve ser a versão 1.');
  }

  let previousVersion = 0;

  for (const migration of items) {
    if (!Number.isInteger(migration.version) || migration.version < 1) {
      throw new Error('Toda migração precisa ter uma versão inteira positiva.');
    }

    if (migration.version <= previousVersion) {
      throw new Error('As versões de migração devem ser estritamente crescentes.');
    }

    if (migration.stores && Object.keys(migration.stores).length === 0) {
      throw new Error('Quando informada, a lista de stores não pode estar vazia.');
    }

    previousVersion = migration.version;
  }
}
