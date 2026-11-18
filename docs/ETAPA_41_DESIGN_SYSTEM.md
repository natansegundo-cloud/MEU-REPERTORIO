# Etapa 41 — Fundação do Design System Apple / iOS e Seletor de Aparência

**Projeto:** Meu Repertório  
**Checkout:** `v2`  
**Data:** 17/11/2026  
**Escopo:** Fundação tipográfica, paleta Claro/Escuro em camadas, seletor e persistência de aparência sem flash, sincronização dinâmica de `meta[name="theme-color"]`, variantes semânticas destrutivas (`danger` / `danger-soft`) e ergonomia base de controles e campos (`>= 16px` no mobile).

---

## 1. Diagnóstico inicial

A inspeção conjunta de `docs/ETAPA_40_AUDITORIA_VISUAL.md`, `DESIGN.md` e do código-fonte real revelou seis pontos estruturais na fundação visual anterior:

1. **Tipografia display na interface inteira:** `src/styles/fonts.css` e `src/styles/tokens.css` aplicavam `'Bricolage Grotesque'` (peso médio não-padrão `520` e tracking apertado `-0.04em` / `-0.035em`) em todos os textos de interface, adicionando `41.34 kB` ao precache do PWA e afastando a leitura da clareza nativa do ecossistema Apple (`SF Pro`).
2. **Paleta clara envelhecida e paleta escura com pouca separação de camadas:**
   - No tema claro, `--color-bg: #f5f2ea` somado a `--color-accent: #9a6414` produzia aparência sépia/ocre, enquanto `--color-text-muted` (`#5f635d`) e `--color-text-subtle` (`#6c7069`) tinham luminância quase idêntica.
   - No tema escuro, `--color-surface` (`#141518`) e `--color-surface-raised` (`#191b1f`) diferiam em apenas ~5 unidades RGB, dificultando perceber profundidade sem bordas explícitas.
   - `src/styles/tokens.css` duplicava integralmente o bloco de 29 tokens escuros em dois seletores distintos (`@media (prefers-color-scheme: dark)` e `:root[data-theme='dark']`).
3. **Ausência de controle e inicialização de tema:** Apesar de `tokens.css` prever `data-theme`, não existia serviço de aparência, inicialização síncrona anti-flash nem seletor para o usuário escolher entre `Sistema`, `Claro` e `Escuro`.
4. **`meta[name="theme-color"]` estática:** `index.html` declarava duas tags fixas atreladas a `prefers-color-scheme`, incapazes de acompanhar uma escolha manual de tema ou a transição para a superfície escura fixa do Modo Show (`#show/...`) quando o sistema estava em modo claro.
5. **Falta de variantes semânticas de erro/destruição:** `Button` não possuía variantes `danger` / `danger-soft` e `Badge` não possuía `tone="danger"`, forçando `CloudPage.tsx` a exibir erros de sincronização (`status === 'error'`) com `tone="warning"`.
6. **Campos `< 16px` provocando zoom automático no Safari iOS e CSS duplicado:** Como `global.css` declarava `font: inherit` em `input, textarea, select`, rótulos `<label>` com `font-size: var(--text-sm)` (`14px`) faziam os campos internos herdarem `14px` em quase todos os formulários e diálogos (além de regras explícitas de `14px` em `AddSongsDialog`, `RepertoryOrderPanel`, `ImportSongPage` e `BatchImportPage`, e redefinições redundantes de borda/fundo/foco em múltiplos CSS Modules).

---

## 2. Arquivos modificados e criados

### Criados

- `src/services/appearance.ts` — Serviço central de aparência (`Sistema | Claro | Escuro`), hidratação via `db.preferences`, cache síncrono anti-flash e sincronização de `data-theme`, `color-scheme` e `meta[name="theme-color"]`.
- `src/services/appearance.test.ts` — Testes unitários do serviço de aparência, `prefers-color-scheme`, persistência e transição de superfície do Modo Show.
- `src/hooks/useAppearance.ts` — Hook React baseado em `useSyncExternalStore` conectado ao serviço de aparência.
- `src/features/settings/AppearancePanel.tsx` e `src/features/settings/AppearancePanel.module.css` — Controle segmentado estilo iOS (`Sistema`, `Claro`, `Escuro`) na tela de Ajustes.
- `src/components/ui/Badge.test.tsx` — Testes unitários cobrindo todos os tons de `Badge`, incluindo `danger`.
- `e2e/appearance.spec.ts` — Testes E2E validando alternância de tema, persistência sem flash após recarga, sincronização de `theme-color` (inclusive no Modo Show) e fonte mínima de `16px` nos inputs mobile.
- `docs/screenshots/etapa41/antes/*` e `docs/screenshots/etapa41/depois/*` — Capturas comparativas em `343px`, `390px`, `768px`, `1024px` e `1280px` nos temas Claro e Escuro.

