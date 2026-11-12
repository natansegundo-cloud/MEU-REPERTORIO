# Etapa 26 — Nova identidade visual

**Etapa:** 26
**Data:** 11/11/2026
**Checkout:** `v2`
**Status:** concluída, aguardando revisão.

## 1. Objetivo

Substituir a aparência anterior por uma identidade minimalista, musical e
sofisticada — grafite profundo, texto em branco quente e âmbar discreto —
preservando integralmente as funcionalidades e a simplificação da Etapa 25.

## 2. Auditoria realizada

Foram revisados, antes da implementação:

- `AGENTS.md`, `docs/DESIGN_SYSTEM_AUDITORIA.md` e
  `docs/ETAPA_25_SIMPLIFICACAO.md`.
- `src/styles/tokens.css` e `src/styles/global.css`.
- Todos os CSS Modules de componentes, telas e estados.
- Cores literais (`rgb`, `rgba`, `hsl`, hexadecimal) fora dos tokens.
- Tema claro/escuro (definido pela preferência do sistema), telas de Biblioteca,
  Favoritos, música, editor de música, Repertórios, editor de repertório,
  Ajustes, importação individual e em lote, Modo Show, navegação, menus,
  modais, diagramas de acorde, botões, inputs, badges e estados
  vazio/erro/carregamento.

O diagnóstico confirmou que a base de tokens já era o caminho correto, mas a
paleta anterior (verde/violeta), os raios muito arredondados, as sombras
repetidas e alguns literais de cor impediam uma identidade única. A Etapa 25
havia removido cards, bordas e espaçamento em excesso; essa organização foi
mantida.

## 3. Direção visual

- **Grafite profundo** como base, com superfícies ligeiramente mais claras para
  separar conteúdo sem criar cartões.
- **Off-white quente** para leitura confortável, com níveis explícitos de texto
  secundário e sutil.
- **Âmbar** como assinatura, não como cor dominante: ações primárias, seleção
  ativa, favoritos, acordes, indicadores de reprodução, foco e FAB.
- Estados semânticos (sucesso, aviso, erro) independentes do âmbar.
- Raios menores, sombras mais discretas e tipografia com pesos menos extremos.
- Modo Show com paleta de palco fixa, sempre escura, independente do tema.

## 4. Paleta e tokens

Fonte única: `src/styles/tokens.css`.

### Tema claro

| Papel                 | Token                                      | Valor                 |
| --------------------- | ------------------------------------------ | --------------------- |
| Fundo                 | `--color-bg`                               | `#f5f2ea`             |
| Superfície            | `--color-surface`                          | `#fbf9f4`             |
| Superfície elevada    | `--color-surface-raised`                   | `#ffffff`             |
| Superfície suave      | `--color-surface-muted`                    | `#eeeadf`             |
| Superfície interativa | `--color-surface-interactive`              | `#f1ebdd`             |
| Texto                 | `--color-text`                             | `#202320`             |
| Texto secundário      | `--color-text-muted`                       | `#5f635d`             |
| Texto sutil           | `--color-text-subtle`                      | `#6c7069`             |
| Borda                 | `--color-border`                           | `#e4ded1`             |
| Borda forte           | `--color-border-strong`                    | `#cdc4b2`             |
| Âmbar (base)          | `--color-accent`                           | `#9a6414`             |
| Âmbar hover           | `--color-accent-hover`                     | `#845411`             |
| Âmbar ativo           | `--color-accent-active`                    | `#6f460d`             |
| Âmbar para texto      | `--color-accent-text`                      | `#855711`             |
| Âmbar suave           | `--color-accent-soft`                      | `#f4e8d2`             |
| Contraste do âmbar    | `--color-accent-contrast`                  | `#fffaf0`             |
| Foco                  | `--color-focus`                            | `#a06a15`             |
| Sucesso               | `--color-success` / `--color-success-soft` | `#2f6f52` / `#e2f0e7` |
| Aviso                 | `--color-warning` / `--color-warning-soft` | `#7d5410` / `#f6ecd7` |
| Erro                  | `--color-danger` / `--color-danger-soft`   | `#a83f36` / `#f7e3df` |
| Overlay               | `--color-overlay`                          | `rgb(24 21 15 / 38%)` |

### Tema escuro

