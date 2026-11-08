import type { Table } from 'dexie';

import { db, openDatabase, type MeuRepertorioDatabase } from '@/database';
import type { Repertory, RepertoryItem, Song } from '@/types';

import {
  SYNC_CURSOR_KEYS,
  SYNC_LAST_SYNC_KEY,
  SYNC_OWNER_KEY,
  compareSyncCursors,
  cursorWithMargin,
  decodeSyncCursor,
  encodeSyncCursor,
  listSyncErrors,
  pendingSyncCount,
  readSyncMetadata,
  writeSyncSetting,
} from './metadata';
import { localToRemote, remoteToLocal } from './mappers';
import {
  type LocalRow,
  type RemoteRow,
  type SyncBackend,
  type SyncCursor,
  type SyncResult,
  type SyncTable,
  SyncAccountMismatchError,
} from './contracts';

const PULL_BATCH_SIZE = 250;
const PUSH_BATCH_SIZE = 50;
const MAX_RETRY_DELAY_MS = 60_000;

type SyncTableRow = Song | Repertory | RepertoryItem;

function tableFor(database: MeuRepertorioDatabase, table: SyncTable): Table<SyncTableRow, string> {
  if (table === 'songs') return database.songs;
  if (table === 'repertories') return database.repertories;
  return database.repertoryItems;
}

function remoteWins(remote: RemoteRow, local: LocalRow | undefined): boolean {
  if (!local) return true;
  if (remote.revision !== local.revision) return remote.revision > local.revision;
  // Em empate, o servidor ja possui a versao escolhida pelo backend.
  return true;
}

function sameRemoteContent(remote: RemoteRow, local: LocalRow): boolean {
  const remoteLocal = remoteToLocal(remote) as unknown as Record<string, unknown>;
  const localCopy = { ...(local as unknown as Record<string, unknown>) };
  for (const key of ['updatedAt', 'syncPending', 'syncError']) {
    delete remoteLocal[key];
    delete localCopy[key];
  }
  return JSON.stringify(remoteLocal) === JSON.stringify(localCopy);
}

async function applyRemoteRow(
  database: MeuRepertorioDatabase,
  row: RemoteRow,
  onNotice?: (message: string) => void,
): Promise<boolean> {
  const table: SyncTable =
    'structure' in row ? 'songs' : 'repertory_id' in row ? 'repertoryItems' : 'repertories';
  const target = tableFor(database, table);
  const local = await target.get(row.id);
  if (!remoteWins(row, local)) return false;

  if (local && row.revision === local.revision && sameRemoteContent(row, local)) {
    // A margem do cursor pode baixar a mesma linha novamente. Não regravá-la
    // torna a aplicacao realmente idempotente, preservando tambem updatedAt local.
    if (local.syncPending !== true && !local.syncError) return false;
  }

  if (
    local &&
    local.syncPending === true &&
    row.revision === local.revision &&
    !sameRemoteContent(row, local)
  ) {
    onNotice?.('Uma alteração local foi descartada: a versão do servidor venceu.');
  }

  const next = remoteToLocal(row);
  await target.put(next);
  return true;
}

async function pendingRows(
  database: MeuRepertorioDatabase,
  table: SyncTable,
): Promise<SyncTableRow[]> {
  const rows = await tableFor(database, table)
    .filter((row) => row.syncPending === true)
    .toArray();
  return rows;
}

async function applyPushResults(
  inputRows: readonly SyncTableRow[],
  remoteRows: readonly RemoteRow[],
  database: MeuRepertorioDatabase,
  onNotice?: (message: string) => void,
): Promise<number> {
  const inputById = new Map(inputRows.map((row) => [row.id, row]));
  let applied = 0;

  for (const remote of remoteRows) {
    const input = inputById.get(remote.id);
    const table: SyncTable =
      'structure' in remote ? 'songs' : 'repertory_id' in remote ? 'repertoryItems' : 'repertories';
    const current = await tableFor(database, table).get(remote.id);
    // Uma edicao feita durante o request permanece pendente.
    if (!input || !current || current.revision !== input.revision) continue;
    if (await applyRemoteRow(database, remote, onNotice)) applied += 1;
  }

  return applied;
}

export interface SyncCoordinatorOptions {
  readonly retryEnabled?: boolean;
  readonly retryBaseDelayMs?: number;
  readonly database?: MeuRepertorioDatabase;
  readonly onNotice?: (message: string) => void;
}

export class SyncCoordinator {
  private running = false;
  private queued = false;
  private waiters: Array<{
    resolve: (result: SyncResult) => void;
    reject: (error: unknown) => void;
  }> = [];
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryCount = 0;
  private readonly retryEnabled: boolean;
  private readonly retryBaseDelayMs: number;
  private readonly database: MeuRepertorioDatabase;
  private readonly onNotice: ((message: string) => void) | undefined;