### Modificados

- `index.html` — Script inline síncrono anti-FOUC e `meta[name="theme-color"]` unificada.
- `vite.config.ts` — Alinhamento de `background_color` e `theme_color` do Web App Manifest para `#0b0c0e`.
- `src/main.tsx` e `src/app/App.tsx` — Inicialização da aparência e sincronização da superfície ativa (`app` vs `stage` no Modo Show).
- `src/services/index.ts` — Reexportação pública de `appearance.ts`.
- `src/styles/fonts.css` e remoção de `src/assets/fonts/bricolage.woff2` — Remoção da fonte display da interface geral, mantendo apenas `JetBrains Mono`.
- `src/styles/tokens.css` — Nova pilha tipográfica nativa, novos tokens dos temas Claro e Escuro, tokens destrutivos sólidos e eliminação da duplicação do bloco escuro.
- `src/styles/global.css` — Base ergonômica unificada para `input`, `textarea` e `select` (`16px`, estados `:read-only`, `:disabled`, `:hover` protegido por `@media (hover: hover)`, `:focus` e trava anti-zoom mobile).
- `src/components/ui/Button.tsx`, `src/components/ui/Button.module.css` e `src/components/ui/Button.test.tsx` — Adição das variantes `danger` e `danger-soft`, feedback `:active` refinado e proteção `@media (hover: hover)`.
- `src/components/ui/Badge.tsx` e `src/components/ui/Badge.module.css` — Adição de `tone="danger"`.
- `src/features/settings/SettingsPage.tsx`, `src/features/settings/SettingsPage.test.tsx` e `src/features/settings/wording.test.ts` — Inclusão da seção `Aparência`.
- `src/features/settings/CloudPage.tsx` e `src/features/settings/CloudPage.test.tsx` — Uso semântico de `tone="danger"` quando `status === 'error'`.
- `src/features/settings/BackupPanel.tsx` e `src/features/settings/BackupPanel.module.css` — Reidratação da preferência de aparência após restaurar backup e alinhamento simétrico do botão `"Selecionar backup"` com `"Exportar biblioteca"`.
- Limpeza de sobrescritas duplicadas de inputs, classes mortas e tracking excessivo (`-0.04em` → `var(--tracking-tight)`) em: `App.module.css`, `PageHeader.module.css`, `EmptyState.module.css`, `LibraryPage.module.css`, `RepertoriesPage.module.css`, `RepertoryEditorPage.module.css`, `RepertoryOrderPanel.module.css`, `AddSongsDialog.module.css`, `SongViewPage.module.css`, `SongEditorPage.module.css`, `ImportSongPage.module.css`, `BatchImportPage.module.css` e `ShowModePage.module.css`.

---

## 3. Tokens alterados e justificativas

### Tema Claro (`:root`)

