# DESIGN.md — Diretrizes Visuais e de Interface

Este documento é a **fonte central de verdade visual** do **Meu Repertório V2**.

## Governança obrigatória

1. **Consulta prévia:** Toda etapa que crie, altere ou revise componentes, estilos ou fluxos de tela deve consultar e respeitar este documento em conjunto com `AGENTS.md`.
2. **Fonte única de valores:** Os valores exatos de tokens residem exclusivamente em `src/styles/tokens.css`. Não duplique tabelas extensas de hexadecimais neste documento para evitar defasagem.
3. **Regra de divergência:** Se uma decisão de implementação precisar divergir do `DESIGN.md`, o agente deve **justificar explicitamente o motivo** na entrega da etapa e **atualizar este documento** quando a decisão representar uma mudança intencional de padrão.

---

## 1. Identidade visual

- **Direção:** Apple / iOS — minimalista, sofisticada, funcional, consistente e discreta.
- **Caráter de produto:** Ferramenta musical profissional (referências de acabamento: _Apple Music_, _Apple Notes_, _Logic Remote_ e _forScore_), com identidade própria voltada ao violão e à leitura de cifras.
- **Equilíbrio:** Funciona com a mesma clareza nos temas **Claro** e **Escuro**, além da superfície dedicada de **Palco** no Modo Show.

---

## 2. Filosofia de design

- **Deferência ao conteúdo musical:** Letra, cifras, tonalidades e repertórios têm prioridade visual absoluta sobre molduras, barras e cromatismos da interface.
- **Sem ornamentos vazios:** Não usar gradientes decorativos, sombras pesadas, excesso de bordas, cartões aninhados sem função, ícones repetitivos em todas as linhas ou aparência de _dashboard_ administrativo.
- **Densidade intencional:** Cada tela deve destacar uma única ação primária clara; ações secundárias e destrutivas ficam agrupadas discretamente.

---

## 3. Tipografia

- **Interface (`--font-sans`):** Pilha nativa do sistema (`-apple-system`, `BlinkMacSystemFont`, `'SF Pro Text'`, `'SF Pro Display'`, `system-ui`, `sans-serif`) para navegação, títulos, botões, formulários e listas.
- **Notação musical (`--font-mono`):** `'JetBrains Mono'` reservada estritamente para cifras (`SongSheet`), símbolos de acordes, tonalidades, códigos de verificação e contadores tabulares (`font-variant-numeric: tabular-nums`).
- **Hierarquia:**
  - Títulos amplos (`--text-2xl` / `--text-3xl`) apenas nas raízes das seções principais; subpáginas e diálogos usam títulos contidos (`--text-lg` / `--text-xl`).
  - Pesos equilibrados (`--weight-regular`, `--weight-medium`, `--weight-semibold`, `--weight-bold`) e entrelinhas definidas por `--leading-tight` e `--leading-normal`.

---

## 4. Cores e temas

Todos os estilos devem consumir exclusivamente os tokens semânticos de `src/styles/tokens.css`:

- **Superfícies e camadas:** `--color-bg` (fundo base), `--color-surface` (agrupamentos), `--color-surface-raised` (camadas elevadas, modais, inputs), `--color-surface-muted` e `--color-surface-interactive` (estados sutis e seleção).
- **Texto:** `--color-text` (leitura principal), `--color-text-muted` (metadados e apoio), `--color-text-subtle` (rótulos discretos).
- **Divisores e foco:** `--color-border`, `--color-border-strong`, `--color-focus` e `--focus-ring`.
- **Cor de destaque (`--color-accent*`):** Usada apenas com intenção funcional — ação primária, item ativo, favoritos marcados, acordes/diagramas e indicador de foco. Nunca em grandes áreas decorativas.
- **Cores semânticas:** `--color-success*` (confirmação), `--color-warning*` (atenção/revisão) e `--color-danger*` (exclusão, erro e alerta crítico).
- **Temas:**
  - **Claro:** Superfícies neutras e luminosas, separadores discretos e alto contraste de leitura.
  - **Escuro:** Profundidade construída por degraus sutis de luminância entre superfícies (não simples inversão de cores).
  - **Modo Show (`--color-stage-*`):** Paleta escura fixa de palco, independente do tema geral do aplicativo, garantindo conforto visual em ambientes de apresentação.

---

## 5. Espaçamento e layout

- **Escala oficial:** Múltiplos consistentes definidos em `--space-1` (`0.25rem`) até `--space-12` (`3rem`). Evitar medidas arbitrárias fora da escala.
- **Margens e largura:** Conteúdo principal limitado a `--layout-content`, com respiro lateral enxuto no mobile (`--space-4`) para maximizar a largura útil das cifras e listas, evitando paddings duplos acumulados.
- **Raios (`--radius-sm` a `--radius-xl`, `--radius-full`):** Proporcionais ao tamanho do elemento, mantendo curvatura concêntrica quando houver elementos internos.

