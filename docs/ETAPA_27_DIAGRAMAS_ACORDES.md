# Etapa 27 — Diagramas de acordes

**Etapa:** 27
**Data:** 12/11/2026
**Checkout:** `v2`
**Status:** concluída, aguardando revisão.

## 1. Objetivo

Corrigir a lógica musical dos diagramas de acorde e redesenhar sua apresentação
com a identidade visual da Etapa 26, sem alterar parser, transposição, dados,
sincronização, navegação ou Modo Show.

A etapa exige que todo diagrama represente uma posição realmente executável:

- notas pertencentes ao acorde;
- baixo correto (fundamental ou baixo invertido);
- cordas soltas e abafadas explícitas;
- casas e posição coerentes;
- dedilhado plausível;
- pestanas reais;
- variações distintas e confortáveis;
- mensagem discreta quando não houver posição confiável.

## 2. Auditoria realizada

Foram revisados antes da implementação:

- `AGENTS.md`, `docs/ETAPA_26_IDENTIDADE_VISUAL.md` e
  `docs/DESIGN_SYSTEM_AUDITORIA.md`.
- `src/features/transpose/diagrams.ts` (geração anterior).
- `src/features/transpose/chords.ts`, `notes.ts` e `transpose.ts`.
- `src/components/music/ChordDiagram.tsx`, `ChordDiagramOverlay.tsx` e testes.
- `SongViewPage`, `SongSheet`, `ShowModePage` e o teste E2E
  `e2e/song-reading.spec.ts`.
- `src/styles/tokens.css` e os CSS Modules envolvidos.

### 2.1. Problemas encontrados na lógica anterior

| Problema                                                                                                                         | Consequência                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Presets eram montados diretamente, sem passar pela validação musical.                                                            | Uma forma errada podia ser exibida como correta, inclusive com nota estranha ou baixo invertido.           |
| Presets sempre recebiam `baseFret = 1`.                                                                                          | Formas em casas altas (por exemplo, acordes com pestana) apareciam como se estivessem na primeira posição. |
| A geração tinha três “níveis” de exigência: níveis 1 e 2 relaxavam quinta, extensões e quantidade mínima de cordas.              | Um `E7(9)` podia perder a nona, e um diminuto podia perder a quinta diminuta, ainda assim sendo mostrado.  |
| Resultados relaxados eram marcados como `approximate`, mas a interface não avisava.                                              | O usuário não sabia que o desenho era uma aproximação inventada.                                           |
| A validação só verificava se as notas exigidas estavam presentes; não rejeitava explicitamente notas fora do acorde nos presets. | Formas gravadas por engano podiam sobreviver.                                                              |
| Pestana era detectada apenas por repetição da menor casa, sem exigir trecho contíguo mínimo de três cordas.                      | Dois dedos na mesma casa podiam virar pestana; pestanas de duas cordas eram desenhadas.                    |
| O agrupamento de variações era `posição + tem pestana`.                                                                          | Duas formas na mesma casa podiam aparecer como variações diferentes, confundindo a numeração.              |
| O limite de dedos era aplicado só na geração, não nos presets.                                                                   | Um preset podia exigir mais de quatro dedos.                                                               |
| O SVG tinha geometria fixa e legenda separando todos os dedos.                                                                   | Marcadores se sobrepunham, a pestana não era diferenciada e a legenda repetia informação.                  |
| `baseFret` não distinguia posição aberta de casa 1.                                                                              | O painel rotulava `D7M` (`xx0222`) como “Casa 2”, embora use corda solta.                                  |

### 2.2. Problemas visuais encontrados

- Grade com espaçamento irregular e cordas sem hierarquia.
- Pestana desenhada como vários pontos, sem indicação única.
- Dedos e cordas soltas com marcadores parecidos.
- Lista de dedos por corda repetindo “corda 6, corda 5…”, sem ajudar a tocar.
- Falta de posição clara e de indicação de variação no topo do painel.
- Título do overlay duplicado dentro do painel.

## 3. Arquitetura adotada

A responsabilidade foi separada em três camadas:

| Camada                   | Arquivo                                        | Responsabilidade                                                                                       |
| ------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Geração musical pura     | `src/features/transpose/diagrams.ts`           | Intervalos, validação, busca de posições, dedilhado, pestana, variações e cache. Não depende de React. |
| Renderização visual pura | `src/components/music/ChordDiagramGraphic.tsx` | Recebe um `ChordVoicing` e desenha o SVG. Não decide música.                                           |
| Painel e interação       | `src/components/music/ChordDiagram.tsx`        | Nome, posição, resumo de dedos, navegação de variações, preferência e fallback.                        |

