export interface WakeLockHandle {
  readonly release: () => Promise<void>;
}

export interface WakeLockProvider {
  readonly wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockHandle>;
  };
}

export function supportsScreenWakeLock(provider: WakeLockProvider): boolean {
  return Boolean(provider.wakeLock);
}

export async function requestScreenWakeLock(
  provider: WakeLockProvider,
  visible: boolean,
): Promise<WakeLockHandle | null> {
  if (!visible || !provider.wakeLock) return null;
  try {
    return await provider.wakeLock.request('screen');
  } catch {
    return null;
  }
}

export async function releaseScreenWakeLock(handle: WakeLockHandle | null): Promise<void> {
  if (!handle) return;
  try {
    await handle.release();
  } catch {
    // O bloqueio já pode ter sido liberado pelo navegador ao ocultar a página.
  }
}
