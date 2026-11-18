import { useCallback, useSyncExternalStore } from 'react';

import {
  getAppearanceSnapshot,
  setAppearancePreference,
  subscribeAppearance,
  type AppearancePreference,
  type AppearanceSnapshot,
} from '@/services';

export interface UseAppearanceResult extends AppearanceSnapshot {
  readonly setPreference: (preference: AppearancePreference) => Promise<void>;
}

export function useAppearance(): UseAppearanceResult {
  const snapshot = useSyncExternalStore(
    subscribeAppearance,
    getAppearanceSnapshot,
    getAppearanceSnapshot,
  );

  const handleSetPreference = useCallback(
    (preference: AppearancePreference) => setAppearancePreference(preference),
    [],
  );

  return {
    ...snapshot,
    setPreference: handleSetPreference,
  };
}
