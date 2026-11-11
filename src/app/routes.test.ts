import { describe, expect, it } from 'vitest';

import {
  FAVORITES_ROUTE,
  LIBRARY_ROUTE,
  REPERTORIES_ROUTE,
  SETTINGS_ROUTE,
  isSameRoute,
  parseRoute,
  routeFallback,
  routeToHash,
  sectionForRoute,
  sectionRoute,
  type AppRoute,
} from './routes';

describe('parseRoute', () => {
  it('trata hash vazio e raiz como biblioteca', () => {
    expect(parseRoute('')).toEqual(LIBRARY_ROUTE);
    expect(parseRoute('#')).toEqual(LIBRARY_ROUTE);
    expect(parseRoute('#/')).toEqual(LIBRARY_ROUTE);
  });

  it('reconhece as seções principais', () => {
    expect(parseRoute('#library')).toEqual(LIBRARY_ROUTE);
    expect(parseRoute('#/library')).toEqual(LIBRARY_ROUTE);
    expect(parseRoute('#repertories')).toEqual(REPERTORIES_ROUTE);
    expect(parseRoute('#favorites')).toEqual(FAVORITES_ROUTE);
    expect(parseRoute('#settings')).toEqual(SETTINGS_ROUTE);
  });

  it('reconhece importação simples e em lote', () => {
    expect(parseRoute('#library/import')).toEqual({ name: 'import' });
    expect(parseRoute('#library/import/batch')).toEqual({ name: 'batch-import' });
  });

  it('reconhece música e edição da biblioteca', () => {
    expect(parseRoute('#library/song/abc')).toEqual({
      name: 'song',
      songId: 'abc',
      origin: 'library',
    });
    expect(parseRoute('#library/song/abc/edit')).toEqual({
      name: 'song-edit',
      songId: 'abc',
      origin: 'library',
    });
  });

  it('reconhece música e edição dos favoritos', () => {
    expect(parseRoute('#favorites/song/abc')).toEqual({
      name: 'song',
      songId: 'abc',
      origin: 'favorites',
    });
    expect(parseRoute('#favorites/song/abc/edit')).toEqual({
      name: 'song-edit',
      songId: 'abc',
      origin: 'favorites',
    });
  });

  it('reconhece repertório aberto', () => {
    expect(parseRoute('#repertories/rep-1')).toEqual({
      name: 'repertory',
      repertoryId: 'rep-1',
    });
  });

  it('reconhece o modo show com e sem item', () => {
    expect(parseRoute('#show/rep-1')).toEqual({
      name: 'show',
      repertoryId: 'rep-1',
      itemId: null,
    });
    expect(parseRoute('#show/rep-1/item-2')).toEqual({
      name: 'show',
      repertoryId: 'rep-1',
      itemId: 'item-2',
    });
  });

  it('decodifica identificadores escapados', () => {
    expect(parseRoute('#library/song/a%20b')).toEqual({
      name: 'song',
      songId: 'a b',
      origin: 'library',
    });
  });

  it('mantém o valor original quando a decodificação falha', () => {
    expect(parseRoute('#library/song/%E0%A4%A')).toEqual({
      name: 'song',
      songId: '%E0%A4%A',
      origin: 'library',
    });
  });

  it('usa a biblioteca como fallback para trechos incompletos ou desconhecidos', () => {
    expect(parseRoute('#library/song')).toEqual(LIBRARY_ROUTE);
    expect(parseRoute('#library/import/desconhecido')).toEqual({ name: 'import' });
    expect(parseRoute('#show')).toEqual(LIBRARY_ROUTE);
    expect(parseRoute('#desconhecido')).toEqual(LIBRARY_ROUTE);
    expect(parseRoute('#desconhecido/mais/partes')).toEqual(LIBRARY_ROUTE);
  });
});

