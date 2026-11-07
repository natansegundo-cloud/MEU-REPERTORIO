import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { LegacyPayload } from './v1';

export async function readLegacySupabase(
  client: SupabaseClient,
  userId?: string,
): Promise<LegacyPayload> {
  const songsQuery = client
    .from('songs')
    .select('id,title,artist,key,body,structure,semi,pref,created_at,updated_at');
  const setlistsQuery = client
    .from('setlists')
    .select('id,name,items,deleted,created_at,updated_at');
  if (userId) {
    songsQuery.eq('user_id', userId);
    setlistsQuery.eq('user_id', userId);
  }
  const [{ data: songs, error: songsError }, { data: setlists, error: setlistsError }] =
    await Promise.all([songsQuery, setlistsQuery]);
  if (songsError) throw new Error(`Não foi possível ler as músicas antigas: ${songsError.message}`);
  if (setlistsError)
    throw new Error(`Não foi possível ler os repertórios antigos: ${setlistsError.message}`);
  const { data: pdfs } = userId
    ? await client.storage.from('song-pdfs').list(userId, { limit: 1000 })
    : { data: null };
  return {
    app: 'meu-repertorio-v1-cloud',
    v: 3,
    songs: songs ?? [],
    setlists: setlists ?? [],
    ...(pdfs ? { legacyPdfCount: pdfs.length } : {}),
  };
}

export async function createLegacySupabaseReader(): Promise<{
  readonly client: SupabaseClient;
  readonly userId: string;
} | null> {
  const env = import.meta.env as Record<string, string | undefined>;
  const url = env.VITE_SUPABASE_URL?.trim();
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return null;
  const client = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  const { data, error } = await client.auth.getSession();
  if (error || !data.session?.user.id) return null;
  return { client, userId: data.session.user.id };
}
