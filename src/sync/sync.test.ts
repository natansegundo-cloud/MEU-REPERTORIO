import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';

import { MeuRepertorioDatabase } from '@/database';
import { parseSongText } from '@/features/parser';
import type { Song } from '@/types';

import {
  InMemorySyncBackend,
  SyncAccountMismatchError,
  SyncCoordinator,
  type SyncCursor,
  type SyncBackend,
  type RemoteRow,
  type SyncTable,
  repertoryItemToRemote,
  repertoryToRemote,
  remoteToSong,
  songToRemote,
} from './index';
import {
  SYNC_CURSOR_KEYS,
  SYNC_OWNER_KEY,
  encodeSyncCursor,
  readSyncMetadata,
  writeSyncSetting,
} from './metadata';

const userA = '00000000-0000-0000-0000-000000000001';
const userB = '00000000-0000-0000-0000-000000000002';
const createdAt = '2026-01-01T00:00:00.000Z';

function makeSong(
  id: string,
  title: string,
  revision = 1,
  syncPending = true,
  deletedAt: string | null = null,
): Song {
  return {
    id,
    title,
    artist: 'Artista',
    originalKey: 'C',
    currentKey: 'C',
    preferredKey: null,
    capo: null,
    tuning: null,
    rhythm: null,
    strumming: null,
    difficulty: null,
    content: `[${title}]\nC\nLetra`,
    structure: parseSongText(`[${title}]\nC\nLetra`),
    notes: null,
    createdAt,
    updatedAt: createdAt,
    deletedAt,
    revision,
    syncPending,
    syncError: null,
  };
}

class FailingPushBackend implements SyncBackend {
  private failed = false;

  constructor(private readonly backend: InMemorySyncBackend) {}

  pull(...args: Parameters<SyncBackend['pull']>): ReturnType<SyncBackend['pull']> {
    return this.backend.pull(...args);
  }

  async push(...args: Parameters<SyncBackend['push']>): ReturnType<SyncBackend['push']> {
    if (!this.failed) {
      this.failed = true;
      throw new Error('falha simulada de rede');
    }
    return this.backend.push(...args);
  }
}

class CountingBackend implements SyncBackend {
  pullCount = 0;
  private releaseFirstPull: (() => void) | null = null;
  private readonly firstPullStarted: Promise<void>;
  private resolveFirstPullStarted: (() => void) | null = null;

  constructor(private readonly backend: InMemorySyncBackend) {
    this.firstPullStarted = new Promise<void>((resolve) => {
      this.resolveFirstPullStarted = resolve;
    });
  }

  async waitForFirstPull(): Promise<void> {
    return this.firstPullStarted;
  }

  release(): void {
    this.releaseFirstPull?.();
  }

  async pull(...args: Parameters<SyncBackend['pull']>): ReturnType<SyncBackend['pull']> {
    this.pullCount += 1;
    if (this.pullCount === 1) {
      this.resolveFirstPullStarted?.();
      await new Promise<void>((resolve) => {
        this.releaseFirstPull = resolve;
      });
    }
    return this.backend.pull(...args);
  }

  push(...args: Parameters<SyncBackend['push']>): ReturnType<SyncBackend['push']> {
    return this.backend.push(...args);
  }
}

class InvalidRowBackend implements SyncBackend {
  constructor(
    private readonly backend: InMemorySyncBackend,
    private readonly invalidId: string,
  ) {}

  pull(...args: Parameters<SyncBackend['pull']>): ReturnType<SyncBackend['pull']> {
    return this.backend.pull(...args);
  }

  push(
    table: SyncTable,
    userId: string,
    rows: readonly RemoteRow[],
  ): ReturnType<SyncBackend['push']> {
    if (rows.some((row) => row.id === this.invalidId)) {
      return Promise.reject(new Error('registro invalido'));
    }
    return this.backend.push(table, userId, rows);
  }
}

async function createDatabase(name: string): Promise<MeuRepertorioDatabase> {
  const database = new MeuRepertorioDatabase(name);
  await database.open();
  return database;
}

async function closeDatabase(database: MeuRepertorioDatabase): Promise<void> {
  database.close();
  await Dexie.delete(database.name);
}