`chordPositionLabel` foi exportado por `src/features/transpose/index.ts` para que
o rótulo seja derivado do desenho real, e não do laço de geração.

## 4. Regras musicais implementadas

### 4.1. Afinação e notas

- Afinação padrão: `E2 A2 D3 G3 B3 E4` (MIDI `40, 45, 50, 55, 59, 64`).
- Cada corda tem sua nota calculada por `pitchClass(aberta + casa)`.
- Toda corda que soa precisa pertencer ao conjunto de intervalos permitidos do
  acorde. Nota estranha invalida a posição.

### 4.2. Intervalos exigidos

- Fundamental sempre presente.
- Terça ou suspensão (o que o acorde declarar).
- Quinta:
  - obrigatória em tríades, power chords, diminutos, meio-diminutos e
    aumentados;
  - opcional em acordes com sétima ou extensão, pois é a omissão mais comum e
    confortável.
- Sétima sempre presente quando o acorde tem sétima.
- Extensões (`9`, `11`, `13`, alterações) sempre presentes.
- Baixo invertido sempre presente como a nota mais grave.

### 4.3. Baixo

- Acorde sem barra: a corda mais grave que soa precisa ser a fundamental.
- Acorde com barra (`A/C#`, por exemplo): a corda mais grave que soa precisa ser
  exatamente o baixo indicado.

### 4.4. Execução

- Nenhuma corda abafada entre a primeira e a última corda que soa.
- Mínimo de cordas soando:
  - 2 para power chords;
  - até 5 conforme a quantidade de intervalos exigidos (nunca menos de 3).
- Extensão máxima de 4 casas entre a menor e a maior casa pressionada.
- Posições com corda solta limitadas à casa 3, evitando misturas artificiais de
  corda solta com casa alta.
- No máximo 4 dedos distintos.
- Cada nota pressionada recebe exatamente um dedo entre 1 e 4.
- Pestana:
  - somente na menor casa pressionada;
  - trecho contíguo de pelo menos 3 cordas;
  - pelo menos 2 cordas efetivamente na casa da pestana;
  - pestana de 3 cordas é evitada em posição aberta quando há corda solta fora
    do trecho.

### 4.5. Presets

As formas de referência continuam existindo para priviligiar digitações comuns,
mas agora passam pelo mesmo avaliador musical. Um preset inválido é descartado,
nunca exibido.

### 4.6. Variações

- Uma forma por `baseFret`, sem duplicatas.
- O preset/forma confortável fica em primeiro lugar.
- As demais são ordenadas por posição crescente e depois por pontuação.
- A primeira posição não é “aproximada”: ou é válida, ou não aparece.
- Quando não há nenhuma posição válida, `getChordVoicings` retorna `[]` e o
  painel mostra o fallback.

### 4.7. Limites e cache

- `maxFret` padrão: 12 (limite técnico: 15).
- `maxPositions` padrão: 6 (limite de cache: 12).
- Cache por símbolo + `maxFret`.

## 5. Geração atual

Fluxo resumido de `getChordVoicings`:

1. `parseChord` interpreta símbolo, qualidade, extensões e baixo.
2. `chordIntervals` monta intervalos obrigatórios e opcionais.
3. `presetEvaluation` valida a forma de referência, se existir.
4. `findVoicings` percorre `baseFret` de 1 a `maxFret` e testa, por corda:
   - corda abafada antes ou depois do trecho que soa;
   - corda solta, se a nota pertence ao acorde;
   - casas de `baseFret` a `baseFret + 4`.
5. `evaluateVoicing` aplica todas as regras musicais e de execução.
6. As formas são pontuadas por quantidade de cordas, cordas abafadas, posição,
   extensão, cordas soltas, dedos e pestana.
7. A primeira forma (preset ou melhor pontuação) é mantida; as demais são
   agrupadas por posição.
8. `completeVoicing` materializa cordas, notas, dedos e pestana.

A geração é determinística e independente da interface.

## 6. Exemplos corrigidos

Acordes de homologação, com notas da corda 6 para a corda 1:

