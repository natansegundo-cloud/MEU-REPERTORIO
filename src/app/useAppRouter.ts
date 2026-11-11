import { useCallback, useEffect, useRef, useState } from 'react';

import { LIBRARY_ROUTE, isSameRoute, parseRoute, routeToHash, type AppRoute } from './routes';

interface AppHistoryState {
  readonly appRouter?: boolean;
  readonly appDepth?: number;
  readonly appScrollY?: number;
  readonly [key: string]: unknown;
}

export type RouteGuard = (next: AppRoute, current: AppRoute) => boolean;

export interface AppRouter {
  readonly route: AppRoute;
  readonly canGoBack: boolean;
  navigate: (route: AppRoute, options?: { readonly replace?: boolean }) => void;
  back: (fallback: AppRoute) => void;
}

function historyState(): AppHistoryState {
  return (window.history.state ?? {}) as AppHistoryState;
}

function readDepth(): number {
  const depth = historyState().appDepth;
  return typeof depth === 'number' && Number.isFinite(depth) ? depth : 0;
}

function readScroll(): number {
  const scroll = historyState().appScrollY;
  return typeof scroll === 'number' && Number.isFinite(scroll) ? scroll : 0;
}

export function useAppRouter(guard?: RouteGuard): AppRouter {
  const [route, setRoute] = useState<AppRoute>(() => parseRoute(window.location.hash));
  const [depth, setDepth] = useState(() => readDepth());
  const routeRef = useRef(route);
  const depthRef = useRef(depth);
  const lastHashRef = useRef(routeToHash(route));
  const pendingScrollRef = useRef<number | null>(null);

  useEffect(() => {
    const state = historyState();
    if (state.appRouter !== true) {
      window.history.replaceState(
        { ...state, appRouter: true, appDepth: depthRef.current },
        '',
        window.location.href,
      );
    }
    if (!window.location.hash) {
      window.history.replaceState(
        { ...historyState(), appRouter: true, appDepth: depthRef.current },
        '',
        routeToHash(LIBRARY_ROUTE),
      );
      lastHashRef.current = routeToHash(LIBRARY_ROUTE);
    }
  }, []);

  useEffect(() => {
    const scroll = pendingScrollRef.current;
    if (scroll === null) return undefined;
    pendingScrollRef.current = null;
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: scroll, behavior: 'auto' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [route]);

  const commit = useCallback((next: AppRoute, nextDepth: number, scroll: number) => {
    routeRef.current = next;
    depthRef.current = nextDepth;
    lastHashRef.current = routeToHash(next);
    pendingScrollRef.current = scroll;
    setRoute(next);
    setDepth(nextDepth);
  }, []);

  const navigate = useCallback(
    (next: AppRoute, options: { readonly replace?: boolean } = {}) => {
      if (isSameRoute(routeRef.current, next)) {
        window.scrollTo({ top: 0, behavior: 'auto' });
        return;
      }

      const previousState = historyState();
      window.history.replaceState(
        {
          ...previousState,
          appRouter: true,
          appDepth: depthRef.current,
          appScrollY: window.scrollY,
        },
        '',
        window.location.href,
      );

      const nextDepth = options.replace ? depthRef.current : depthRef.current + 1;
      const state = {
        ...previousState,
        appRouter: true,
        appDepth: nextDepth,
        appScrollY: 0,
      } satisfies AppHistoryState;
      if (options.replace) {
        window.history.replaceState(state, '', routeToHash(next));
      } else {
        window.history.pushState(state, '', routeToHash(next));
      }
      commit(next, nextDepth, 0);
    },
    [commit],
  );

  const back = useCallback(
    (fallback: AppRoute) => {
      if (depthRef.current > 0) {
        window.history.back();
        return;
      }
      navigate(fallback, { replace: true });
    },
    [navigate],
  );

  useEffect(() => {
    function handleHistoryChange(): void {
      if (window.location.hash === lastHashRef.current) return;

      const next = parseRoute(window.location.hash);
      const current = routeRef.current;
      if (guard && !guard(next, current)) {
        window.history.pushState(
          {
            ...historyState(),
            appRouter: true,
            appDepth: depthRef.current,
            appScrollY: window.scrollY,
          },
          '',
          routeToHash(current),
        );
        return;
      }

      commit(next, readDepth(), readScroll());
    }

    window.addEventListener('popstate', handleHistoryChange);
    window.addEventListener('hashchange', handleHistoryChange);
    return () => {
      window.removeEventListener('popstate', handleHistoryChange);
      window.removeEventListener('hashchange', handleHistoryChange);
    };
  }, [commit, guard]);

  return { route, canGoBack: depth > 0, navigate, back };
}
