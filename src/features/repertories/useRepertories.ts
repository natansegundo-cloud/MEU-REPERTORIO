import { useEffect, useState } from 'react';

import { observeRepertories, observeRepertoryDetail } from '@/services';
import type { EntityId } from '@/types';
import type { RepertoryDetail, RepertorySummary } from '@/services';

interface AsyncState<T> {
  readonly key: string | null;
  readonly data: T;
  readonly loading: boolean;
  readonly error: Error | null;
}

export function useRepertories(query = ''): {
  data: readonly RepertorySummary[];
  loading: boolean;
  error: Error | null;
} {
  const [state, setState] = useState<AsyncState<readonly RepertorySummary[]>>({
    key: '',
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const subscription = observeRepertories().subscribe({
      next: (items) => setState({ key: query, data: items, loading: false, error: null }),
      error: (cause: unknown) =>
        setState({
          key: query,
          data: [],
          loading: false,
          error:
            cause instanceof Error ? cause : new Error('Não foi possível carregar os repertórios.'),
        }),
    });
    return () => subscription.unsubscribe();
  }, [query]);

  if (state.key !== query) return { data: [], loading: true, error: null };
  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
  const data = normalizedQuery
    ? state.data.filter((item) => item.name.toLocaleLowerCase('pt-BR').includes(normalizedQuery))
    : state.data;
  return { data, loading: state.loading, error: state.error };
}

export function useRepertoryDetail(id: EntityId | null): {
  data: RepertoryDetail | null;
  loading: boolean;
  error: Error | null;
} {
  const [state, setState] = useState<AsyncState<RepertoryDetail | null>>({
    key: id,
    data: null,
    loading: Boolean(id),
    error: null,
  });

  useEffect(() => {
    if (!id) return undefined;
    const subscription = observeRepertoryDetail(id).subscribe({
      next: (detail) => setState({ key: id, data: detail ?? null, loading: false, error: null }),
      error: (cause: unknown) =>
        setState({
          key: id,
          data: null,
          loading: false,
          error: cause instanceof Error ? cause : new Error('Não foi possível abrir o repertório.'),
        }),
    });
    return () => subscription.unsubscribe();
  }, [id]);

  if (state.key !== id) return { data: null, loading: Boolean(id), error: null };
  return state;
}
