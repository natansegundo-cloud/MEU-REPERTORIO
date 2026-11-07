export type StoragePersistenceStatus = 'unsupported' | 'persisted' | 'not-persisted';

export async function requestPersistentStorage(): Promise<StoragePersistenceStatus> {
  if (
    typeof navigator === 'undefined' ||
    !('storage' in navigator) ||
    !navigator.storage.persist ||
    !navigator.storage.persisted
  ) {
    return 'unsupported';
  }

  try {
    if (await navigator.storage.persisted()) return 'persisted';
    return (await navigator.storage.persist()) ? 'persisted' : 'not-persisted';
  } catch {
    return 'not-persisted';
  }
}
