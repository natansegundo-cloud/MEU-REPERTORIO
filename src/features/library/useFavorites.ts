import { useEffect, useState } from 'react';

import { observeFavoriteSongIds, observeIsFavorite } from '@/services';

export function useFavoriteIds(): ReadonlySet<string> {
  const [ids, setIds] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    const subscription = observeFavoriteSongIds().subscribe({ next: setIds });
    return () => subscription.unsubscribe();
  }, []);
  return ids;
}

export function useIsFavorite(songId: string): boolean {
  const [favorite, setFavorite] = useState(false);
  useEffect(() => {
    const subscription = observeIsFavorite(songId).subscribe({ next: setFavorite });
    return () => subscription.unsubscribe();
  }, [songId]);
  return favorite;
}