| Token                                           | Antes                                         | Depois                                        | Justificativa e Contraste WCAG                                                                                                                                        |
| :---------------------------------------------- | :-------------------------------------------- | :-------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--color-bg`                                    | `#f5f2ea`                                     | `#f5f5f7`                                     | Alabastro neutro inspirado no iOS grouped background; elimina o aspecto amarelado/sépia.                                                                              |
| `--color-surface` / `raised`                    | `#fbf9f4` / `#ffffff`                         | `#ffffff` / `#ffffff`                         | Superfícies brancas limpas destacadas sobre `#f5f5f7` com divisores _hairline_ discretos.                                                                             |
| `--color-surface-muted` / `interactive`         | `#eeeadf` / `#f1ebdd`                         | `#ececef` / `#e4e4e9`                         | Preenchimentos neutros limpos para estados secundários, trilho segmentado e seleção ativa.                                                                            |
| `--color-text` / `muted` / `subtle`             | `#202320` / `#5f635d` / `#6c7069`             | `#1d1d1f` / `#515158` / `#6d6d76`             | Contraste de `16.1:1`, `7.18:1` e `4.74:1` sobre `#f5f5f7` (todos acima de WCAG AA `4.5:1`), criando separação real entre texto secundário e sutil.                   |
| `--color-border` / `border-strong`              | `#e4ded1` / `#cdc4b2`                         | `#e2e2e8` / `#c7c7cf`                         | Separadores neutros discretos estilo _hairline_ e contornos precisos para inputs/botões secundários.                                                                  |
| `--color-accent` / `text` / `soft` / `contrast` | `#9a6414` / `#855711` / `#f4e8d2` / `#fffaf0` | `#b45309` / `#a14a07` / `#fef3e2` / `#ffffff` | Âmbar musical vibrante sem tom marrom fechado; garante contraste AA `5.02:1` com branco puro `#ffffff` nos botões primários e `5.62:1` nas cifras sobre fundo branco. |
| `--color-danger` / `soft` / `solid`             | `#a83f36` / `#f7e3df` / _(inexistente)_       | `#c92a2a` / `#feecec` / `#c92a2a`             | Vermelho semântico nítido com `5.46:1` sobre `#ffffff` e `4.79:1` sobre `#feecec`.                                                                                    |

### Tema Escuro (`:root[data-theme='dark']`)

| Token                               | Antes                                   | Depois                            | Justificativa e Contraste WCAG                                                                                                                         |
| :---------------------------------- | :-------------------------------------- | :-------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--color-bg`                        | `#0d0e10`                               | `#0b0c0e`                         | Grafite profundo alinhado à base de palco, ideal para baixa luminosidade.                                                                              |
| `--color-surface`                   | `#141518`                               | `#15171b`                         | Primeiro nível de agrupamento claramente separado de `#0b0c0e`.                                                                                        |
| `--color-surface-muted`             | `#1f2126`                               | `#1c1e24`                         | Segundo nível para caixas internas sutis, campos `readOnly` e trilho do controle segmentado.                                                           |
| `--color-surface-raised`            | `#191b1f`                               | `#242730`                         | Terceiro nível claramente mais luminoso para modais, diálogos, inputs e pílula ativa do seletor de tema.                                               |
| `--color-surface-interactive`       | `#24262c`                               | `#2c303a`                         | Camada superior para estados interativos e seleção.                                                                                                    |
| `--color-text` / `muted` / `subtle` | `#f3eee4` / `#a9a6a0` / `#7f827f`       | `#f2f2f5` / `#a1a3ad` / `#7c7f8a` | Leitura limpa sem dominante amarela (`17.3:1`, `7.85:1` e `4.92:1` sobre `#0b0c0e`).                                                                   |
| `--color-danger` / `soft` / `solid` | `#f0938a` / `#321a18` / _(inexistente)_ | `#f47a7a` / `#2f181a` / `#dc2626` | Separa o vermelho claro de texto/badge (`5.54:1` sobre `#2f181a`) do vermelho sólido de botão destrutivo (`#dc2626` com `4.83:1` com texto `#ffffff`). |

Além disso, os dois blocos idênticos do tema escuro em `tokens.css` foram consolidados em **um único bloco `:root[data-theme='dark']`**.

---

## 4. Implementação da tipografia

- `--font-sans` passou a utilizar `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', system-ui, 'Segoe UI', Roboto, sans-serif`, aproveitando nativamente a família `SF Pro` no iOS, iPadOS e macOS sem download de fontes externas.
- `Bricolage Grotesque` e seu arquivo `bricolage.woff2` foram removidos, reduzindo o precache do Service Worker em ~`32.25 KiB`.
- `JetBrains Mono` (`--font-mono`) foi preservada exclusivamente onde o alinhamento monoespaçado é essencial (`SongSheet`, diagramas/acordes, contadores tabulares e textarea de cifras).
- `--weight-medium` foi padronizado de `520` para `500`, `--leading-tight` ajustado para `1.18` (protegendo diacríticos e descendentes do português) e os trackings negativos exagerados (`-0.04em` / `-0.035em`) foram unificados nos tokens `--tracking-tight: -0.02em` e `--tracking-snug: -0.012em`.

