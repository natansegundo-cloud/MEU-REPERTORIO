import { describe, expect, it, vi } from 'vitest';

import { releaseScreenWakeLock, requestScreenWakeLock, supportsScreenWakeLock } from './wake-lock';

describe('screen wake lock', () => {
  it('solicita e libera o bloqueio quando a API está disponível', async () => {
    const handle = { release: vi.fn().mockResolvedValue(undefined) };
    const provider = { wakeLock: { request: vi.fn().mockResolvedValue(handle) } };

    expect(supportsScreenWakeLock(provider)).toBe(true);
    await expect(requestScreenWakeLock(provider, true)).resolves.toBe(handle);
    await releaseScreenWakeLock(handle);
    expect(provider.wakeLock.request).toHaveBeenCalledWith('screen');
    expect(handle.release).toHaveBeenCalledOnce();
  });

  it('trata ausência, página oculta e falha sem quebrar o show', async () => {
    const unsupported = {};
    const failing = { wakeLock: { request: vi.fn().mockRejectedValue(new Error('blocked')) } };

    expect(supportsScreenWakeLock(unsupported)).toBe(false);
    await expect(requestScreenWakeLock(unsupported, true)).resolves.toBeNull();
    await expect(requestScreenWakeLock(failing, false)).resolves.toBeNull();
    await expect(requestScreenWakeLock(failing, true)).resolves.toBeNull();
  });
});
