# Etapa 31 — Homologação visual final dos diagramas

**Etapa:** 31
**Data:** 13/11/2026
**Checkout:** `v2`
**Status:** concluída em código e validação automatizada; conferência visual registrada.

## 1. Objetivo

Revisar proporção, legibilidade, espaçamento e responsividade dos diagramas
padronizados na Etapa 30, corrigindo apenas problemas visuais comprovados e
preservando toda a lógica musical.

## 2. Diagnóstico visual

A auditoria foi feita no modal real do aplicativo em 320, 343, 390 e 768 px de
largura, nos temas claro e escuro, com os acordes `C`, `F`, `Gm7`, `C7M`, `C#`,
`C#m7`, `E7(9)` e `Am7`.

Medições do renderizador da Etapa 30:

| Item                                   | Antes da Etapa 31 |
| -------------------------------------- | ----------------- |
| Largura máxima do SVG                  | 180 px            |
| Largura útil do braço                  | 109,1 px          |
| Escala do viewBox                      | 1,364             |
| Distância `Casa 6` → braço             | 5,2 px            |
| Distância `Casa 10` → braço            | 1,5 px            |
| Deslocamento do braço em acorde aberto | ~19 px à direita  |

### 2.1. Problemas reais identificados

1. **Rótulos de duas casas encostavam no braço.** `Casa 10` ficava a apenas
   1,5 px da primeira corda, criando leitura ambígua entre o rótulo e a grade.
2. **Acordes abertos ficavam descentralizados.** O espaço reservado para o
   rótulo lateral era mantido mesmo sem rótulo, deslocando o braço cerca de
   19 px à direita dentro do painel.
3. **O braço perdeu área útil na Etapa 30.** A margem esquerda maior reduziu a
   grade de 124 px (desenho original) para 109,1 px, deixando o desenho
   ligeiramente comprimido em telas pequenas.

Não foram encontrados cortes, overflow horizontal, sobreposição de dedos ou
problemas de contraste. A navegação entre variações permaneceu íntegra em todos
os viewports.

## 3. Correções realizadas

Alterações restritas a `ChordDiagramGraphic.tsx` e ao seu CSS:

- largura máxima do SVG ajustada de `11.25rem` para `12.5rem`;
- viewBox fixo de 140 unidades para todos os diagramas, mantendo escala e
  espaçamento constantes;
- acordes sem rótulo usam margem esquerda de 30 unidades e margem direita de 30,
  centralizando o braço;
- acordes com rótulo usam margem esquerda de 40 unidades e direita de 20,
  reservando a calha do texto sem deslocar o braço além do necessário;
- rótulo passou a ser alinhado à direita (`text-anchor="end"`), a 4 unidades da
  primeira corda;
- fonte do rótulo ajustada de 9 px para 8,5 px no viewBox; com a nova escala, o
  tamanho físico final permaneceu praticamente igual (12,1 px contra 12,3 px),
  sem perda de legibilidade;
- nenhuma alteração nas 5 casas visíveis, nos dedos, nas pestanas, nas cordas
  soltas/abafadas ou na lógica musical.

Resultado medido:

| Item                                   | Depois da Etapa 31 |
| -------------------------------------- | ------------------ |
| Largura máxima do SVG                  | 200 px             |
| Largura útil do braço                  | 114,3 px           |
| Escala do viewBox                      | 1,429              |
| Distância `Casa 6` → braço             | 5,7 px             |
| Distância `Casa 10` → braço            | 5,7 px             |
| Distância `Casa 12` → braço            | 5,7 px             |
| Deslocamento do braço em acorde aberto | 0 px               |
| Overflow horizontal em 320 px          | nenhum             |

## 4. Rótulos validados

- `Casa 6` — capturado no modal real.
- `Casa 7` — validado no teste e na captura de rótulos.
- `Casa 10` — capturado no modal real.
- `Casa 12` — validado no teste e na captura de rótulos.

Todos ficam alinhados à direita, com 4 unidades de afastamento da primeira corda
e sem recorte ou sobreposição.

