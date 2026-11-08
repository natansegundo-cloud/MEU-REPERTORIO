import { afterEach, describe, expect, it, vi } from 'vitest';

import { requestPersistentStorage } from './storage';

const originalStorage = Object.getOwnPropertyDescriptor(Navigator.prototype, 'storage');

function mockStorage(value: StorageManager | undefined): void {
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value,
  });
}

afterEach(() => {
  if (originalStorage) {
    Object.defineProperty(Navigator.prototype, 'storage', originalStorage);
  } else {
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: undefined,
    });
  }
  vi.restoreAllMocks();
});

describe('requestPersistentStorage', () => {
  it('retorna unsupported quando a API não existe', async () => {
    mockStorage(undefined);

    await expect(requestPersistentStorage()).resolves.toBe('unsupported');
  });

  it('mantém o estado persistido sem pedir novamente', async () => {
    const persist = vi.fn<StorageManager['persist']>();
    mockStorage({
      persisted: vi.fn().mockResolvedValue(true),
      persist,
    } as unknown as StorageManager);

    await expect(requestPersistentStorage()).resolves.toBe('persisted');
    expect(persist).not.toHaveBeenCalled();
  });

  it('solicita persistência quando ainda não foi concedida', async () => {
    const persist = vi.fn().mockResolvedValue(true);
    mockStorage({
      persisted: vi.fn().mockResolvedValue(false),
      persist,
    } as unknown as StorageManager);

    await expect(requestPersistentStorage()).resolves.toBe('persisted');
    expect(persist).toHaveBeenCalledOnce();
  });

  it('informa quando o navegador recusa ou falha na solicitação', async () => {
    mockStorage({
      persisted: vi.fn().mockResolvedValue(false),
      persist: vi.fn().mockResolvedValue(false),
    } as unknown as StorageManager);
    await expect(requestPersistentStorage()).resolves.toBe('not-persisted');

    mockStorage({
      persisted: vi.fn().mockRejectedValue(new Error('storage unavailable')),
      persist: vi.fn(),
    } as unknown as StorageManager);
    await expect(requestPersistentStorage()).resolves.toBe('not-persisted');
  });
});