describe('sync mappers and coordinator', () => {
  const databases: MeuRepertorioDatabase[] = [];

  afterEach(async () => {
    for (const database of databases.splice(0)) await closeDatabase(database);
  });

  it('faz round-trip do mapeamento sem perder structure ou content', () => {
    const song = makeSong('song-map', 'Mapa');
    const remote = songToRemote(song, userA);
    expect(remote.original_key).toBe('C');
    expect(remote.structure).toEqual(song.structure);
    expect(remote.content).toBe(song.content);
    expect(remoteToSong(remote)).toMatchObject({
      id: song.id,
      content: song.content,
      structure: song.structure,
      syncPending: false,
    });
  });

  it('sincroniza dados locais e remotos em bancos independentes', async () => {
    const databaseA = await createDatabase('sync-first-a');
    const databaseB = await createDatabase('sync-first-b');
    databases.push(databaseA, databaseB);
    const backend = new InMemorySyncBackend();
    backend.seed('songs', [songToRemote(makeSong('remote-song', 'Remota', 2, false), userA)]);
    await databaseA.songs.add(makeSong('local-song', 'Local'));

    const coordinatorA = new SyncCoordinator(backend, userA, {
      database: databaseA,
      retryEnabled: false,
    });
    const first = await coordinatorA.runOnce();
    expect(first.pending).toBe(0);
    expect(await databaseA.songs.get('remote-song')).toMatchObject({
      title: 'Remota',
      syncPending: false,
    });
    expect(backend.snapshot('songs')).toHaveLength(2);

    const coordinatorB = new SyncCoordinator(backend, userA, {
      database: databaseB,
      retryEnabled: false,
    });
    await coordinatorB.runOnce();
    expect(await databaseB.songs.get('local-song')).toMatchObject({
      title: 'Local',
      syncPending: false,
    });
    expect(await databaseB.songs.get('remote-song')).toMatchObject({ title: 'Remota' });
  });

  it('propaga edicao e exclusao sem ressuscitar no segundo aparelho', async () => {
    const databaseA = await createDatabase('sync-delete-a');
    const databaseB = await createDatabase('sync-delete-b');
    databases.push(databaseA, databaseB);
    const backend = new InMemorySyncBackend();
    await databaseA.songs.add(makeSong('song-delete', 'Original'));
    const syncA = new SyncCoordinator(backend, userA, { database: databaseA, retryEnabled: false });
    const syncB = new SyncCoordinator(backend, userA, { database: databaseB, retryEnabled: false });

    await syncA.runOnce();
    await syncB.runOnce();
    await databaseB.songs.put({
      ...(await databaseB.songs.get('song-delete'))!,
      title: 'Editada',
      revision: 2,
      syncPending: true,
    });
    await syncB.runOnce();
    await syncA.runOnce();
    expect((await databaseA.songs.get('song-delete'))?.title).toBe('Editada');

    await databaseA.songs.put({
      ...(await databaseA.songs.get('song-delete'))!,
      deletedAt: '2026-01-01T00:00:30.000Z',
      revision: 3,
      syncPending: true,
    });
    await syncA.runOnce();
    await syncB.runOnce();
    expect((await databaseB.songs.get('song-delete'))?.deletedAt).not.toBeNull();
    expect((await databaseB.songs.get('song-delete'))?.syncPending).toBe(false);
    await syncB.runOnce();
    expect((await databaseB.songs.get('song-delete'))?.deletedAt).not.toBeNull();
  });

  it('vence empate com tombstone e descarta edicao offline sem ressurreicao', async () => {
    const databaseA = await createDatabase('sync-equal-delete-a');
    const databaseB = await createDatabase('sync-equal-delete-b');
    databases.push(databaseA, databaseB);
    const backend = new InMemorySyncBackend();
    const syncA = new SyncCoordinator(backend, userA, { database: databaseA, retryEnabled: false });
    const notices: string[] = [];
    const syncB = new SyncCoordinator(backend, userA, {
      database: databaseB,
      retryEnabled: false,
      onNotice: (notice) => notices.push(notice),
    });

    await databaseA.songs.add(makeSong('song-equal-delete', 'Original'));
    await syncA.runOnce();
    await syncB.runOnce();
    await databaseA.songs.put({
      ...(await databaseA.songs.get('song-equal-delete'))!,
      deletedAt: '2026-01-01T00:00:30.000Z',
      revision: 2,
      syncPending: true,
    });
    await syncA.runOnce();
    await databaseB.songs.put({
      ...(await databaseB.songs.get('song-equal-delete'))!,
      title: 'Edicao offline concorrente',
      revision: 2,
      syncPending: true,
    });

    await syncB.runOnce();

    expect(await databaseB.songs.get('song-equal-delete')).toMatchObject({
      deletedAt: '2026-01-01T00:00:30.000Z',
      revision: 2,
      syncPending: false,
    });
    expect(notices).toContain('Uma alteração local foi descartada: a versão do servidor venceu.');
    expect(backend.snapshot('songs').find((row) => row.id === 'song-equal-delete')).toMatchObject({
      deleted_at: '2026-01-01T00:00:30.000Z',
    });
  });

  it('usa revision para conflitos, nunca o relogio local', async () => {
    const database = await createDatabase('sync-conflict');
    databases.push(database);
    const backend = new InMemorySyncBackend();
    backend.seed('songs', [songToRemote(makeSong('song-conflict', 'Servidor', 2, false), userA)]);
    await database.songs.add(makeSong('song-conflict', 'Relogio adiantado', 1, true));
    const coordinator = new SyncCoordinator(backend, userA, { database, retryEnabled: false });

    await coordinator.runOnce();
    expect((await database.songs.get('song-conflict'))?.title).toBe('Servidor');
    await database.songs.put({
      ...(await database.songs.get('song-conflict'))!,
      title: 'Revisao maior',
      revision: 3,
      syncPending: true,
      updatedAt: '2099-01-01T00:00:00.000Z',
    });
    await coordinator.runOnce();
    expect(backend.snapshot('songs').find((row) => row.id === 'song-conflict')).toMatchObject({
      title: 'Revisao maior',
      revision: 3,
    });
  });

  it('sincroniza itens separados e e idempotente', async () => {
    const database = await createDatabase('sync-items');
    databases.push(database);
    const backend = new InMemorySyncBackend();
    const song = makeSong('song-item', 'Item');
    const repertory = {
      id: 'repertory-item',
      name: 'Show',
      description: null,
      createdAt,
      updatedAt: createdAt,
      deletedAt: null,
      revision: 1,
      syncPending: false,
    };
    const item = {
      id: 'item-1',
      repertoryId: repertory.id,
      songId: song.id,
      position: 500,
      preferredKey: 'D',
      createdAt,
      updatedAt: createdAt,
      deletedAt: null,
      revision: 2,
      syncPending: false,
    };
    backend.seed('songs', [songToRemote(song, userA)]);
    backend.seed('repertories', [repertoryToRemote(repertory, userA)]);
    backend.seed('repertoryItems', [repertoryItemToRemote(item, userA)]);
    const coordinator = new SyncCoordinator(backend, userA, { database, retryEnabled: false });
    await coordinator.runOnce();
    expect(await database.repertoryItems.get(item.id)).toMatchObject({
      position: 500,
      preferredKey: 'D',
      syncPending: false,
    });
    const second = await coordinator.runOnce();
    expect(second.pulled).toBe(0);
    expect(second.pushed).toBe(0);
  });

  it('recupera falha de lote reenviando o registro individualmente', async () => {
    const database = await createDatabase('sync-failure');
    databases.push(database);
    const backend = new InMemorySyncBackend();
    await database.songs.add(makeSong('song-failure', 'Pendente'));
    const coordinator = new SyncCoordinator(new FailingPushBackend(backend), userA, {
      database,
      retryEnabled: false,
    });
    const first = await coordinator.runOnce();
    expect(first.errors).toBe(0);
    expect((await database.songs.get('song-failure'))?.syncPending).toBe(false);
  });

  it('isola registro invalido no lote e sincroniza os demais', async () => {
    const database = await createDatabase('sync-invalid-row');
    databases.push(database);
    const backend = new InMemorySyncBackend();
    await database.songs.bulkAdd([
      makeSong('song-valid-batch', 'Valida'),
      makeSong('song-invalid-batch', 'Invalida'),
    ]);
    const coordinator = new SyncCoordinator(
      new InvalidRowBackend(backend, 'song-invalid-batch'),
      userA,
      { database, retryEnabled: false },
    );

    const result = await coordinator.runOnce();

    expect(result.errors).toBe(1);
    expect(await database.songs.get('song-valid-batch')).toMatchObject({
      syncPending: false,
      syncError: null,
    });
    expect(await database.songs.get('song-invalid-batch')).toMatchObject({
      syncPending: true,
      syncError: 'registro invalido',
    });
    expect(backend.snapshot('songs').map((row) => row.id)).toEqual(['song-valid-batch']);
  });

  it('baixa registro dentro da margem de dois minutos do cursor', async () => {
    const database = await createDatabase('sync-cursor-margin');
    databases.push(database);
    const backend = new InMemorySyncBackend();
    const cursor = {
      updatedAt: '2026-01-01T00:10:00.000Z',
      id: 'song-cursor',
    } satisfies SyncCursor;
    const remote = songToRemote(
      { ...makeSong('song-margin', 'Margem', 2, false), updatedAt: '2026-01-01T00:09:30.000Z' },
      userA,
    );
    backend.seed('songs', [remote]);
    await writeSyncSetting(SYNC_CURSOR_KEYS.songs, encodeSyncCursor(cursor), database);

    const result = await new SyncCoordinator(backend, userA, {
      database,
      retryEnabled: false,
    }).runOnce();

    expect(result.pulled).toBe(1);
    expect(await database.songs.get('song-margin')).toMatchObject({ title: 'Margem' });
  });

  it('pagina registros com updated_at identico usando id como desempate', async () => {
    const database = await createDatabase('sync-same-updated-at');
    databases.push(database);
    const backend = new InMemorySyncBackend();
    const updatedAt = '2026-01-01T00:20:00.000Z';
    const rows = Array.from({ length: 251 }, (_, index) =>
      songToRemote(
        {
          ...makeSong(`song-page-${String(index).padStart(3, '0')}`, `Pagina ${index}`, 1, false),
          updatedAt,
        },
        userA,
      ),
    );
    backend.seed('songs', rows);

    const result = await new SyncCoordinator(backend, userA, {
      database,
      retryEnabled: false,
    }).runOnce();

    expect(result.pulled).toBe(251);
    expect(await database.songs.count()).toBe(251);
    expect((await readSyncMetadata(database)).cursors.songs).toContain('song-page-250');
  });

  it('reenvia o mesmo registro de forma idempotente', async () => {
    const database = await createDatabase('sync-idempotent-resend');
    databases.push(database);
    const backend = new InMemorySyncBackend();
    const coordinator = new SyncCoordinator(backend, userA, { database, retryEnabled: false });
    await database.songs.add(makeSong('song-idempotent', 'Idempotente'));
    await coordinator.runOnce();
    const accepted = backend.snapshot('songs').find((row) => row.id === 'song-idempotent')!;
    await database.songs.put({
      ...(await database.songs.get('song-idempotent'))!,
      syncPending: true,
    });
    await writeSyncSetting(
      SYNC_CURSOR_KEYS.songs,
      encodeSyncCursor({ updatedAt: '2099-01-01T00:00:00.000Z', id: 'z' }),
      database,
    );

    await coordinator.runOnce();

    expect(backend.snapshot('songs').find((row) => row.id === 'song-idempotent')).toEqual(accepted);
    expect(await database.songs.get('song-idempotent')).toMatchObject({ syncPending: false });
  });

  it('enfileira uma nova solicitação durante uma sincronização', async () => {
    const database = await createDatabase('sync-queue');
    databases.push(database);
    const backend = new CountingBackend(new InMemorySyncBackend());
    const coordinator = new SyncCoordinator(backend, userA, { database, retryEnabled: false });
    const first = coordinator.requestSync();
    await backend.waitForFirstPull();
    const second = coordinator.requestSync();
    backend.release();
    await expect(first).resolves.toMatchObject({ pending: 0 });
    await expect(second).resolves.toMatchObject({ pending: 0 });
    expect(backend.pullCount).toBeGreaterThan(3);
  });

  it('bloqueia conta diferente sem tocar nos dados locais', async () => {
    const database = await createDatabase('sync-account');
    databases.push(database);
    await database.songs.add(makeSong('song-account', 'Local'));
    await writeSyncSetting(SYNC_OWNER_KEY, userA, database);
    const coordinator = new SyncCoordinator(new InMemorySyncBackend(), userB, {
      database,
      retryEnabled: false,
    });
    await expect(coordinator.runOnce()).rejects.toBeInstanceOf(SyncAccountMismatchError);
    expect(await database.songs.get('song-account')).toMatchObject({
      title: 'Local',
      syncPending: true,
    });
    expect((await readSyncMetadata(database)).ownerUserId).toBe(userA);
  });
});
