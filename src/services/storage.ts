export type StoragePersistenceStatus = 'unsupported' | 'persisted' | 'not-persisted';

export async function requestPersistentStorage(): Promise<StoragePersistenceStatus> {
  const storage = typeof navigator === 'undefined' ? undefined : navigator.storage;

  if (!storage?.persist || !storage.persisted) {
    return 'unsupported';
  }

  try {
    if (await storage.persisted()) return 'persisted';
    return (await storage.persist()) ? 'persisted' : 'not-persisted';
  } catch {
    return 'not-persisted';
  }
}
