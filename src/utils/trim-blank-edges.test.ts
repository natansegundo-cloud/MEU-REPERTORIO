import { describe, expect, it } from 'vitest';

import { trimBlankEdges } from './trim-blank-edges';

describe('trimBlankEdges', () => {
  it('remove vazios apenas das extremidades e preserva o miolo', () => {
    const items = ['', '  ', 'a', '', 'b', '\t', ''];

    expect(trimBlankEdges(items, (item) => !item.trim())).toEqual(['a', '', 'b']);
  });

  it('devolve lista vazia quando todos os itens são vazios', () => {
    expect(trimBlankEdges(['', '  '], (item) => !item.trim())).toEqual([]);
  });

  it('não altera listas sem vazios nas extremidades', () => {
    const items = ['a', '', 'b'];

    expect(trimBlankEdges(items, (item) => !item.trim())).toEqual(items);
  });
});