| Papel                 | Token                                      | Valor                 |
| --------------------- | ------------------------------------------ | --------------------- |
| Fundo                 | `--color-bg`                               | `#0d0e10`             |
| Superfície            | `--color-surface`                          | `#141518`             |
| Superfície elevada    | `--color-surface-raised`                   | `#191b1f`             |
| Superfície suave      | `--color-surface-muted`                    | `#1f2126`             |
| Superfície interativa | `--color-surface-interactive`              | `#24262c`             |
| Texto                 | `--color-text`                             | `#f3eee4`             |
| Texto secundário      | `--color-text-muted`                       | `#a9a6a0`             |
| Texto sutil           | `--color-text-subtle`                      | `#7f827f`             |
| Borda                 | `--color-border`                           | `#282b31`             |
| Borda forte           | `--color-border-strong`                    | `#3a3e45`             |
| Âmbar (base)          | `--color-accent`                           | `#d7a24a`             |
| Âmbar hover           | `--color-accent-hover`                     | `#e3b25f`             |
| Âmbar ativo           | `--color-accent-active`                    | `#c08c34`             |
| Âmbar para texto      | `--color-accent-text`                      | `#e5b666`             |
| Âmbar suave           | `--color-accent-soft`                      | `#2a2318`             |
| Contraste do âmbar    | `--color-accent-contrast`                  | `#17140f`             |
| Foco                  | `--color-focus`                            | `#e0ac52`             |
| Sucesso               | `--color-success` / `--color-success-soft` | `#7cc9a3` / `#16291f` |
| Aviso                 | `--color-warning` / `--color-warning-soft` | `#e3b880` / `#2d2418` |
| Erro                  | `--color-danger` / `--color-danger-soft`   | `#f0938a` / `#321a18` |
| Overlay               | `--color-overlay`                          | `rgb(0 0 0 / 62%)`    |

### Modo Show (palco fixo)

| Papel                  | Token                                          | Valor                             |
| ---------------------- | ---------------------------------------------- | --------------------------------- |
| Fundo do palco         | `--color-stage-bg`                             | `#0b0c0e`                         |
| Superfície             | `--color-stage-surface`                        | `#141518`                         |
| Borda                  | `--color-stage-border`                         | `#2a2e34`                         |
| Texto                  | `--color-stage-text`                           | `#f3eee4`                         |
| Texto secundário       | `--color-stage-muted`                          | `#a9a6a0`                         |
| Texto sutil            | `--color-stage-subtle`                         | `#7f827f`                         |
| Âmbar do palco         | `--color-stage-accent`                         | `#d7a24a`                         |
| Âmbar suave            | `--color-stage-accent-soft`                    | `#2a2318`                         |
| Contraste do âmbar     | `--color-stage-accent-contrast`                | `#17140f`                         |
| Acorde                 | `--color-stage-chord`                          | `#dcae5e`                         |
| Sucesso / aviso / erro | `--color-stage-success` / `warning` / `danger` | `#7cc9a3` / `#e3b880` / `#f0938a` |
| Overlay                | `--color-stage-overlay`                        | `rgb(0 0 0 / 66%)`                |

### Outros tokens ajustados

- Tipografia: escala existente mantida; pesos suavizados para `520 / 600 / 700`.
- Espaçamento: escala existente mantida (sem reintroduzir espaçamento da Etapa 25).
- Raios: `0.3125rem` a `1rem`, reduzindo o aspecto de cartão.
- Controles: `--control-height-sm`, `--control-height-md`, `--control-height-lg`.
- Sombras: `--shadow-sm`, `--shadow-md`, `--shadow-menu`, `--shadow-fab`.
- Foco: `--focus-ring` com `color-mix` sobre `--color-focus`.
- Overlay: `--color-overlay` unifica menus, modais e diagramas.

## 5. Uso do âmbar

Usado apenas em elementos com intenção:

- Ação primária (`Button` primário, `Salvar`, `Tocar`, `Criar repertório`).
- FAB de adicionar conteúdo.
- Ícone e barra fina do item ativo na navegação lateral/mobile.
- Favoritos ativos e filtro de favoritas.
- Acordes, diagramas e valor de tom.
- Controle de rolagem ativo no Modo Show.
- Anel de foco.

Não foi usado em textos secundários, ícones genéricos, bordas de cards,
gradientes ou grandes áreas douradas.

## 6. Componentes refinados

- `Button`: estados primário/hover/ativo com tokens de âmbar.
- `Badge`: tom `accent` usando `--color-accent-text` sobre `--color-accent-soft`.
- `Sidebar`, `BottomNav`, `MobileNavMenu`: item ativo neutro com ícone âmbar e
  barra lateral discreta; overlay e sombra de menu tokenizados.
- `PageHeader`: eyebrow neutro, sem âmbar.
- `Brand`: marca sem sombra, com novo ícone grafite/âmbar.
- `EmptyState`: superfície única, ícone neutro/âmbar suave, sem sombra.
- `ErrorBoundary`, `SettingsCard`, `InstallHelp`: ícones e links neutros.
- `LibraryActionMenu`: FAB com `--shadow-fab`, estados de hover/ativo.
- `ChordDiagram` e `ChordDiagramOverlay`: adaptação visual apenas; overlay com
  `--color-overlay`, sombra de menu, acordes em âmbar. Nenhuma regra musical foi
  alterada.
- `SongSheet`: superfície única, cifras em âmbar, variante `stage` para o Modo
  Show.

## 7. Telas atualizadas

- **Biblioteca**: cabeçalho enxuto, busca, filtro de favoritas, lista sem cards,
  estados de aviso e vazio.
- **Favoritos**: mesma lista e estados, com contagem e vazio coerentes.
- **Música**: cabeçalho, ações, painel de tom, opções de leitura, cifra e
  diagramas.
- **Editor de música**: painéis, campos, botões e foco.
- **Repertórios**: criação, busca, lista, ações e estados.
- **Editor de repertório**: cabeçalho, adição de músicas, ordem, tom próprio e
  ações.
