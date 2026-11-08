import { describe, expect, it, vi } from 'vitest';

import { parseSongText } from '@/features/parser';

import type { RemoteSongRow } from './contracts';
import { SyncBackendError } from './contracts';
import { SupabaseBackend } from './supabase-backend';

const userId = '00000000-0000-0000-0000-000000000001';

function makeRow(owner = userId): RemoteSongRow {
  return {
    user_id: owner,
    id: 'song-1',
    title: 'Canção remota',
    artist: 'Artista',
    original_key: 'C',
    current_key: 'C',
    preferred_key: null,
    capo: null,
    tuning: null,
    rhythm: null,
    strumming: null,
    difficulty: null,
    content: 'C\nLetra',
    structure: parseSongText('C\nLetra'),
    notes: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    deleted_at: null,
    revision: 1,
  };
}

function makeQuery(response: { data: unknown; error: Error | null }) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    or: vi.fn(),
  };
  for (const method of ['select', 'eq', 'order', 'limit', 'or']) {
    query[method]!.mockReturnValue(query);
  }
  query.then = vi.fn((onFulfilled: (value: typeof response) => unknown) =>
    Promise.resolve(response).then(onFulfilled),
  );
  return query;
}

function makeBackend(response: { data: unknown; error: Error | null } = { data: [], error: null }) {
  const query = makeQuery(response);
  const auth = {
    getSession: vi.fn(),
    signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
    signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
    verifyOtp: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  };
  const client = {
    auth,
    from: vi.fn(() => query),
    rpc: vi.fn().mockResolvedValue(response),
  };
  return { backend: new SupabaseBackend(client as never), auth, client, query };
}

describe('SupabaseBackend', () => {
  it('converte a sessão e encaminha autenticação sem expor dados locais', async () => {
    const { backend, auth } = makeBackend();
    auth.getSession.mockResolvedValue({
      data: { session: { user: { id: userId, email: 'teste@example.com' } } },
      error: null,
    });

    await expect(backend.getSession()).resolves.toEqual({
      userId,
      email: 'teste@example.com',
    });
    await backend.sendMagicLink('teste@example.com');
    await backend.signInWithGoogle();
    await backend.sendOtp('teste@example.com');
    await backend.verifyOtp('teste@example.com', '123456');
    await backend.signOut();

    expect(auth.signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'teste@example.com' }),
    );
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    expect(auth.verifyOtp).toHaveBeenCalledWith({
      email: 'teste@example.com',
      token: '123456',
      type: 'email',
    });
    expect(auth.signOut).toHaveBeenCalledOnce();
  });

  it('converte código OTP inválido ou expirado em erro seguro', async () => {
    const { backend, auth } = makeBackend();
    auth.verifyOtp.mockResolvedValue({ error: new Error('Token has expired') });

    await expect(backend.verifyOtp('teste@example.com', '123456')).rejects.toMatchObject({
      name: 'SyncBackendError',
      message: 'O código é inválido ou expirou. Solicite um novo código.',
    });
  });

  it('faz pull paginado com cursor composto por updated_at e id', async () => {
    const row = makeRow();
    const { backend, client, query } = makeBackend({ data: [row], error: null });

    const result = await backend.pull(
      'songs',
      userId,
      { updatedAt: '2026-01-01T00:00:00.000Z', id: 'song-0' },
      250,
    );

    expect(client.from).toHaveBeenCalledWith('v2_songs');
    expect(query.eq).toHaveBeenCalledWith('user_id', userId);
    expect(query.or).toHaveBeenCalledWith(
      'updated_at.gt.2026-01-01T00:00:00.000Z,and(updated_at.eq.2026-01-01T00:00:00.000Z,id.gt.song-0)',
    );
    expect(result).toMatchObject({ rows: [row], hasMore: false });
  });

  it('rejeita resposta de pull pertencente a outra conta', async () => {
    const { backend } = makeBackend({
      data: [makeRow('00000000-0000-0000-0000-000000000002')],
      error: null,
    });

    await expect(backend.pull('songs', userId, null, 250)).rejects.toBeInstanceOf(SyncBackendError);
  });

  it('envia lotes para a RPC correspondente e valida o dono da resposta', async () => {
    const row = makeRow();
    const { backend, client } = makeBackend({ data: [row], error: null });

    await expect(backend.push('songs', userId, [row])).resolves.toEqual([row]);

    expect(client.rpc).toHaveBeenCalledWith('v2_upsert_songs', { p_rows: [row] });
  });

  it('converte falhas do cliente em erro de sincronização', async () => {
    const { backend } = makeBackend({ data: null, error: new Error('falha HTTP') });

    await expect(backend.push('songs', userId, [makeRow()])).rejects.toMatchObject({
      name: 'SyncBackendError',
      message: 'Não foi possível enviar os dados da nuvem.',
    });
  });
});
