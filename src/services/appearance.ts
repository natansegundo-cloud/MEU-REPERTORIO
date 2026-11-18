import { getPreference, setPreference } from './preferences';

export type AppearancePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';
export type ThemeSurface = 'app' | 'stage';

export interface AppearanceSnapshot {
  readonly preference: AppearancePreference;
  readonly resolvedTheme: ResolvedTheme;
  readonly surface: ThemeSurface;
}

export const APPEARANCE_PREFERENCE_KEY = 'ui.appearance';
export const APPEARANCE_STORAGE_KEY = 'meu-repertorio:appearance';

export const THEME_COLORS = {
  light: '#f5f5f7',
  dark: '#0b0c0e',
  stage: '#0b0c0e',
} as const;

const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

let currentPreference: AppearancePreference = 'system';
let currentSurface: ThemeSurface = 'app';
let snapshotCache: AppearanceSnapshot = {
  preference: 'system',
  resolvedTheme: 'light',
  surface: 'app',
};
let writeVersion = 0;
let mediaCleanup: (() => void) | null = null;
const listeners = new Set<() => void>();

export function isAppearancePreference(value: unknown): value is AppearancePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(DARK_MEDIA_QUERY).matches;
}

export function resolveAppearanceTheme(
  preference: AppearancePreference,
  prefersDark: boolean = systemPrefersDark(),
): ResolvedTheme {
  if (preference === 'dark') return 'dark';
  if (preference === 'light') return 'light';
  return prefersDark ? 'dark' : 'light';
}

export function themeColorForState(resolvedTheme: ResolvedTheme, surface: ThemeSurface): string {
  if (surface === 'stage') return THEME_COLORS.stage;
  return resolvedTheme === 'dark' ? THEME_COLORS.dark : THEME_COLORS.light;
}

function readCachedPreference(): AppearancePreference | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(APPEARANCE_STORAGE_KEY);
    return isAppearancePreference(raw) ? raw : null;
  } catch {
    return null;
  }
}

function writeCachedPreference(preference: AppearancePreference): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, preference);
  } catch {
    // Ambientes restritos ou navegação privada continuam funcionando via IndexedDB e memória.
  }
}

function clearCachedPreference(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(APPEARANCE_STORAGE_KEY);
  } catch {
    // ignora em ambiente restrito
  }
}

function syncThemeColorMeta(color: string): void {
  if (typeof document === 'undefined') return;
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta && document.head) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  if (meta && meta.getAttribute('content') !== color) {
    meta.setAttribute('content', color);
  }
}

function applyAppearanceToDocument(): void {
  const resolvedTheme = resolveAppearanceTheme(currentPreference);
  const nextColor = themeColorForState(resolvedTheme, currentSurface);

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;
    syncThemeColorMeta(nextColor);
  }

  if (
    snapshotCache.preference !== currentPreference ||
    snapshotCache.resolvedTheme !== resolvedTheme ||
    snapshotCache.surface !== currentSurface
  ) {
    snapshotCache = {
      preference: currentPreference,
      resolvedTheme,
      surface: currentSurface,
    };
    for (const listener of listeners) {
      listener();
    }
  }
}

function ensureSystemMediaListener(): void {
  if (mediaCleanup || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return;
  }
  const mediaQuery = window.matchMedia(DARK_MEDIA_QUERY);
  const handleChange = (): void => {
    if (currentPreference === 'system') {
      applyAppearanceToDocument();
    }
  };
  mediaQuery.addEventListener('change', handleChange);
  mediaCleanup = () => {
    mediaQuery.removeEventListener('change', handleChange);
    mediaCleanup = null;
  };
}

function detectInitialSurface(): ThemeSurface {
  if (typeof window === 'undefined') return 'app';
  return /^#\/?show(?:\/|$)/u.test(window.location.hash) ? 'stage' : 'app';
}

export function initializeAppearance(): void {
  currentPreference = readCachedPreference() ?? 'system';
  currentSurface = detectInitialSurface();
  ensureSystemMediaListener();
  applyAppearanceToDocument();
  void hydrateAppearance();
}

export async function hydrateAppearance(): Promise<AppearancePreference> {
  const versionAtStart = writeVersion;
  try {
    const stored = await getPreference<unknown>(APPEARANCE_PREFERENCE_KEY, null);
    if (versionAtStart !== writeVersion) return currentPreference;

    if (isAppearancePreference(stored)) {
      currentPreference = stored;
      writeCachedPreference(stored);
    } else {
      currentPreference = 'system';
      clearCachedPreference();
    }
    applyAppearanceToDocument();
    return currentPreference;
  } catch {
    return currentPreference;
  }
}

export async function setAppearancePreference(preference: AppearancePreference): Promise<void> {
  if (!isAppearancePreference(preference)) return;
  writeVersion += 1;
  currentPreference = preference;
  writeCachedPreference(preference);
  ensureSystemMediaListener();
  applyAppearanceToDocument();
  await setPreference(APPEARANCE_PREFERENCE_KEY, preference);
}

export function setThemeSurface(surface: ThemeSurface): void {
  if (currentSurface === surface) {
    // Garante que a meta tag esteja sincronizada mesmo no primeiro mount.
    syncThemeColorMeta(themeColorForState(snapshotCache.resolvedTheme, surface));
    return;
  }
  currentSurface = surface;
  applyAppearanceToDocument();
}

export function getAppearanceSnapshot(): AppearanceSnapshot {
  return snapshotCache;
}

export function subscribeAppearance(listener: () => void): () => void {
  ensureSystemMediaListener();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetAppearanceForTests(): void {
  mediaCleanup?.();
  listeners.clear();
  writeVersion += 1;
  currentPreference = 'system';
  currentSurface = 'app';
  clearCachedPreference();
  snapshotCache = {
    preference: 'system',
    resolvedTheme: resolveAppearanceTheme('system'),
    surface: 'app',
  };
  applyAppearanceToDocument();
}
