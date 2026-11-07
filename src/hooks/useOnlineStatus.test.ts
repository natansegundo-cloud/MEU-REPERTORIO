import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useOnlineStatus } from './useOnlineStatus';

describe('useOnlineStatus', () => {
  it('inicia com o estado informado pelo navegador', () => {
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(navigator.onLine);
  });

  it('reage aos eventos online e offline', () => {
    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current).toBe(true);
  });
});
