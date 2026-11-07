let scheduleSync: (() => void) | null = null;

export function configureSyncTrigger(trigger: (() => void) | null): void {
  scheduleSync = trigger;
}

export function notifyLocalSyncChange(): void {
  scheduleSync?.();
}