  constructor(
    private readonly backend: SyncBackend,
    private readonly userId: string,
    options: SyncCoordinatorOptions = {},
  ) {
    this.retryEnabled = options.retryEnabled ?? true;
    this.retryBaseDelayMs = options.retryBaseDelayMs ?? 1_000;
    this.database = options.database ?? db;
    this.onNotice = options.onNotice;
  }

  requestSync(): Promise<SyncResult> {
    this.queued = true;
    const promise = new Promise<SyncResult>((resolve, reject) => {
      this.waiters.push({ resolve, reject });
    });
    void this.drain();
    return promise;
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;

    while (this.queued) {
      this.queued = false;
      const cycleWaiters = this.waiters.splice(0);
      try {
        const result = await this.runOnce();
        this.retryCount = 0;
        for (const waiter of cycleWaiters) waiter.resolve(result);
      } catch (error: unknown) {
        this.retryCount += 1;
        for (const waiter of cycleWaiters) waiter.reject(error);
        this.scheduleRetry();
      }
    }

    this.running = false;
  }

  private scheduleRetry(): void {
    if (!this.retryEnabled || this.retryTimer) return;
    const delay = Math.min(
      MAX_RETRY_DELAY_MS,
      this.retryBaseDelayMs * 2 ** Math.max(0, this.retryCount - 1),
    );
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.requestSync().catch(() => undefined);
    }, delay);
  }

  async runOnce(): Promise<SyncResult> {
    await openDatabase(this.database);
    const metadata = await readSyncMetadata(this.database);
    if (metadata.ownerUserId && metadata.ownerUserId !== this.userId) {
      throw new SyncAccountMismatchError(metadata.ownerUserId, this.userId);
    }
    if (!metadata.ownerUserId) await writeSyncSetting(SYNC_OWNER_KEY, this.userId, this.database);

    let pulled = 0;
    let pushed = 0;
    for (const table of ['songs', 'repertories', 'repertoryItems'] as const) {
      pulled += await this.pullTable(table, metadata.cursors[table]);
    }
    for (const table of ['songs', 'repertories', 'repertoryItems'] as const) {
      pushed += await this.pushTable(table);
    }

    const completedAt = new Date().toISOString();
    await writeSyncSetting(SYNC_LAST_SYNC_KEY, completedAt, this.database);
    return {
      pulled,
      pushed,
      pending: await pendingSyncCount(this.database),
      errors: (await listSyncErrors(this.database)).length,
      completedAt,
    };
  }

  private async pullTable(table: SyncTable, initialCursor: string | null): Promise<number> {
    const storedCursor = decodeSyncCursor(initialCursor);
    let requestCursor: SyncCursor | null = storedCursor ? cursorWithMargin(storedCursor) : null;
    let effectiveCursor = storedCursor;
    let pulled = 0;

    while (true) {
      const page = await this.backend.pull(table, this.userId, requestCursor, PULL_BATCH_SIZE);
      for (const row of page.rows) {
        if (await applyRemoteRow(this.database, row, this.onNotice)) pulled += 1;
      }

      const nextCursor = page.nextCursor;
      if (nextCursor && (!effectiveCursor || compareSyncCursors(nextCursor, effectiveCursor) > 0)) {
        await writeSyncSetting(
          SYNC_CURSOR_KEYS[table],
          encodeSyncCursor(nextCursor),
          this.database,
        );
        effectiveCursor = nextCursor;
      }
      if (!page.hasMore) break;
      if (!nextCursor || (requestCursor && compareSyncCursors(nextCursor, requestCursor) <= 0)) {
        throw new Error(`O backend não avançou o cursor de ${table}.`);
      }
      requestCursor = nextCursor;
    }

    return pulled;
  }

  private async pushTable(table: SyncTable): Promise<number> {
    const rows = await pendingRows(this.database, table);
    let pushed = 0;
    for (let index = 0; index < rows.length; index += PUSH_BATCH_SIZE) {
      const batch = rows.slice(index, index + PUSH_BATCH_SIZE);
      const remote = batch.map((row) => localToRemote(row, this.userId));
      try {
        const result = await this.backend.push(table, this.userId, remote);
        pushed += await applyPushResults(batch, result, this.database, this.onNotice);
      } catch {
        for (const row of batch) {
          try {
            const result = await this.backend.push(table, this.userId, [
              localToRemote(row, this.userId),
            ]);
            pushed += await applyPushResults([row], result, this.database, this.onNotice);
          } catch (cause: unknown) {
            await this.markSyncError(table, row.id, row.revision, this.errorMessage(cause));
          }
        }
      }
    }
    return pushed;
  }

  private async markSyncError(
    table: SyncTable,
    id: string,
    revision: number,
    message: string,
  ): Promise<void> {
    const source = tableFor(this.database, table);
    const current = await source.get(id);
    if (!current || current.revision !== revision) return;
    await source.put({ ...current, syncPending: true, syncError: message });
  }

  private errorMessage(cause: unknown): string {
    return cause instanceof Error ? cause.message : 'Registro rejeitado pelo servidor.';
  }
}
