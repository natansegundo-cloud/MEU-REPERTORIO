import type { SectionId } from './navigation';

export type SongRouteOrigin = 'library' | 'favorites';

export type AppRoute =
  | { readonly name: 'library' }
  | { readonly name: 'import' }
  | { readonly name: 'batch-import' }
  | {
      readonly name: 'song';
      readonly songId: string;
      readonly origin: SongRouteOrigin;
    }
  | {
      readonly name: 'song-edit';
      readonly songId: string;
      readonly origin: SongRouteOrigin;
    }
  | { readonly name: 'repertories' }
  | { readonly name: 'repertory'; readonly repertoryId: string }
  | { readonly name: 'favorites' }
  | { readonly name: 'settings' }
  | {
      readonly name: 'show';
      readonly repertoryId: string;
      readonly itemId: string | null;
    };

export const LIBRARY_ROUTE: AppRoute = { name: 'library' };
export const REPERTORIES_ROUTE: AppRoute = { name: 'repertories' };
export const FAVORITES_ROUTE: AppRoute = { name: 'favorites' };
export const SETTINGS_ROUTE: AppRoute = { name: 'settings' };

function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function encodeSegment(value: string): string {
  return encodeURIComponent(value);
}

function songRoute(name: 'song' | 'song-edit', songId: string, origin: SongRouteOrigin): AppRoute {
  return { name, songId, origin };
}

export function routeToHash(route: AppRoute): string {
  switch (route.name) {
    case 'library':
      return '#library';
    case 'import':
      return '#library/import';
    case 'batch-import':
      return '#library/import/batch';
    case 'song':
    case 'song-edit': {
      const suffix = route.name === 'song-edit' ? '/edit' : '';
      return `#${route.origin}/song/${encodeSegment(route.songId)}${suffix}`;
    }
    case 'repertories':
      return '#repertories';
    case 'repertory':
      return `#repertories/${encodeSegment(route.repertoryId)}`;
    case 'favorites':
      return '#favorites';
    case 'settings':
      return '#settings';
    case 'show': {
      const suffix = route.itemId ? `/${encodeSegment(route.itemId)}` : '';
      return `#show/${encodeSegment(route.repertoryId)}${suffix}`;
    }
  }
}

export function parseRoute(hash: string): AppRoute {
  const normalized = hash.replace(/^#\/?/u, '');
  const segments = normalized.split('/').filter(Boolean);
  const [first, second, third, fourth] = segments;

  if (!first) return LIBRARY_ROUTE;

  if (first === 'show' && second) {
    return {
      name: 'show',
      repertoryId: decodeSegment(second),
      itemId: third ? decodeSegment(third) : null,
    };
  }

  if (first === 'library') {
    if (second === 'import') {
      return third === 'batch' ? { name: 'batch-import' } : { name: 'import' };
    }
    if (second === 'song' && third) {
      return third && fourth === 'edit'
        ? songRoute('song-edit', decodeSegment(third), 'library')
        : songRoute('song', decodeSegment(third), 'library');
    }
    return LIBRARY_ROUTE;
  }

  if (first === 'favorites') {
    if (second === 'song' && third) {
      return fourth === 'edit'
        ? songRoute('song-edit', decodeSegment(third), 'favorites')
        : songRoute('song', decodeSegment(third), 'favorites');
    }
    return FAVORITES_ROUTE;
  }

  if (first === 'repertories') {
    return second ? { name: 'repertory', repertoryId: decodeSegment(second) } : REPERTORIES_ROUTE;
  }

  if (first === 'settings') return SETTINGS_ROUTE;

  return LIBRARY_ROUTE;
}

export function sectionForRoute(route: AppRoute): SectionId {
  switch (route.name) {
    case 'repertories':
    case 'repertory':
    case 'show':
      return 'repertories';
    case 'favorites':
      return 'favorites';
    case 'settings':
      return 'settings';
    case 'song':
    case 'song-edit':
      return route.origin;
    case 'library':
    case 'import':
    case 'batch-import':
      return 'library';
  }
}

export function sectionRoute(section: SectionId): AppRoute {
  switch (section) {
    case 'library':
      return LIBRARY_ROUTE;
    case 'repertories':
      return REPERTORIES_ROUTE;
    case 'favorites':
      return FAVORITES_ROUTE;
    case 'settings':
      return SETTINGS_ROUTE;
  }
}

export function routeFallback(route: AppRoute): AppRoute {
  switch (route.name) {
    case 'import':
    case 'batch-import':
      return LIBRARY_ROUTE;
    case 'song':
    case 'song-edit':
      return route.origin === 'favorites' ? FAVORITES_ROUTE : LIBRARY_ROUTE;
    case 'repertory':
      return REPERTORIES_ROUTE;
    case 'show':
      return { name: 'repertory', repertoryId: route.repertoryId };
    default:
      return route;
  }
}

export function isSameRoute(left: AppRoute, right: AppRoute): boolean {
  return routeToHash(left) === routeToHash(right);
}