## 5. Responsividade

O modal foi conferido em 320, 343, 390 e 768 px, nos temas claro e escuro:

- braço, dedos e pestanas permanecem legíveis;
- navegação de variações e botão de fechar continuam com alvo de 36 px;
- não há overflow horizontal (`scrollWidth === innerWidth`);
- título, posição, desenho e navegação mantêm a hierarquia;
- acordes abertos, com pestana e posições superiores mantêm a mesma escala.

## 6. Arquivos modificados

| Arquivo                                               | Alteração                                                        |
| ----------------------------------------------------- | ---------------------------------------------------------------- |
| `src/components/music/ChordDiagramGraphic.tsx`        | Calha dinâmica do rótulo, braço centralizado e viewBox fixo.     |
| `src/components/music/ChordDiagramGraphic.module.css` | Largura máxima de 12,5 rem e fonte do rótulo em 8,5 px.          |
| `src/components/music/ChordDiagramGraphic.test.tsx`   | Testes de centralização e afastamento dos rótulos 6, 7, 10 e 12. |
| `docs/ETAPA_31_HOMOLOGACAO_VISUAL_DIAGRAMAS.md`       | Este relatório.                                                  |
| `docs/screenshots/etapa31/`                           | Evidências antes/depois e rótulos.                               |

## 7. Evidências visuais

Comparativos em viewport real:

- `docs/screenshots/etapa31/antes/c-sharp-casa6-320.png`
- `docs/screenshots/etapa31/depois/c-sharp-casa6-320.png`
- `docs/screenshots/etapa31/antes/gm7-casa10-320.png`
- `docs/screenshots/etapa31/depois/gm7-casa10-320.png`
- mesmos pares em 343, 390 e 768 px.

Acordes abertos, pestana e rótulos extremos:

- `docs/screenshots/etapa31/depois/c-aberto-390.png`
- `docs/screenshots/etapa31/depois/f-casa1-390.png`
- `docs/screenshots/etapa31/depois/rotulos-6-7-10-12-mobile-claro.png`
- `docs/screenshots/etapa31/depois/rotulos-6-7-10-12-mobile-320-escuro.png`
- `docs/screenshots/etapa31/depois/rotulos-6-7-10-12-desktop-escuro.png`

O ambiente temporário usado para as capturas foi removido do código.

## 8. Testes executados

| Comando                                                            | Resultado                                |
| ------------------------------------------------------------------ | ---------------------------------------- |
| `npx vitest run src/components/music/ChordDiagramGraphic.test.tsx` | 9 testes, todos passaram                 |
| `npm test`                                                         | 45 arquivos, 232 testes, todos passaram  |
| `npm run typecheck`                                                | passou                                   |
| `npm run lint`                                                     | passou                                   |
| `npm run format:check`                                             | passou                                   |
| `npm run build`                                                    | passou (PWA com 22 entradas de precache) |
| `npx playwright test --workers=1`                                  | 66 testes, todos passaram                |

Cobertura nova:

- braço centralizado quando não há rótulo lateral;
- rótulos `Casa 6`, `Casa 7`, `Casa 10` e `Casa 12` alinhados à direita;
- 4 unidades de afastamento entre o fim do rótulo e a primeira corda;
- manutenção das 5 casas e dos marcadores dentro da janela visível.

## 9. Limitações

- A conferência visual foi feita em Chromium, sem aparelho físico.
- `Casa 12` não aparece na geração padrão (`maxFret = 12` para a maioria dos
  acordes), por isso sua validação visual usou o mesmo componente com
  `maxFret = 15` em ambiente temporário.
- Nenhum commit ou push foi realizado.

## 10. Conclusão

Os diagramas agora mantêm cinco casas visíveis, escala constante e braço
centralizado nos acordes abertos. Os rótulos de posição têm afastamento uniforme
e não são cortados em 320 px. A apresentação está consistente nos temas claro e
escuro, e a lógica musical permaneceu intocada.