- **Ajustes**: cartões de dados, backup, instalação, nuvem e botões.
- **Importação individual**: formulário, campos, foco e mensagens.
- **Importação em lote**: página reescrita em tokens, superfície única, lista de
  revisão e seletor de arquivo estilizado.
- **Modo Show**: fundo uniforme, texto off-white, acordes âmbar, controles fixos
  compactos, estado de rolagem ativa claramente sólido, overlay de lista.
- **Navegação, menus e modais**: item ativo, overlay, sombra e foco.
- **Ícone e PWA**: `public/brand/icon.svg` e PNGs 192/512/maskable regerados na
  nova paleta; `index.html` e manifest com `theme_color` grafite.

## 8. Cores literais eliminadas

Antes da etapa existiam cores literais em componentes e telas (sombras de FAB,
overlays de menu, fundos de diagramas, entre outros). Após a revisão:

- Nenhum `rgb()`, `rgba()`, `hsl()` ou hexadecimal fora de `tokens.css`.
- Nenhum uso do antigo token `--color-accent-strong`.
- Nenhuma cor literal em TS/TSX.
- Somente `tokens.css` e o SVG da marca contêm valores de cor.

## 9. Contraste e legibilidade

Razões calculadas (WCAG):

| Combinação                           | Razão   |
| ------------------------------------ | ------- |
| Texto claro / fundo claro            | 14,19:1 |
| Texto claro / superfície clara       | 15,09:1 |
| Texto secundário claro / fundo       | 5,47:1  |
| Texto sutil claro / fundo            | 4,51:1  |
| Texto sutil claro / superfície       | 4,80:1  |
| `accent-text` claro / `accent-soft`  | 5,14:1  |
| `accent-contrast` claro / âmbar      | 4,80:1  |
| Texto escuro / fundo escuro          | 16,70:1 |
| Texto secundário escuro / fundo      | 7,95:1  |
| Texto sutil escuro / fundo           | 4,97:1  |
| `accent-text` escuro / `accent-soft` | 8,29:1  |
| `accent-contrast` escuro / âmbar     | 8,01:1  |
| Texto do palco / fundo do palco      | 16,92:1 |
| Texto secundário do palco / fundo    | 8,06:1  |
| Texto sutil do palco / fundo         | 5,03:1  |
| Acorde do palco / fundo              | 9,56:1  |
| Foco claro / fundo                   | 4,11:1  |

Textos atendem AA. O anel de foco atende ao mínimo de 3:1 para componentes de
interface. Bordas são separadores discretos; campos também se distinguem pela
superfície e pelo placeholder.

## 10. Capturas

- **Antes:** `docs/screenshots/etapa26/antes/` — capturas finais da Etapa 25
  (tema claro), copiadas sem alteração; ver `README.md` da pasta.
- **Depois:** `docs/screenshots/etapa26/depois/` — 46 imagens em claro/escuro,
  desktop (1440×900) e mobile (390×844), incluindo:
  - Biblioteca, Favoritos, música, Repertórios, editor de repertório e Ajustes.
  - Importação individual, importação em lote, menu de ações e menu mobile.
  - Modo Show, controles abertos e rolagem ativa.
  - Estado vazio de Favoritos.

## 11. Validações executadas

| Comando                           | Resultado                                   |
| --------------------------------- | ------------------------------------------- |
| `npm run format:check`            | passou                                      |
| `npm run typecheck`               | passou                                      |
| `npm run lint`                    | passou                                      |
| `npm test`                        | 38 arquivos, 201 testes, todos passaram     |
| `npm run test:e2e -- --workers=1` | 66 testes, todos passaram                   |
| `npm run build`                   | passou (PWA com 22 entradas de precache)    |
| `git diff --check`                | sem erros (apenas avisos de LF/CRLF do Git) |

A suíte E2E foi executada com um worker para evitar a flutuação conhecida de
Service Worker sob carga paralela.

## 12. Escopo preservado

- Nenhuma alteração em parser, motor musical, transposição, dados, Dexie,
  Supabase, autenticação, sincronização, navegação, algoritmos de rolagem ou
  mecanismos de importação.
- Nenhuma dependência adicionada.
- Nenhum commit ou push.
- Etapa 27 não iniciada.
- A organização e a simplificação da Etapa 25 foram mantidas.

## 13. Pendências visuais e limitações

- Linhas muito longas de cifra continuam sofrendo corte horizontal no mobile;
  é comportamento anterior à Etapa 26 e não foi alterado.
- O tema segue a preferência do sistema, sem seletor dentro do aplicativo
  (comportamento existente).
- Os PNGs de instalação foram regerados a partir do SVG com o Chromium do
  Playwright, sem dependência nova. Instalações antigas podem manter o ícone em
  cache até reinstalar o PWA.
- A validação visual foi feita em Chromium desktop/mobile simulados; não houve
  teste em aparelho físico nesta etapa.
- A lógica musical dos diagramas (dedilhado, pestanas, posições e variações)
  permanece intocada; eventuais correções pertencem à Etapa 27.
