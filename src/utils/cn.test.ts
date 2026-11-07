import { describe, expect, it } from 'vitest';

import { cn } from './cn';

describe('cn', () => {
  it('mantém apenas classes válidas', () => {
    expect(cn('base', false, null, undefined, 'ativo')).toBe('base ativo');
  });

  it('retorna uma string vazia quando não há classes', () => {
    expect(cn()).toBe('');
  });
});