---

## 6. Componentes

- **Botões (`Button`):** Respeitar alturas `--control-height-sm` e `--control-height-md` (`44px`). Variantes semânticas claras: `primary`, `secondary`, `ghost` e `danger` (obrigatória para ações destrutivas). Não utilizar FAB circular flutuante estilo Material Design.
- **Inputs, Selects e Textareas:** Base global consistente, foco visível (`--focus-ring`), distinção clara para estados `disabled` e `readOnly`, e `font-size >= 1rem` (`16px`) em viewports móveis para impedir zoom automático no iOS Safari. Seletores de arquivo devem seguir padrão visual único em português.
- **Badges (`Badge`):** Compactos, não interativos, restritos a status e metadados curtos (`neutral`, `accent`, `success`, `warning`, `danger`).
- **Listas:** Separadas por divisores horizontais discretos, sem envolver cada item em cartão isolado. Preservar metadados musicais essenciais (como Tom) no mobile e agrupar ações secundárias/destrutivas em menus contextuais (`...`) em vez de enfileirar múltiplos ícones por linha.
- **Diálogos, Menus e Folhas Inferiores (_Bottom Sheets_):** Gerenciar bloqueio de rolagem (`lockBodyScroll`), retenção e devolução de foco e fechamento por `Escape`/toque externo. Nunca usar `window.confirm()` ou `window.alert()` nativos. Painéis de consulta musical (como diagramas de acordes) devem flutuar sem impedir a leitura da música ao fundo.

---

## 7. Interações e estados

- **Movimento:** Transições curtas e naturais (`--transition-fast`, `--transition-base`), priorizando `transform` e `opacity`. Respeitar obrigatoriamente `@media (prefers-reduced-motion: reduce)`.
- **Toque, hover e foco:** Aplicar `:hover` apenas quando suportado (`@media (hover: hover)`); fornecer resposta imediata `:active` ao toque em botões e linhas clicáveis; manter `:focus-visible` nítido para navegação por teclado.
- **Estados de dados:** Estados vazios devem orientar o próximo passo com clareza; estados de carregamento local não devem provocar saltos bruscos de layout; mensagens de sucesso e erro devem usar semântica e posicionamento previsíveis.

---

## 8. Responsividade e dispositivos

- **Larguras de referência:** Validar layouts em `343 px`, `390 px` (iPhone), `768 px` (iPad retrato), `1024 px` (iPad paisagem / notebook) e `1280 px+` (desktop).
- **Ecossistema Apple / PWA:** Utilizar `100dvh`, respeitar `env(safe-area-inset-*)` nas quatro bordas (incluindo orientação paisagem com _Dynamic Island_), sincronizar `meta[name="theme-color"]` com a superfície ativa e acomodar o teclado virtual do Safari sem quebrar modais.
- **Modo Show:** Tratado como interface crítica de palco — sem corte horizontal de letras/cifras, sem conflito entre leitura e gestos de troca de música, e com controles compactos que preservem a área de leitura em retrato e paisagem.

---

## 9. Acessibilidade

- **Contraste:** Mínimo WCAG AA (`4.5:1` para textos, `3:1` para títulos grandes e controles visuais) nos temas claro, escuro e palco.
- **Áreas de toque:** Mínimo de `44 × 44 px` (`2.75rem`) para alvos interativos em toque (permitindo área de clique expandida quando o desenho visual precisar ser menor, como acordes clicáveis).
- **Semântica, teclado e VoiceOver:** Único marco `<main>` ativo por tela, rótulos explícitos em controles somente-ícone (`aria-label`), papéis ARIA fiéis ao comportamento de teclado (`dialog`, `switch`, `status`, `alert`) e operação integral sem mouse.

---

## 10. Restrições técnicas

- **Zero literais soltos:** Proibido declarar cores hexadecimais, `rgb()` ou `hsl()` fora de `src/styles/tokens.css` (exceto nos SVGs oficiais da marca).
- **Sem gambiarras de estilo:** Evitar `!important`, estilos inline arbitrários (exceto variáveis CSS dinâmicas justificadas, como escala tipográfica da cifra) e duplicação de regras base entre CSS Modules quando couber componente compartilhado.
- **Parcimônia em dependências:** Não instalar bibliotecas externas de UI ou animação sem benefício demonstrável frente a CSS moderno + componentes próprios, preservando o tamanho enxuto do bundle e o funcionamento 100% offline.
