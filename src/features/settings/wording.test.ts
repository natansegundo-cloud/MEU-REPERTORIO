import { describe, expect, it } from 'vitest';

const uiSources = {
  ...import.meta.glob('../../components/**/*.tsx', {
    eager: true,
    import: 'default',
    query: '?raw',
  }),
  ...import.meta.glob('./{CloudPage,SettingsPage}.tsx', {
    eager: true,
    import: 'default',
    query: '?raw',
  }),
} as Record<string, string>;
const forbiddenWords = [
  /\bSincronizacao\b/u,
  /\bsincronizacao\b/u,
  /\bIndisponivel\b/u,
  /\bindisponivel\b/u,
  /\bdisponivel\b/u,
  /\bnao\b/u,
  /\bNao\b/u,
  /\balteracao\b/u,
  /\bUltima\b/u,
  /\bultima\b/u,
  /\bvariaveis\b/u,
];

describe('textos da interface', () => {
  it('mantém acentos nos textos de estado e sincronização', () => {
    const violations = Object.entries(uiSources).flatMap(([path, source]) =>
      forbiddenWords
        .filter((pattern) => pattern.test(source))
        .map((pattern) => `${path}: ${pattern.source}`),
    );

    expect(violations).toEqual([]);
  });
});