| Acorde  | Casas (6→1)   | Notas (6→1)   | Posição        | Dedilhado                           |
| ------- | ------------- | ------------- | -------------- | ----------------------------------- |
| `Gm7`   | `3 5 3 3 3 3` | G D F Bb D G  | Casa 3         | pestana 1 na 3ª; dedo 2 na 5ª corda |
| `A7M`   | `x 0 2 1 2 0` | A E G# C# E   | Posição aberta | 1 em G#, 2 em D, 3 em B             |
| `E7(9)` | `0 2 0 1 0 2` | E B D G# B F# | Posição aberta | 1 em G#, 2 em A, 3 na 1ª corda      |
| `C#m7`  | `x 4 6 4 5 4` | C# G# B E G#  | Casa 4         | pestana 1 na 4ª; 2 em B; 3 em D     |
| `D7M`   | `x x 0 2 2 2` | D A C# F#     | Posição aberta | 1 em D, 2 em G, 3 em B              |
| `A#º`   | `x 1 2 3 2 x` | A# E A# C#    | Casa 1         | 1 em A, 2 em D, 3 em B, 4 em G      |
| `Bm7`   | `x 2 0 2 0 2` | B D A B F#    | Posição aberta | 1 em A, 2 em G, 3 na 1ª corda       |
| `C#`    | `x 4 6 6 6 4` | C# G# C# F G# | Casa 4         | pestana 1; 2 em D, 3 em G, 4 em B   |

Variações geradas para os mesmos acordes:

| Acorde  | Quantidade | Posições (primeira = forma de referência) |
| ------- | ---------- | ----------------------------------------- |
| `Gm7`   | 6          | Casa 3, aberta, 5, 6, 8, 10               |
| `A7M`   | 6          | aberta, 2, 4, 5, 6, 7                     |
| `E7(9)` | 5          | aberta, 4, 6, 9, 11                       |
| `C#m7`  | 5          | Casa 4, 2, 5, 7, 9                        |
| `D7M`   | 6          | aberta, 2, 3, 4, 5, 7                     |
| `A#º`   | 4          | Casa 1, 2, 5, 8                           |
| `Bm7`   | 6          | aberta, 2, 3, 5, 7, 9                     |
| `C#`    | 4          | Casa 4, 1, 6, 9                           |

`A#º` em Casa 1 é o caso correto de “Casa 1” sem corda solta; `D7M` usa corda
solta e por isso é “Posição aberta”, não “Casa 2”.

## 7. Redesenho visual

### 7.1. `ChordDiagramGraphic`

- SVG proporcional com 6 cordas e 5 casas visíveis.
- Cordas e casas com espessura consistente; pestana implícita no topo quando a
  posição é aberta.
- Corda abafada: `×` discreto acima da corda.
- Corda solta: círculo vazado.
- Nota pressionada: ponto âmbar com número do dedo.
- Pestana: barra âmbar única com o número `1`.
- Casa inicial indicada à esquerda quando a posição não é aberta.
- Todos os marcadores usam os tokens da Etapa 26, com contraste adequado em
  tema claro e escuro.

### 7.2. Painel `ChordDiagram`

- Nome do acorde em destaque.
- Posição logo abaixo (`Casa N`, `Posição aberta` ou `Casa 1`).
- Resumo discreto: “3 dedos”, “Pestana · 4 dedos” ou “Cordas soltas”.
- Navegação compacta de variações com “Variação N de M”.
- Botão de fechar preservado.
- Fallback explícito e discreto: “Não há uma posição confiável para este
  acorde.”
- Sem lista de dedos por corda e sem legenda redundante.

### 7.3. Overlay

- Continua abrindo como painel inferior no mobile e lateral no desktop.
- Título visual duplicado removido; o nome acessível do diálogo
  (`Diagrama de acorde C`) foi preservado como texto apenas para leitores de
  tela.
- Painel interno transparente, sem caixa dentro de caixa.

## 8. Arquivos modificados

| Arquivo                                               | Mudança                                                                                             |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `src/features/transpose/diagrams.ts`                  | Reescrita da geração, validação, dedilhado, pestana, presets, variações, cache e rótulo de posição. |
| `src/features/transpose/diagrams.test.ts`             | Testes musicais e estruturais objetivos.                                                            |
| `src/features/transpose/index.ts`                     | Exporta `chordPositionLabel`.                                                                       |
| `src/components/music/ChordDiagramGraphic.tsx`        | Novo renderizador SVG puro.                                                                         |
| `src/components/music/ChordDiagramGraphic.module.css` | Estilos da grade, marcadores e pestana.                                                             |
| `src/components/music/ChordDiagram.tsx`               | Painel redesenhado, navegação e fallback.                                                           |
| `src/components/music/ChordDiagram.module.css`        | Novo layout do painel.                                                                              |
| `src/components/music/ChordDiagramOverlay.module.css` | Título acessível oculto e painel interno transparente.                                              |
| `src/components/music/ChordDiagram.test.tsx`          | Cobertura de posição, pestana, dedos, navegação e fallback.                                         |
| `docs/ETAPA_27_DIAGRAMAS_ACORDES.md`                  | Este relatório.                                                                                     |
| `docs/screenshots/etapa27/`                           | Capturas antes/depois.                                                                              |

