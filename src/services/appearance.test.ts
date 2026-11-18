import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/database';

import {
  APPEARANCE_PREFERENCE_KEY,
  APPEARANCE_STORAGE_KEY,
  THEME_COLORS,
  getAppearanceSnapshot,
  hydrateAppearance,
  initializeAppearance,
  resetAppearanceForTests,
  setAppearancePreference,
  setThemeSurface,
} from './appearance';
import { getPreference, setPreference } from './preferences';

class MockMediaQueryList {
  matches: boolean;
  readonly media = '(prefers-color-scheme: dark)';
  private readonly listeners = new Set<() => void>();

  constructor(initialMatches: boolean) {
    this.matches = initialMatches;
  }

  addEventListener(_type: string, listener: () => void): void {
    this.listeners.add(listener);
  }

  removeEventListener(_type: string, listener: () => void): void {
    this.listeners.delete(listener);
  }

  setMatches(next: boolean): void {
    this.matches = next;
    for (const listener of this.listeners) {
      listener();
    }
  }
}

describe('appearance service', () => {
  let mediaQuery: MockMediaQueryList;
  const originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');

  beforeEach(async () => {
    await db.delete();
    await db.open();
    mediaQuery = new MockMediaQueryList(false);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: () => mediaQuery,
    });
    document.head.innerHTML = '<meta name="theme-color" content="#f5f5f7" />';
    resetAppearanceForTests();
  });

  afterEach(() => {
    resetAppearanceForTests();
    if (originalMatchMedia) {
      Object.defineProperty(window, 'matchMedia', originalMatchMedia);
    }
  });

  it('usa Sistema como padrão seguro e acompanha mudanças de prefers-color-scheme', () => {
    initializeAppearance();

    expect(getAppearanceSnapshot()).toEqual({
      preference: 'system',
      resolvedTheme: 'light',
      surface: 'app',
    });
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute(
      'content',
      THEME_COLORS.light,
    );

    mediaQuery.setMatches(true);

    expect(getAppearanceSnapshot().resolvedTheme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute(
      'content',
      THEME_COLORS.dark,
    );
  });

  it('persiste Claro e Escuro ignorando a preferência do sistema', async () => {
    initializeAppearance();
    mediaQuery.setMatches(true);

    await setAppearancePreference('light');

    expect(document.documentElement.dataset.theme).toBe('light');
    expect(window.localStorage.getItem(APPEARANCE_STORAGE_KEY)).toBe('light');
    expect(await getPreference(APPEARANCE_PREFERENCE_KEY, 'system')).toBe('light');
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute(
      'content',
      THEME_COLORS.light,
    );

    mediaQuery.setMatches(false);
    await setAppearancePreference('dark');

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem(APPEARANCE_STORAGE_KEY)).toBe('dark');
    expect(await getPreference(APPEARANCE_PREFERENCE_KEY, 'system')).toBe('dark');
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute(
      'content',
      THEME_COLORS.dark,
    );
  });

  it('sincroniza theme-color ao entrar e sair da superfície de palco (Modo Show)', async () => {
    initializeAppearance();
    await setAppearancePreference('light');

    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute(
      'content',
      THEME_COLORS.light,
    );

    setThemeSurface('stage');
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute(
      'content',
      THEME_COLORS.stage,
    );
    expect(document.documentElement.dataset.theme).toBe('light');

    setThemeSurface('app');
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute(
      'content',
      THEME_COLORS.light,
    );
  });

  it('hidrata preferência salva no IndexedDB e trata valores inválidos com segurança', async () => {
    await setPreference(APPEARANCE_PREFERENCE_KEY, 'dark');
    await hydrateAppearance();

    expect(getAppearanceSnapshot().preference).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');

    await setPreference(APPEARANCE_PREFERENCE_KEY, 'invalido');
    await hydrateAppearance();

    expect(getAppearanceSnapshot().preference).toBe('system');
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
