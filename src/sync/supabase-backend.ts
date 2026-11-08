import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';

import {
  type AuthSession,
  type CloudBackend,
  type PullPage,
  type RemoteRow,
  type SyncCursor,
  type SyncTable,
  SyncBackendError,
} from './contracts';

const TABLE_NAMES: Record<SyncTable, string> = {
  songs: 'v2_songs',
  repertories: 'v2_repertories',
  repertoryItems: 'v2_repertory_items',
};

const RPC_NAMES: Record<SyncTable, string> = {
  songs: 'v2_upsert_songs',
  repertories: 'v2_upsert_repertories',
  repertoryItems: 'v2_upsert_repertory_items',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function remoteRowsForUser(data: unknown, userId: string): RemoteRow[] {
  if (data === null || data === undefined) return [];
  if (!Array.isArray(data)) {
    throw new SyncBackendError('A resposta da nuvem tem um formato inválido.');
  }
  const rows = data as RemoteRow[];
  if (
    rows.some((row) => !isRecord(row) || typeof row.user_id !== 'string' || row.user_id !== userId)
  ) {
    throw new SyncBackendError('A resposta da nuvem pertence a outra conta.');
  }
  return rows;
}

function toAuthSession(session: Session | null): AuthSession | null {
  if (!session?.user) return null;
  return { userId: session.user.id, email: session.user.email ?? null };
}

function authRedirectOptions(): { emailRedirectTo?: string; redirectTo?: string } {
  if (typeof window === 'undefined') return {};
  return { emailRedirectTo: window.location.origin, redirectTo: window.location.origin };
}

export class SupabaseBackend implements CloudBackend {
  constructor(private readonly client: SupabaseClient) {}

  async getSession(): Promise<AuthSession | null> {
    const { data, error } = await this.client.auth.getSession();
    if (error)
      throw new SyncBackendError('Não foi possível recuperar a sessão da nuvem.', { cause: error });
    return toAuthSession(data.session);
  }

  async sendMagicLink(email: string): Promise<void> {
    const { emailRedirectTo } = authRedirectOptions();
    const { error } = await this.client.auth.signInWithOtp({
      email,
      options: emailRedirectTo ? { emailRedirectTo } : {},
    });
    if (error)
      throw new SyncBackendError('Não foi possível enviar o link de acesso.', { cause: error });
  }

  async signInWithGoogle(): Promise<void> {
    const { redirectTo } = authRedirectOptions();
    const { error } = await this.client.auth.signInWithOAuth({
      provider: 'google',
      options: redirectTo ? { redirectTo } : {},
    });
    if (error)
      throw new SyncBackendError('Não foi possível iniciar o acesso com Google.', { cause: error });
  }

  async sendOtp(email: string): Promise<void> {
    const { error } = await this.client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error)
      throw new SyncBackendError('Não foi possível enviar o código de acesso.', { cause: error });
  }

  async verifyOtp(email: string, token: string): Promise<void> {
    const { error } = await this.client.auth.verifyOtp({ email, token, type: 'email' });
    if (error)
      throw new SyncBackendError('O código é inválido ou expirou. Solicite um novo código.', {
        cause: error,
      });
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error)
      throw new SyncBackendError('Não foi possível sair da conta da nuvem.', { cause: error });
  }

  onAuthStateChange(listener: (session: AuthSession | null) => void): () => void {
    const { data } = this.client.auth.onAuthStateChange((_event, session) => {
      listener(toAuthSession(session));
    });
    return () => data.subscription.unsubscribe();
  }

  async pull(
    table: SyncTable,
    userId: string,
    cursor: SyncCursor | null,
    limit: number,
  ): Promise<PullPage> {
    let query = this.client
      .from(TABLE_NAMES[table])
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(limit);
    if (cursor) {
      query = query.or(
        `updated_at.gt.${cursor.updatedAt},and(updated_at.eq.${cursor.updatedAt},id.gt.${cursor.id})`,
      );
    }

    const { data, error } = await query;
    if (error)
      throw new SyncBackendError('Não foi possível baixar os dados da nuvem.', { cause: error });
    const rows = remoteRowsForUser(data, userId);
    const last = rows.at(-1);
    return {
      rows,
      nextCursor: last ? { updatedAt: last.updated_at, id: last.id } : cursor,
      hasMore: rows.length >= limit,
    };
  }

  async push(
    table: SyncTable,
    userId: string,
    rows: readonly RemoteRow[],
  ): Promise<readonly RemoteRow[]> {
    const result = (await this.client.rpc(RPC_NAMES[table], {
      p_rows: rows,
    })) as unknown as { data: unknown; error: Error | null };
    const { data, error } = result;
    if (error)
      throw new SyncBackendError('Não foi possível enviar os dados da nuvem.', { cause: error });
    return remoteRowsForUser(data, userId);
  }
}

export function createSupabaseBackend(): CloudBackend | null {
  const env = import.meta.env as Record<string, string | undefined>;
  const url = env.VITE_SUPABASE_URL?.trim();
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) return null;

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') return null;
  } catch {
    return null;
  }

  const client = createClient(url, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });
  return new SupabaseBackend(client);
}
