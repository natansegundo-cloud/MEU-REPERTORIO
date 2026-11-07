import { useEffect, useSyncExternalStore } from 'react';

import { cloudSyncController, type CloudSyncController } from './controller';

export function useCloudSync(controller: CloudSyncController = cloudSyncController) {
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  useEffect(() => {
    void controller.start();
  }, [controller]);

  return snapshot;
}