describe('routeToHash', () => {
  it('serializa todas as rotas', () => {
    expect(routeToHash({ name: 'library' })).toBe('#library');
    expect(routeToHash({ name: 'import' })).toBe('#library/import');
    expect(routeToHash({ name: 'batch-import' })).toBe('#library/import/batch');
    expect(routeToHash({ name: 'song', songId: 's 1', origin: 'library' })).toBe(
      '#library/song/s%201',
    );
    expect(routeToHash({ name: 'song-edit', songId: 's 1', origin: 'favorites' })).toBe(
      '#favorites/song/s%201/edit',
    );
    expect(routeToHash({ name: 'repertories' })).toBe('#repertories');
    expect(routeToHash({ name: 'repertory', repertoryId: 'r 1' })).toBe('#repertories/r%201');
    expect(routeToHash({ name: 'favorites' })).toBe('#favorites');
    expect(routeToHash({ name: 'settings' })).toBe('#settings');
    expect(routeToHash({ name: 'show', repertoryId: 'r 1', itemId: null })).toBe('#show/r%201');
    expect(routeToHash({ name: 'show', repertoryId: 'r 1', itemId: 'i 2' })).toBe(
      '#show/r%201/i%202',
    );
  });

  it('faz ida e volta com parseRoute', () => {
    const routes: AppRoute[] = [
      { name: 'library' },
      { name: 'import' },
      { name: 'batch-import' },
      { name: 'song', songId: 'música 1', origin: 'library' },
      { name: 'song-edit', songId: 'música 1', origin: 'favorites' },
      { name: 'repertories' },
      { name: 'repertory', repertoryId: 'ensaio/1' },
      { name: 'favorites' },
      { name: 'settings' },
      { name: 'show', repertoryId: 'ensaio/1', itemId: null },
      { name: 'show', repertoryId: 'ensaio/1', itemId: 'item/2' },
    ];

    for (const route of routes) {
      expect(parseRoute(routeToHash(route))).toEqual(route);
    }
  });
});

describe('sectionForRoute', () => {
  it('mapeia rotas para a seção de navegação correspondente', () => {
    expect(sectionForRoute({ name: 'library' })).toBe('library');
    expect(sectionForRoute({ name: 'import' })).toBe('library');
    expect(sectionForRoute({ name: 'batch-import' })).toBe('library');
    expect(sectionForRoute({ name: 'song', songId: 'a', origin: 'library' })).toBe('library');
    expect(sectionForRoute({ name: 'song', songId: 'a', origin: 'favorites' })).toBe('favorites');
    expect(sectionForRoute({ name: 'song-edit', songId: 'a', origin: 'favorites' })).toBe(
      'favorites',
    );
    expect(sectionForRoute({ name: 'repertories' })).toBe('repertories');
    expect(sectionForRoute({ name: 'repertory', repertoryId: 'r' })).toBe('repertories');
    expect(sectionForRoute({ name: 'show', repertoryId: 'r', itemId: null })).toBe('repertories');
    expect(sectionForRoute({ name: 'favorites' })).toBe('favorites');
    expect(sectionForRoute({ name: 'settings' })).toBe('settings');
  });
});

describe('sectionRoute', () => {
  it('retorna a rota raiz de cada seção', () => {
    expect(sectionRoute('library')).toEqual(LIBRARY_ROUTE);
    expect(sectionRoute('repertories')).toEqual(REPERTORIES_ROUTE);
    expect(sectionRoute('favorites')).toEqual(FAVORITES_ROUTE);
    expect(sectionRoute('settings')).toEqual(SETTINGS_ROUTE);
  });
});

describe('routeFallback', () => {
  it('preserva rotas de nível superior', () => {
    for (const route of [LIBRARY_ROUTE, REPERTORIES_ROUTE, FAVORITES_ROUTE, SETTINGS_ROUTE]) {
      expect(routeFallback(route)).toEqual(route);
    }
  });

  it('volta para a origem dos fluxos internos', () => {
    expect(routeFallback({ name: 'import' })).toEqual(LIBRARY_ROUTE);
    expect(routeFallback({ name: 'batch-import' })).toEqual(LIBRARY_ROUTE);
    expect(routeFallback({ name: 'song', songId: 'a', origin: 'library' })).toEqual(LIBRARY_ROUTE);
    expect(routeFallback({ name: 'song-edit', songId: 'a', origin: 'favorites' })).toEqual(
      FAVORITES_ROUTE,
    );
    expect(routeFallback({ name: 'repertory', repertoryId: 'r' })).toEqual(REPERTORIES_ROUTE);
    expect(routeFallback({ name: 'show', repertoryId: 'r', itemId: 'i' })).toEqual({
      name: 'repertory',
      repertoryId: 'r',
    });
  });
});

describe('isSameRoute', () => {
  it('compara pela hash serializada', () => {
    expect(isSameRoute(LIBRARY_ROUTE, { name: 'library' })).toBe(true);
    expect(
      isSameRoute(
        { name: 'song', songId: 'a', origin: 'library' },
        { name: 'song', songId: 'a', origin: 'favorites' },
      ),
    ).toBe(false);
    expect(
      isSameRoute(
        { name: 'show', repertoryId: 'r', itemId: null },
        { name: 'show', repertoryId: 'r', itemId: 'i' },
      ),
    ).toBe(false);
  });
});