---

## 5. Implementação do seletor de aparência

Na tela de Ajustes (`SettingsPage.tsx`), foi adicionada no topo a seção **Aparência** contendo o componente `AppearancePanel`:

- Construído como um _Segmented Control_ inspirado no iOS (`role="radiogroup"` com inputs nativos `<input type="radio">` acessíveis por setas do teclado, `Tab`, toque e VoiceOver, sem bibliotecas externas).
- Oferece as três opções exigidas: **Sistema**, **Claro** e **Escuro**.
- Exibe resumo contextual dinâmico (`aria-live="polite"`) informando o estado efetivo atual e esclarecendo que o Modo Show mantém sempre sua superfície escura de palco.

---

## 6. Persistência, inicialização sem flash e `meta[name="theme-color"]`

Para atender simultaneamente aos requisitos de **não duplicar o mecanismo oficial de persistência** e **evitar qualquer flash do tema errado (FOUC)**:

1. **Persistência canônica:** Utiliza `getPreference` / `setPreference` já existentes em `src/services/preferences.ts` (tabela `db.preferences` do IndexedDB, chave `'ui.appearance'`), participando automaticamente da exportação e restauração de backups (`BackupPanel` chama `hydrateAppearance()` após restaurar). Usuários sem preferência salva recebem `'system'` como padrão seguro.
2. **Cache síncrono de boot (`index.html`):** Um pequeno script inline no `<head>` lê o espelho leve `localStorage['meu-repertorio:appearance']` (com `try/catch` para navegação privada), resolve `'system'` via `matchMedia('(prefers-color-scheme: dark)')` e define `document.documentElement.dataset.theme`, `style.colorScheme` e `meta[name="theme-color"]` **antes da primeira pintura da página**.
3. **Reatividade em tempo real e navegação entre telas:**
   - Quando em modo **Sistema**, um listener em `matchMedia('(prefers-color-scheme: dark)')` atualiza imediatamente o tema e o `theme-color` se o sistema operacional mudar de aparência com o app aberto.
   - `App.tsx` informa a superfície ativa via `setThemeSurface(route.name === 'show' ? 'stage' : 'app')`, garantindo que `meta[name="theme-color"]` assuma `#0b0c0e` ao entrar no Modo Show mesmo com o tema Claro fixado, e retorne a `#f5f5f7` ao sair.

---

## 7. Variantes semânticas adicionadas

- **`Button` (`src/components/ui/Button.tsx`):**
  - Adicionadas `variant="danger"` (fundo vermelho sólido `--color-danger-solid` com texto branco `--color-danger-contrast` para confirmações destrutivas primárias) e `variant="danger-soft"` (superfície `--color-danger-soft` com texto e contorno sutil `--color-danger` para ações destrutivas secundárias).
  - Preservadas integralmente `primary`, `secondary`, `ghost` e tamanhos `sm` e `md`.
- **`Badge` (`src/components/ui/Badge.tsx`):**
  - Adicionado `tone="danger"` (fundo `--color-danger-soft`, texto `--color-danger` e borda sutil).
  - Atualizado `CloudPage.tsx` para aplicar `tone="danger"` quando `snapshot.status === 'error'`, mantendo `tone="warning"` para estados não-críticos de atenção (`offline` e `account-mismatch`) e em `ConnectionStatus` (`Offline`).

---

## 8. Correções de ergonomia de campos e controles

- **Prevenção de auto-zoom no Safari iOS (`>= 16px`):** Corrigida a causa raiz em `src/styles/global.css` trocando `font: inherit` em `input, textarea, select` por `font-family: inherit` + `font-size: var(--text-base)` (`16px`) e regra explícita `font-size: max(1rem, 16px)` em `@media (max-width: 860px), (pointer: coarse)`, além de remover reduções para `14px` em `AddSongsDialog`, `RepertoryOrderPanel`, `ImportSongPage` (mantendo `14px` apenas em desktop com ponteiro fino) e `BatchImportPage`.
- **Estados `:read-only` e `:disabled` claros:** Adicionado tratamento global em `global.css` diferenciando campos somente-leitura (como `Tom original` em `SongEditorPage`) e desabilitados com `--color-surface-muted` e `--color-border`.
- **Alinhamento, hover e toque (`:active`):** Protegidos estados `:hover` em `global.css`, `Button`, `AppearancePanel` e `BackupPanel` com `@media (hover: hover)` (evitando hover "preso" em telas touch), adicionado feedback tátil `:active` (`scale(0.985)`) e alinhado o seletor `"Selecionar backup"` (`min-height: 44px`, `justify-content: center`) com `"Exportar biblioteca"`.

