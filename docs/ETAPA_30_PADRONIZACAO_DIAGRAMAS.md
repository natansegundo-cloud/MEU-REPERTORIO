# Etapa 30 — Padronização visual dos diagramas de acordes

**Etapa:** 30
**Data:** 13/11/2026
**Checkout:** `v2`
**Status:** concluída em código e validação automatizada; conferência visual registrada.

## 1. Objetivo

Padronizar os diagramas para exibirem sempre cinco casas visíveis, sem alterar
a lógica musical, a geração de posições, o dedilhado, a transposição, os presets
ou os dados persistidos.

## 2. Diagnóstico do comportamento anterior

O renderizador já desenhava cinco casas, mas a janela exibida era escolhida
apenas por `voicing.baseFret`:

- `baseFret === 1` → casas 1–5, com pestana fixa (nut) no topo.
- `baseFret > 1` → casas `baseFret` a `baseFret + 4`, com o rótulo `Nª` à
  esquerda.

`baseFret` é calculado no motor musical como a menor casa pressionada quando a
posição não usa cordas soltas. Isso é correto para a lógica musical, mas fazia
diagramas que cabiam inteiramente nas cinco primeiras casas — por exemplo `Gm7`
(`3 5 3 3 3 3`) e `C7M` na forma da 2ª casa — serem deslocados para janelas
como 3–7 ou 2–6. Nesses casos o topo do braço não aparecia e a representação
visual não correspondia às casas físicas 1–5.

Posições realmente altas já possuíam a informação necessária em `baseFret` e
`barre`; faltava somente padronizar a decisão da janela e o rótulo lateral.

## 3. Alteração implementada

A mudança ficou restrita ao componente gráfico
`src/components/music/ChordDiagramGraphic.tsx`:

- criada a função visual `visibleBaseFret(voicing)`:
  - se a maior casa pressionada é menor ou igual a 5, a janela começa em 1;
  - caso contrário, começa em `voicing.baseFret`, preservando a menor casa
    necessária do acorde;
- a pestana fixa (nut) só é desenhada quando a janela começa em 1;
- o rótulo lateral passou de `Nª` para `Casa N`, alinhado à margem esquerda;
- a margem esquerda do SVG foi ampliada de 24 para 40 unidades para acomodar
  `Casa 10`, `Casa 12` etc. sem clipping;
- a geometria das cordas, casas, dedos, pestana móvel, cordas soltas e abafadas
  não foi alterada;
- foram adicionados apenas atributos `data-fret-count` e `data-base-fret` para
  testes visuais objetivos.

Nenhuma função de `src/features/transpose/diagrams.ts` foi modificada.

## 4. Comportamento resultante

| Situação                                       | Janela visível            | Pestana fixa | Rótulo lateral |
| ---------------------------------------------- | ------------------------- | ------------ | -------------- |
| Acorde aberto (`C`)                            | 1–5                       | sim          | não            |
| Pestana na 1ª casa (`F`)                       | 1–5                       | sim          | não            |
| Forma que usa até a 5ª casa (`Gm7`, `C7M`)     | 1–5                       | sim          | não            |
| Forma com nota acima da 5ª casa (`C#`)         | `baseFret`–`baseFret + 4` | não          | `Casa N`       |
| Pestana móvel em posição superior (`C#` na 6ª) | 6–10                      | não          | `Casa 6`       |

## 5. Arquivos modificados

| Arquivo                                             | Alteração                                                       |
| --------------------------------------------------- | --------------------------------------------------------------- |
| `src/components/music/ChordDiagramGraphic.tsx`      | Janela visual de cinco casas, nut condicional e rótulo lateral. |
| `src/components/music/ChordDiagramGraphic.test.tsx` | Novos testes do gráfico e da janela visível.                    |
| `docs/ETAPA_30_PADRONIZACAO_DIAGRAMAS.md`           | Este relatório.                                                 |
| `docs/screenshots/etapa30/`                         | Evidências visuais antes/depois.                                |

## 6. Evidências visuais

- `docs/screenshots/etapa30/antes-depois-claro.png`
- `docs/screenshots/etapa30/antes-depois-escuro.png`
- `docs/screenshots/etapa30/antes-depois-mobile-escuro.png`

As imagens comparam, lado a lado, o renderizador anterior e o atual para:

- `C` aberto;
- `F` com pestana na 1ª casa;
- `Gm7` usando a 5ª casa;
- `C7M` na forma da 2ª casa;
- `C#` com posição inicial na 4ª casa;
- `C#` em variação a partir da 6ª casa;
- `C#m7` com pestana deslocada;
- `E7(9)` em variação superior.

O ambiente temporário usado para as capturas foi removido do código ao final.

## 7. Testes executados

| Comando                                                            | Resultado                                |
| ------------------------------------------------------------------ | ---------------------------------------- |
| `npx vitest run src/components/music/ChordDiagramGraphic.test.tsx` | 7 testes, todos passaram                 |
| `npm test`                                                         | 45 arquivos, 230 testes, todos passaram  |
| `npm run typecheck`                                                | passou                                   |
| `npm run lint`                                                     | passou                                   |
| `npm run build`                                                    | passou (PWA com 22 entradas de precache) |
| `npx playwright test e2e/song-reading.spec.ts --project=chromium`  | 1 teste, passou                          |

Cobertura nova em `ChordDiagramGraphic.test.tsx`:

- todas as grades têm exatamente 5 casas e 6 cordas;
- acordes abertos mostram nut, cordas soltas e cordas abafadas;
- `F` mantém pestana móvel na 1ª casa junto da pestana fixa;
- `Gm7` passa a usar as casas 1–5, sem rótulo lateral;
- `C#` deslocado exibe `Casa N`, sem nut, com pestana móvel;
- variação na 6ª casa ou acima mantém todos os marcadores dentro da janela;
- todas as variações verificadas respeitam `baseFret + 4` como limite visual.

## 8. Limitações

- A alteração é exclusivamente de renderização; `baseFret`, rótulos do painel e
  dados musicais continuam com o significado anterior.
- O rótulo lateral usa o texto `Casa N`, exigindo uma margem esquerda um pouco
  maior no SVG. As proporções internas de cordas e casas permanecem uniformes.
- Nenhum commit ou push foi realizado.
