import type { Repertory, RepertoryItem, Song } from '@/types';

export type SyncTable = 'songs' | 'repertories' | 'repertoryItems';

export interface RemoteBaseRow {
  readonly user_id: string;
  readonly id: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly deleted_at: string | null;
  readonly revision: number;
}

export interface RemoteSongRow extends RemoteBaseRow {
  readonly title: string;
  readonly artist: string | null;
  readonly original_key: string | null;
  readonly current_key: string | null;
  readonly preferred_key: string | null;
  readonly capo: number | null;
  readonly tuning: string | null;
  readonly rhythm: string | null;
  readonly strumming: string | null;
  readonly difficulty: string | null;
  readonly content: string;
  readonly structure: Song['structure'];
  readonly notes: string | null;
}

export interface RemoteRepertoryRow extends RemoteBaseRow {
  readonly name: string;
  readonly description: string | null;
}

export interface RemoteRepertoryItemRow extends RemoteBaseRow {
  readonly repertory_id: string;
  readonly song_id: string;
  readonly position: number;
  readonly preferred_key: string | null;
}

export type RemoteRow = RemoteSongRow | RemoteRepertoryRow | RemoteRepertoryItemRow;
export type LocalRow = Song | Repertory | RepertoryItem;

export interface SyncCursor {
  readonly updatedAt: string;
  readonly id: string;
}

export interface PullPage {
  readonly rows: readonly RemoteRow[];
  readonly nextCursor: SyncCursor | null;
  readonly hasMore: boolean;
}

export interface SyncBackend {
  pull(
    table: SyncTable,
    userId: string,
    cursor: SyncCursor | null,
    limit: number,
  ): Promise<PullPage>;
  push(table: SyncTable, userId: string, rows: readonly RemoteRow[]): Promise<readonly RemoteRow[]>;
}

export interface AuthSession {
  readonly userId: string;
  readonly email: string | null;
}

export interface CloudBackend extends SyncBackend {
  getSession(): Promise<AuthSession | null>;
  sendMagicLink(email: string): Promise<void>;
  signOut(): Promise<void>;
  onAuthStateChange(listener: (session: AuthSession | null) => void): () => void;
}

export interface SyncResult {
  readonly pulled: number;
  readonly pushed: number;
  readonly pending: number;
  readonly errors: number;
  readonly completedAt: string;
}

export interface SyncErrorInfo {
  readonly table: SyncTable;
  readonly id: string;
  readonly message: string;
}

export class SyncBackendError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'SyncBackendError';
  }
}

export class SyncAccountMismatchError extends Error {
  readonly localUserId: string;
  readonly remoteUserId: string;

  constructor(localUserId: string, remoteUserId: string) {
    super('Esta conta nao corresponde a dona dos dados locais. A sincronizacao foi interrompida.');
    this.name = 'SyncAccountMismatchError';
    this.localUserId = localUserId;
    this.remoteUserId = remoteUserId;
  }
}
