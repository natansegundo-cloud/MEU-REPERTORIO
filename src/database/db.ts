import Dexie, { type Table } from 'dexie';

import type { Favorite, Preference, Repertory, RepertoryItem, Setting, Song } from '@/types';

import { assertValidMigrations, migrations } from './migrations';

export const DATABASE_NAME = 'meu-repertorio-v2';

export class DatabaseOpenError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'DatabaseOpenError';
  }
}

export class MeuRepertorioDatabase extends Dexie {
  readonly songs: Table<Song, string>;
  readonly repertories: Table<Repertory, string>;
  readonly repertoryItems: Table<RepertoryItem, string>;
  readonly favorites: Table<Favorite, string>;
  readonly preferences: Table<Preference, string>;
  readonly settings: Table<Setting, string>;

  constructor(name: string = DATABASE_NAME) {
    super(name);
    assertValidMigrations(migrations);

    for (const migration of migrations) {
      const version = this.version(migration.version);

      if (migration.stores) {
        version.stores(migration.stores);
      }

      if (migration.upgrade) {
        version.upgrade(migration.upgrade);
      }
    }

    this.songs = this.table<Song, string>('songs');
    this.repertories = this.table<Repertory, string>('repertories');
    this.repertoryItems = this.table<RepertoryItem, string>('repertoryItems');
    this.favorites = this.table<Favorite, string>('favorites');
    this.preferences = this.table<Preference, string>('preferences');
    this.settings = this.table<Setting, string>('settings');

    this.on('blocked', () => {
      console.warn('[database] A atualização foi bloqueada por outra aba aberta.');
    });

    this.on('versionchange', () => {
      this.close();
    });
  }
}

export const db = new MeuRepertorioDatabase();

/**
 * Abre o banco de forma idempotente e converte falhas do IndexedDB em um erro
 * compreensível para a camada de aplicação.
 */
export async function openDatabase(database: MeuRepertorioDatabase = db): Promise<void> {
  try {
    await database.open();
  } catch (cause) {
    throw new DatabaseOpenError('Não foi possível abrir o banco de dados local.', { cause });
  }
}