`src/main.tsx` foi usado temporariamente apenas para a página de homologação e
foi restaurado ao conteúdo original; não há diferença final nesse arquivo.

## 9. Testes

`src/features/transpose/diagrams.test.ts` cobre:

1. **Validade musical dos oito acordes de referência** — todas as posições
   geradas têm apenas notas permitidas, todos os intervalos exigidos, baixo
   correto e nenhuma corda abafada no meio.
2. **Formas de referência** — `Gm7`, `A7M`, `E7(9)`, `C#m7`, `D7M`, `A#º`,
   `Bm7`, `C#`, além de `C`, `F`, `Bm` e `G`.
3. **Cordas soltas, abafadas e afinação** — estados, casas, dedos e classes de
   altura conferidos contra a afinação padrão.
4. **Dedilhado e pestanas** — quantidade de dedos, numeração contínua, pestana
   na menor casa, trecho mínimo e dedo 1 nas cordas da pestana.
5. **Variações** — sem duplicatas, uma por posição, ordenadas após a primeira.
6. **Limites e fallback** — `maxFret`, acorde inválido e ausência de posição.
7. **Inversões** — baixo preservado em `A/C#`.
8. **Cobertura de qualidades** — maiores, menores, sétimas, sétimas maiores,
   menores com sétima, diminutos, power chord e `E7(9)`.
9. **Rótulo de posição** — aberta, casa 1, casa 4 e casa 3.

`src/components/music/ChordDiagram.test.tsx` cobre nome, posição, resumo de
dedos, navegação entre variações e fallback.

## 10. Capturas

- **Antes:** `docs/screenshots/etapa27/antes/diagramas-claro.png` e
  `diagramas-escuro.png`, com o renderizador anterior.
- **Depois:**
  - `docs/screenshots/etapa27/depois/diagramas-claro.png`
  - `docs/screenshots/etapa27/depois/diagramas-escuro.png`
  - `docs/screenshots/etapa27/depois/diagramas-mobile-escuro.png`
  - `docs/screenshots/etapa27/depois/overlay-claro.png`
  - `docs/screenshots/etapa27/depois/overlay-escuro.png`

As capturas “depois” incluem os oito acordes de homologação, uma seção com
variações por posição e o overlay real. O ambiente temporário usado para as
capturas foi removido do código ao final.

## 11. Validações executadas

| Comando                | Resultado                                   |
| ---------------------- | ------------------------------------------- |
| `npm run format:check` | passou                                      |
| `npm run typecheck`    | passou                                      |
| `npm run lint`         | passou                                      |
| `npm test`             | 38 arquivos, 206 testes, todos passaram     |
| `npm run test:e2e`     | 66 testes, todos passaram                   |
| `npm run build`        | passou (PWA com 22 entradas de precache)    |
| `git diff --check`     | sem erros (apenas avisos de LF/CRLF do Git) |

## 12. Escopo preservado

- Nenhuma alteração no parser de cifras, na transposição, no Supabase, na
  sincronização, na navegação ou no Modo Show.
- Nenhuma alteração na estrutura persistida das músicas.
- Nenhuma dependência adicionada.
- Nenhum commit ou push.
- Nenhuma funcionalidade musical além dos diagramas.
- Etapa 28 não iniciada.

## 13. Limitações restantes

- O dedilhado é heurístico: ordena por casa e corda e reserva o dedo 1 para a
  pestana. Em posições altas, pode escolher dedos 2 e 3 lado a lado onde um
  mini-pestana seria mais natural.
- Pestanas de três cordas só são reconhecidas quando estão na menor casa da
  posição; formas com pestana parcial em casa mais alta são desenhadas com
  dedos separados.
- A busca é exaustiva dentro de janelas de quatro casas até a casa 12. Formas
  com saltos maiores, cinco dedos ou posições acima da 12ª não são geradas por
  padrão.
- A quinta pode ser omitida em acordes com sétima/extensão por decisão musical;
  o campo `omittedIntervals` registra a omissão, mas o painel não a exibe.
- A validação é teórica e estrutural; não há áudio nem verificação em
  instrumento físico.
- A conferência visual foi feita em Chromium desktop e mobile simulados, em
  temas claro e escuro, sem aparelho físico nesta etapa.
- A primeira posição é a forma de referência quando existe; por isso a ordem das
  variações pode começar em uma casa mais alta (`C#m7` em Casa 4, depois Casa 2).
  As demais seguem ordem crescente.
