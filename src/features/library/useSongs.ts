import { useEffect, useState } from 'react';

import { observeSong, observeSongs } from '@/services';
import type { EntityId, Song } from '@/types';

interface AsyncState<T> {
  readonly key: string | null;
  readonly data: T;
  readonly loading: boolean;
  readonly error: Error | null;
}

export function useSongs(query: string): Omit<AsyncState<readonly Song[]>, 'key'> {
  const [state, setState] = useState<AsyncState<readonly Song[]>>({
    key: '',
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const subscription = observeSongs(query).subscribe({
      next: (songs) => setState({ key: query, data: songs, loading: false, error: null }),
      error: (cause: unknown) =>
        setState({
          key: query,
          data: [],
          loading: false,
          error:
            cause instanceof Error ? cause : new Error('Não foi possível carregar a biblioteca.'),
        }),
    });

    return () => subscription.unsubscribe();
  }, [query]);

  if (state.key !== query) return { data: [], loading: true, error: null };
  return state;
}

export function useSong(id: EntityId | null): Omit<AsyncState<Song | null>, 'key'> {
  const [state, setState] = useState<AsyncState<Song | null>>({
    key: id,
    data: null,
    loading: Boolean(id),
    error: null,
  });

  useEffect(() => {
    if (!id) return undefined;

    const subscription = observeSong(id).subscribe({
      next: (song) => setState({ key: id, data: song ?? null, loading: false, error: null }),
      error: (cause: unknown) =>
        setState({
          key: id,
          data: null,
          loading: false,
          error: cause instanceof Error ? cause : new Error('Não foi possível abrir a música.'),
        }),
    });

    return () => subscription.unsubscribe();
  }, [id]);

  if (state.key !== id) return { data: null, loading: Boolean(id), error: null };
  return state;
}