---

## 9. Testes executados e resultados

| Comando                           | Resultado                                                                                                                                                                 |
| :-------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run typecheck`               | Passou sem erros (`tsc -b --pretty false`).                                                                                                                               |
| `npm run lint`                    | Passou sem erros ou avisos (`eslint .`).                                                                                                                                  |
| `npm run format:check`            | Passou em todos os arquivos (`prettier --check .`).                                                                                                                       |
| `npm test`                        | **49 arquivos, 280 testes unitários e de integração — todos passaram.**                                                                                                   |
| `npm run build`                   | Passou (`vite build` + PWA com 21 entradas de precache, `1140.31 KiB`).                                                                                                   |
| `npx playwright test --workers=1` | **73 testes E2E passaram, 1 ignorado (`isMobile` em drag de mouse), 0 falhas** (Chromium desktop, Mobile Chrome, WebKit iPhone simulado e WebKit iPad simulado).          |
| Inspeção visual multi-viewport    | Validada em `343px`, `390px`, `768px`, `1024px` e `1280px` nos temas Claro e Escuro (Ajustes, Biblioteca, Estado vazio, Botões, Badges, Inputs e Modal `AddSongsDialog`). |

---

## 10. Comparação visual antes / depois

As capturas comparativas foram geradas em `docs/screenshots/etapa41/antes/` e `docs/screenshots/etapa41/depois/` cobrindo **343px, 390px, 768px, 1024px e 1280px** nos temas **Claro** e **Escuro** (Ajustes, Biblioteca preenchida, Biblioteca vazia e Modal `AddSongsDialog`):

- **Ajustes (`343px` a `1280px`):** No tema claro, o fundo pergaminho `#f5f2ea` e os botões marrom-ocre deram lugar a superfícies brancas nítidas sobre alabastro `#f5f5f7`, tipografia nativa limpa, controle segmentado `Sistema | Claro | Escuro` perfeitamente acomodado mesmo em `343px`, e simetria entre `"Exportar biblioteca"` e `"Selecionar backup"`. No tema escuro, o cartão `#15171b`, o trilho `#1c1e24` e a opção ativa/inputs `#242730` exibem hierarquia clara por luminância.
- **Biblioteca e Estado Vazio:** Leitura imediata com `SF Pro` / fonte do sistema nos títulos e artistas, preservando `JetBrains Mono` no contador `2 músicas` e nas tonalidades `G`, com contraste limpo nos badges e avisos.
- **Modal `AddSongsDialog` (`390px` e `1280px`):** Elevação clara do painel `#242730` sobre o overlay escuro, anel de foco âmbar preciso e campo de busca com fonte de `16px` sem quebra de layout.

---

## 11. Problemas encontrados e limitações restantes (Escopo das próximas etapas)

Conforme as restrições de escopo da Etapa 41, permanecem planejados para as etapas seguintes:

- **Etapa 42:** Criação dos primitivos compartilhados (`Sheet`, `ConfirmDialog` usando as novas variantes `danger` / `danger-soft`, e `ActionMenu`) para substituir os 5 usos restantes de `window.confirm()`.
- **Etapa 43:** Substituição do menu hambúrguer mobile (`MobileNavMenu`) pela _Tab Bar_ inferior estilo iOS, simplificação da `Topbar` e ajustes de _safe areas_ em paisagem.
- **Etapa 44–47:** Remoção das abas redundantes (`LibraryTabs`) e do FAB flutuante, exibição do Tom no `SongCard` mobile, solução do corte horizontal de cifras em `SongSheet`, correção do posicionamento do diagrama no Modo Show e padronização final dos seletores de arquivo e microcopies.
