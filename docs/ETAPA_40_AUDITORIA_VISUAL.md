# Etapa 40 — Auditoria Visual Completa e Definição da Identidade Apple / iOS

**Projeto:** Meu Repertório  
**Checkout:** `v2`  
**Data:** 17/11/2026  
**Natureza:** Auditoria visual, UX, microinterações, responsividade e design system  
**Escopo desta etapa:** Diagnóstico técnico e visual completo, sem implementação em código de produção

---

## Sumário

- [A. Diagnóstico geral e definição da identidade Apple / iOS](#a-diagnóstico-geral-e-definição-da-identidade-apple--ios)
- [B. Inventário completo das telas, componentes e estados](#b-inventário-completo-das-telas-componentes-e-estados)
- [C. Problemas encontrados (Catálogo técnico priorizado)](#c-problemas-encontrados-catálogo-técnico-priorizado)
- [D. Auditoria do Design System e Temas (Claro, Escuro e Palco)](#d-auditoria-do-design-system-e-temas-claro-escuro-e-palco)
- [E. Responsividade, dispositivos e ergonomia de palco](#e-responsividade-dispositivos-e-ergonomia-de-palco)
- [F. Oportunidades de melhoria (Alto, Médio e Baixo impacto)](#f-oportunidades-de-melhoria-alto-médio-e-baixo-impacto)
- [G. Avaliação de componentes externos (UIArc)](#g-avaliação-de-componentes-externos-uiarc)
- [H. Plano de execução incremental (Próximas etapas)](#h-plano-de-execução-incremental-próximas-etapas)

---

## A. Diagnóstico geral e definição da identidade Apple / iOS

### A.1. Avaliação da qualidade visual atual

O **Meu Repertório V2** possui uma fundação funcional madura: motor musical independente, persistência offline confiável em IndexedDB/Dexie, sincronização incremental com Supabase, importação individual/em lote e Modo Show dedicado. As Etapas 25 e 26 eliminaram cores literais fora de `tokens.css` e reduziram excessos iniciais de cartões e sombras.

Contudo, **a interface atual é funcional, mas ainda não tem acabamento de produto finalizado**. Ao percorrermos todas as rotas, estados intermediários e CSS Modules, evidenciam-se sintomas claros de uma aplicação web utilitária construída por acúmulo incremental de etapas:

1. **Conflito de linguagens visuais (Web Admin + Material Design + Editorial Indie):**
   - A `Topbar` superior exibe rótulo estático administrativo (`"BIBLIOTECA LOCAL"`), ícone do app repetido, nome do produto e badge permanente `"Online"` com ícone de Wi-Fi separado.
   - A navegação móvel esconde as 4 seções principais atrás de um botão hambúrguer quadrado no canto superior esquerdo (`MobileNavMenu`), enquanto um componente `BottomNav` permanece órfão no repositório e abas secundárias (`LibraryTabs`) duplicam itens da navegação principal.
   - A ação principal da Biblioteca utiliza um **FAB circular flutuante** (`LibraryActionMenu`), padrão clássico do Material Design / Android que destoa frontalmente do ecossistema iOS.
   - A tipografia de interface utiliza `Bricolage Grotesque` em toda a aplicação — uma fonte _display_ com curvas editoriais marcadas que dá personalidade de _landing page_, mas compete com a leitura rápida e contradiz a neutralidade invisível da tipografia Apple (`SF Pro`).

2. **Problemas reais de leitura e interação em uso musical:**
   - **Corte horizontal de letras e cifras no iPhone (343 px / 390 px):** `SongSheet` força `white-space: pre` com `min-width: max-content`. Versos comuns em português (~44–50 caracteres) são cortados na borda direita tanto na leitura normal quanto no Modo Show — onde o gesto horizontal de tentar ler o fim do verso conflita diretamente com o _swipe_ de troca de música.
   - **Diagrama de acorde invisível após rolagem no Modo Show:** Ao contrário de `SongViewPage` (que usa `ChordDiagramOverlay`), `ShowModePage` renderiza `<ChordDiagram>` no fluxo normal do documento acima de `.reading`. Se o músico rolar até a metade da cifra e tocar num acorde, o diagrama abre fora da tela (no topo da página) e empurra a letra para baixo.
   - **Falha de `pointer-events` e contraste em `ChordDiagramOverlay`:** O container `.dialog` possui `pointer-events: none` (apenas `button` tem `pointer-events: auto`), fazendo toques no corpo do card vazarem para o fundo e fecharem o diagrama acidentalmente, enquanto o `.backdrop` escurece toda a cifra atrás (`62%` de preto no tema escuro), impedindo ler a música com o diagrama aberto.
   - **Congestionamento vertical antes do conteúdo:** Em `SongViewPage` e `RepertoriesPage` no mobile, barras empilhadas consomem mais de 55% da altura útil da tela antes da primeira cifra ou do primeiro repertório.

3. **Fragmentação de padrões interativos e controles subdimensionados:**
   - Coexistem **3 padrões de confirmação** (`window.confirm` nativo bloqueante em 5 fluxos, faixa inline em `RepertoriesPage` com botão primário âmbar para ação destrutiva, e barra superior em `ShowModePage`).
   - Coexistem **3 seletores de arquivo diferentes** (`ImportSongPage`, `BatchImportPage` com `<input type="file">` nativo cru e `BackupPanel` desalinhado à esquerda).
   - `Button` e `Badge` não possuem variante semântica de erro/destruição (`danger`), levando botões de exclusão a usarem cor primária e erros de sincronização na nuvem a usarem badge de alerta amarelo.
   - Dezenas de áreas de toque medem entre `24 px` e `36 px` (`1.5rem` a `2.25rem`), abaixo do mínimo ergonômico de `44 × 44 pt` das _Apple Human Interface Guidelines (HIG)_.

---

### A.2. Definição objetiva da direção visual Apple / iOS para o Meu Repertório

Adotar a referência **Apple / iOS** para o Meu Repertório **não significa clonar telas genéricas do iOS**, e sim aplicar os princípios fundamentais das _Human Interface Guidelines_ (Clareza, Deferência ao Conteúdo e Profundidade em Camadas) a uma ferramenta musical de nível profissional (à altura de referências como _Apple Music_, _Apple Notes_, _Logic Remote_ e _forScore_):

| Pilar                              | O que eliminamos                                                                                                                                              | O que adotamos no Meu Repertório                                                                                                                                                                                                                               |
| :--------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Deferência ao conteúdo musical** | Topbar administrativa, cabeçalhos redundantes, excesso de botões emoldurados antes da cifra, ícones repetidos em toda linha de lista (`Music2`, `ListMusic`). | A cifra, a letra e o repertório dominam a tela. Controles de apoio agrupam-se em barras compactas, discretas e translúcidas que saem do caminho.                                                                                                               |
| **Tipografia nativa de precisão**  | `Bricolage Grotesque` aplicada indiscriminadamente em botões, inputs, listas e rótulos.                                                                       | Pilha nativa Apple (`-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', system-ui, sans-serif`) para toda a UI, reservando `JetBrains Mono` exclusivamente para cifras, acordes, tonalidades e métricas tabulares.                            |
| **Superfícies e profundidade**     | Tema claro amarelado/sépia (`#f5f2ea` + marrom `#9a6414`); tema escuro com camadas quase indistinguíveis (`#141518` vs `#191b1f`); bordas pesadas em tudo.    | Tema claro luminoso em alabastro neutro-quente (`#F5F5F7` / `#FFFFFF`) com separadores _hairline_ sutis; tema escuro com elevação real por luminância progressiva (`#0B0C0E` → `#16171B` → `#202228` → `#2B2E36`) e _glass/vibrancy_ discreto em barras fixas. |
| **Cor de destaque com intenção**   | Botão `"Salvar"` aceso sem alteração pendente; ação destrutiva usando cor primária âmbar; badge `"Online"` verde chamando atenção o tempo todo.               | Âmbar musical refinado usado apenas para ações primárias reais, estado ativo, acordes e foco; vermelho semântico (`danger`) exclusivo para ações destrutivas e erros; status de rede silencioso (visível apenas quando relevante/offline ou em Ajustes).       |
| **Navegação e ergonomia de toque** | Menu hambúrguer no topo esquerdo + FAB flutuante no canto inferior direito + botões de `24–36 px`.                                                            | _Tab Bar_ inferior fixa estilo iOS no mobile (4 destinos claros com área segura), ações de criação no cabeçalho da tela, alvos mínimos de `44 × 44 px` e menus contextuais (`...`) / _sheets_ inferiores para ações secundárias.                               |
| **Microinterações naturais**       | `window.confirm()` bloqueante, abertura/fechamento secos sem transição de saída, zoom acidental do Safari em inputs `< 16px`.                                 | Curva elástica contínua estilo iOS (`cubic-bezier(0.32, 0.72, 0, 1)`), feedback tátil visual (`scale(0.97)` sutil ao pressionar), _Bottom Sheets_ e diálogos acessíveis com respeito estrito a `prefers-reduced-motion`.                                       |

---

## B. Inventário completo das telas, componentes e estados

Foram inspecionados **todos os arquivos existentes em `src/`**, sem inventar rotas ou componentes inexistentes.

### B.1. Matriz de componentes compartilhados existentes

| Categoria             | Componentes e arquivos                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Papel atual                                                                                                                                                                                                                                                                                         |
| :-------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Shell e Navegação** | [AppShell.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/components/layout/AppShell.tsx), [Sidebar.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/components/layout/Sidebar.tsx), [Topbar.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/components/layout/Topbar.tsx), [MobileNavMenu.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/components/layout/MobileNavMenu.tsx), [BottomNav.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/components/layout/BottomNav.tsx) _(órfão)_, [Brand.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/components/layout/Brand.tsx), [PageHeader.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/components/layout/PageHeader.tsx) | Estrutura lateral no desktop (`> 860px`), barra superior fixa com menu hambúrguer no mobile (`<= 860px`), cabeçalho reutilizado apenas em `SettingsPage`.                                                                                                                                           |
| **Primitivos de UI**  | [Button.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/components/ui/Button.tsx), [Badge.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/components/ui/Badge.tsx), [EmptyState.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/components/feedback/EmptyState.tsx), [SettingsCard.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/components/settings/SettingsCard.tsx)                                                                                                                                                                                                                                                                                                                                                  | Botão (`primary`, `secondary`, `ghost`; `sm`, `md`), selo (`neutral`, `accent`, `success`, `warning`), estado vazio com borda tracejada e seção de ajustes. _(Não existem primitivos compartilhados de `Input`, `SearchField`, `Dialog`, `Sheet`, `ConfirmDialog`, `Toast` ou `SegmentedControl`)._ |
| **Música e Cifras**   | [SongSheet.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/songs/SongSheet.tsx), [ChordDiagram.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/components/music/ChordDiagram.tsx), [ChordDiagramGraphic.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/components/music/ChordDiagramGraphic.tsx), [ChordDiagramOverlay.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/components/music/ChordDiagramOverlay.tsx)                                                                                                                                                                                                                                                                                                | Renderização monoespaçada de letra/cifras (`default` e `stage`), SVG de braço de violão com 5 casas/pestana/dedos e painel flutuante de variações.                                                                                                                                                  |
| **Sistema e PWA**     | [ConnectionStatus.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/components/system/ConnectionStatus.tsx), [InstallHelp.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/components/system/InstallHelp.tsx), [UpdateNotice.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/components/system/UpdateNotice.tsx), [ErrorBoundary.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/components/system/ErrorBoundary.tsx)                                                                                                                                                                                                                                                                                                        | Indicador Online/Offline, instruções de instalação no Safari, banner fixo de atualização de Service Worker e tela de fallback para erro fatal de renderização.                                                                                                                                      |

---

### B.2. Análise detalhada por tela e fluxo

#### 1. Navegação Global e Moldura (`AppShell`, `Sidebar`, `Topbar`, `MobileNavMenu`, `BottomNav`)

1. **Estrutura atual:** Grid de 2 colunas no desktop (`Sidebar` fixa de `16rem` + `Topbar` sticky de `4rem` + `<main className={styles.content}>`). Em `<= 860px`, oculta `Sidebar` e exibe `Topbar` com botão hambúrguer (`MobileNavMenu`), marca compacta e `ConnectionStatus`.
2. **Hierarquia visual:** No desktop, a `Topbar` cria uma faixa horizontal inteira apenas para repetir `"BIBLIOTECA LOCAL"` e o selo `"Online"`. No mobile, o cabeçalho global compete diretamente com o título da página logo abaixo.
3. **Problemas de consistência:** `BottomNav.tsx` continua no código mas não é utilizado; `Sidebar` usa barra interna âmbar (`inset 2px 0 0`) para item ativo, enquanto `MobileNavMenu` não usa; `Topbar` diz `"Biblioteca local"` mesmo quando o usuário está sincronizado na Nuvem ou navegando em Ajustes.
4. **Problemas de usabilidade:** No iPhone, alternar entre Biblioteca, Repertórios, Favoritos e Ajustes exige alcançar o canto superior esquerdo (zona mais difícil para o polegar) e realizar 2 toques. `MobileNavMenu` abre `backdrop` fixo sem travar o scroll da página (`lockBodyScroll`) e sem prender o foco (`Tab` escapa para elementos atrás do backdrop).
5. **Problemas de responsividade:** Em `<= 860px`, `AppShell.module.css` sobrescreve `padding-bottom: env(safe-area-inset-bottom)`, zerando o respiro inferior quando o inset é `0`. Em iPhone Pro Max em _landscape_ (`932px > 860px`), entra o layout desktop sem `env(safe-area-inset-left)`, colando a `Sidebar` na _Dynamic Island_.
6. **Oportunidades de refinamento:** Adotar _Tab Bar_ inferior translúcida estilo iOS no mobile (`<= 860px`), eliminar a `Topbar` redundante no desktop (movendo status offline discreto para a `Sidebar` e apenas quando offline/sincronizando) e simplificar o topo mobile.
7. **Componentes compartilhados:** `Brand`, `ConnectionStatus`, `Badge`.

---

#### 2. Biblioteca de Músicas e Busca (`LibraryPage`, `LibraryTabs`, `SongCard`, `LibraryActionMenu`)

1. **Estrutura atual:** Cabeçalho com `<h1>Biblioteca</h1>` + contador monoespaçado (`5 músicas`), abas `LibraryTabs` (`Músicas | Repertórios`), barra de busca + botão filtro `Favoritas`, banner dispensável de aviso pós-importação (`notice`), lista de `SongCard` e botão flutuante circular (`LibraryActionMenu`).
2. **Hierarquia visual:** Boa limpeza de cartões na lista (linhas separadas por `border-bottom`), mas poluída no topo pela repetição `Biblioteca` → abas `Músicas / Repertórios` → barra de busca → FAB flutuante no rodapé.
3. **Problemas de consistência:** `LibraryPage` constrói seu próprio `<header>` em vez de usar `PageHeader`; `LibraryTabs` duplica rotas que já estão no menu principal; `LibraryActionMenu` usa padrão FAB Android e inclui `"Criar repertório"` dentro da tela de Biblioteca; exclusão usa `window.confirm`.
4. **Problemas de usabilidade:** Em dispositivos de toque (`hover: none`), o botão `Trash2` fica permanentemente exposto ao lado do botão `Heart` em todas as músicas, facilitando toques acidentais. `LibraryActionMenu` declara `role="menu"`, mas não implementa navegação por setas (`ArrowUp`/`ArrowDown`). Quando `UpdateNotice` aparece, sobrepõe a região inferior do FAB.
5. **Problemas de responsividade:** Em `390 px` e `343 px`, o placeholder `"Pesquisar por título, artista ou tom"` é truncado no meio da palavra (`"ou t"`). Em `<= 520px`, `SongCard` esconde completamente o `.key` (**o tom da música some no celular!**), mas mantém o ícone decorativo `Music2` repetido em cada linha.
6. **Oportunidades de refinamento:** Substituir o FAB por botão `+` contextual no cabeçalho (abrindo _Action Sheet_ / menu popover limpio), remover o ícone decorativo `Music2` repetitivo das linhas, exibir sempre o badge monoespaçado do Tom no mobile, proteger a exclusão em menu contextual ou _swipe_ secundário, e usar campo de busca estilo _iOS Search Bar_ com botão de limpar (`×`).
7. **Componentes compartilhados:** `EmptyState`, `SongCard`, `LibraryTabs`, `LibraryActionMenu`.

---

#### 3. Favoritos (`FavoritesPage`)

1. **Estrutura atual:** Reutiliza `LibraryPage.module.css` e `SongCard`, exibindo cabeçalho `Favoritos` + contagem e lista filtrada por `favoriteIds` (sem barra de busca e sem abas).
2. **Hierarquia visual:** Mais limpa que a Biblioteca por não ter `LibraryTabs` nem FAB, indo direto ao conteúdo.
3. **Problemas de consistência:** O `EmptyState` exibe o texto `"Use a estrela na biblioteca ou na tela da música para criar seus atalhos"`, mas o ícone real em todo o aplicativo é um **coração (`Heart`)**, não uma estrela! Além disso, exibe `badge="Biblioteca"` dentro da página de Favoritos.
4. **Problemas de usabilidade:** Sem campo de busca rápida quando a lista de favoritos cresce; tocar no coração remove imediatamente o item da lista sem transição ou opção de desfazer; botão `Excluir` da biblioteca inteira permanece exposto em cada linha no touch (`window.confirm`).
5. **Problemas de responsividade:** Herda de `LibraryPage.module.css` `padding-bottom: calc(4.5rem + env(safe-area-inset-bottom))` (pensado para o FAB da Biblioteca, desnecessário aqui) e herda de `SongCard` o ocultamento do tom em `<= 520px`.
6. **Oportunidades de refinamento:** Corrigir a copy para referenciar o ícone correto, exibir o tom no mobile e adicionar busca rápida opcional quando houver muitas favoritas.
7. **Componentes compartilhados:** `EmptyState`, `SongCard`, `LibraryPage.module.css`.

---

#### 4. Detalhes e Leitura de Música (`SongViewPage`, `SongSheet`, `ChordDiagramOverlay`, `RepertoryPicker`)

1. **Estrutura atual:** Botão voltar → cabeçalho (`<h1>` título, artista, 3 botões quadrados: Favoritar, Editar, Mais ações `[Exportar TXT, Adicionar a repertório]`) → `.toolbar` (painel de tom `[-] Tom [+] Original [Salvar]` + `<details>` Opções de leitura com switch de diagramas) → `.autoScroll` (`[Play/Pause] ROLAGEM [-] slider [+] px/s`) → `<dl>` metadados (`Tom original`, `Capotraste`, `Afinação`) → `<SongSheet>` + `<ChordDiagramOverlay>` condicional + toast fixo.
2. **Hierarquia visual:** **Congestionada no topo.** Antes da primeira linha da música existem até 6 faixas horizontais empilhadas. O botão `Salvar` (com ícone de disquete `Save`) usa `Button` primário âmbar o tempo todo, mesmo sem mudança de tom (`manualShift === null`), roubando o protagonismo visual da tela.
3. **Problemas de consistência:**
   - Usa ícone hambúrguer (`Menu`) para `"Opções de leitura"`, criando dois ícones hambúrguer diferentes na mesma tela mobile.
   - `SongSheet` renderiza a tag `<main>`, gerando **`<main>` aninhado dentro de `<main id="main-content">`** do `AppShell`.
   - `Mais ações` declara `aria-haspopup="menu"`, mas abre uma `<div>` comum contendo um `RepertoryPicker` que abre outro `role="dialog"` absoluto aninhado um sobre o outro.
4. **Problemas de usabilidade:**
   - **Bug em `ChordDiagramOverlay`:** `.dialog` tem `pointer-events: none`; tocar dentro do card fora dos pequenos botões de `36px` fecha o diagrama ou clica em acordes por trás.
   - **Backdrop opaco em `ChordDiagramOverlay`:** Escurece toda a cifra (`62%` no tema escuro), impedindo consultar o diagrama enquanto lê o restante da música.
   - Botões de acorde (`.chordButton`) têm `padding: 0` e altura de linha inline (~21 px), dificultando o toque preciso em cifras curtas como `G`, `C`, `D`.
5. **Problemas de responsividade:**
   - **Corte horizontal da letra/cifra em `343 px` e `390 px`** dentro de `.sheet` (`overflow-x: auto`, `white-space: pre`).
   - `.stepButton` (`36px`), `.scrollToggle` (`36px`) e `.scrollStep` (`32px`) abaixo de `44px`.
   - Toast mobile usa `bottom: calc(4.75rem + env(safe-area-inset-bottom))` (offset legado de barra inferior antiga).
   - Em `<= 390px`, `RepertoryPickerPanel` (`width: min(22rem, 88vw)`) ancorado dentro de `.moreActionsPanel` pode estourar ou comprimir-se próximo às bordas.
6. **Oportunidades de refinamento:** Unificar controles de leitura (Tom, Rolagem e Diagramas) em uma barra compacta estilo iOS; exibir `"Salvar tom"` apenas quando `displayShift !== preferredShift` (ou como pill discreta contextual); transformar `ChordDiagramOverlay` num _inspector_ flutuante sem escurecer a música no desktop e num _Bottom Sheet_ compacto sem bloqueio visual pesado no mobile; criar modo de quebra inteligente de par (`chord + lyric` sincronizados) ou escala tipográfica adaptativa para eliminar corte horizontal no iPhone.
7. **Componentes compartilhados:** `Button`, `SongSheet`, `ChordDiagramOverlay`, `ChordDiagram`, `ChordDiagramGraphic`.

---

#### 5. Edição Estruturada de Música (`SongEditorPage`, `SongLineEditor`)

1. **Estrutura atual:** Botão voltar → cabeçalho com `Editar música` e botão `Salvar alterações` → formulário dividido em 3 painéis (`Identificação`, `Informações musicais`, `Letra e cifras` com lista de `SongLineEditor` por linha e cifras/posições numéricas) → alertas de erro/sucesso → rodapé com `Cancelar` / `Salvar alterações`.
2. **Hierarquia visual:** Estruturada em cartões de formulário claros, porém visualmente densa e extensa em músicas com 40+ linhas (cada linha renderiza card próprio `.lineRow` com textarea, cabeçalho de cifras e inputs de símbolo + posição).
3. **Problemas de consistência:**
   - `SongEditorPage` define localmente `function PlusIcon() { return <span>＋</span> }` (caractere Unicode fullwidth) em vez de usar `<Plus>` do `lucide-react` como todo o resto do app!
   - Campo `Tom original` (`readOnly`) tem exatamente a mesma aparência visual dos campos editáveis (`background: var(--color-surface-raised)`, `border-strong`), parecendo editável até o usuário tentar digitar.
   - Descarte de alterações não salvas usa `window.confirm` tanto no botão voltar quanto no `routeGuard` global (`App.tsx`).
4. **Problemas de usabilidade:** Em telas longas no mobile, editar a linha 35 exige rolar até o fim ou o topo para ver erros ou salvar, e os botões `.iconButton` de adicionar/remover linha/cifra ficam colados (`gap: var(--space-1)`, ~36 px) sem diferenciação cromática para exclusão.
5. **Problemas de responsividade:** Em `343 px`, `.lineRow` (`1.5rem minmax(0, 1fr) auto`) com `.chordRow` (`minmax(0, 1fr) 5rem auto`) deixa menos de `110 px` para o input da cifra, apertando acordes extensos como `F#m7(b5)/C#`.
6. **Oportunidades de refinamento:** Estilizar claramente estados `readOnly`, substituir `PlusIcon` por `Plus` Lucide, criar barra de salvamento _sticky_ discreta quando `dirty === true`, e organizar metadados secundários (`Ritmo`, `Batida`, `Dificuldade`, `Afinação`) de forma mais enxuta (estilo _Inset Grouped Form_ do iOS).
7. **Componentes compartilhados:** `Button`.

---

#### 6. Importação Individual de Música (`ImportSongPage`)

1. **Estrutura atual:** Botão voltar → cabeçalho `Importar cifra` → card `.form` contendo metadados opcionais (`Título`, `Artista`, `Tom original` com aviso de tom inferido), `<textarea>` monoespaçada de 16 linhas, botão secundário `"Abrir importação em lote (PDF ou DOCX)"`, campo `Observações`, `WarningSummary` expansível, seletor `"Carregar TXT ou PDF"` e ações `Cancelar` / `Importar música`.
2. **Hierarquia visual:** Clara no objetivo principal, mas a ordem dos elementos secundários dentro do formulário é confusa: o botão de ir para outra tela (`Importação em lote`) e o botão de carregar arquivo (`TXT ou PDF`) aparecem _abaixo_ da enorme caixa de texto de 22rem, separados pelo campo `Observações`.
3. **Problemas de consistência:** `metadata` tem 3 campos em um grid de 2 colunas (`repeat(2, minmax(0, 1fr))`), deixando `Tom original` órfão na segunda linha ocupando metade da largura; `.filePicker` usa um estilo próprio diferente de `BatchImportPage` e `BackupPanel`.
4. **Problemas de usabilidade:** Quem deseja carregar um PDF ou ir para importação em lote precisa rolar abaixo do textarea gigante de `22rem` para descobrir essas opções; `.contentField textarea` usa `font-size: var(--text-sm)` (`14px`), causando zoom automático forçado no iOS Safari ao tocar para colar a cifra!
5. **Problemas de responsividade:** Em `343 px` / `390 px`, o padding duplo (`AppShell .content` + `.form`) reduz a largura interna da cifra colada, aumentando o scroll horizontal dentro da textarea.
6. **Oportunidades de refinamento:** Posicionar atalhos de entrada (`Colar da área de transferência`, `Arquivo TXT/PDF`, `Importar em lote`) de forma limpa _acima_ ou no cabeçalho do campo de cifra; garantir `font-size: 16px` nos controles mobile para evitar auto-zoom no Safari; alinhar o grid de metadados em 3 colunas no desktop (`Título | Artista | Tom`).
7. **Componentes compartilhados:** `Button`.

---

#### 7. Importação em Lote (`BatchImportPage`)

1. **Estrutura atual:** Botão voltar → cabeçalho `Importar músicas em lote` → caixa tracejada `.picker` com `<input type="file">` nativo → avisos do documento → barra de resumo (`reconhecidas`, `selecionadas`, `para revisar`, botões de texto cru `Selecionar todos` / `Limpar seleção`) → lista de cartões editáveis por música → rodapé `Cancelar` / `Salvar N músicas`.
2. **Hierarquia visual:** A área inicial `.picker` expõe o botão nativo do navegador (`Choose File / No file chosen` ou `Escolher arquivo`), quebrando completamente o acabamento do produto logo no ponto focal da página.
3. **Problemas de consistência:** Botões `Selecionar todos` e `Limpar seleção` em `.summary` não têm classe CSS própria (herdam estilo cru de `<button>` resetado sem padding/borda/cor de ação clara!); `.reviewBadge` recria manualmente um badge pill (`border-radius: 999px`) em vez de usar o componente `<Badge tone="warning">`; classe `.success` em `BatchImportPage.module.css` está morta.
4. **Problemas de usabilidade:** Em lotes grandes (ex.: apostila PDF com 30 músicas), todos os 30 cartões ficam abertos simultaneamente com textareas expandidas, gerando uma página extremamente longa sem filtro rápido `"Mostrar apenas itens para revisar"` e sem barra fixa de conclusão.
5. **Problemas de responsividade:** `<input type="file">` nativo usa `font-size: var(--text-sm)` e texto longo de nome de arquivo pode truncar de forma feia em `343 px`; checkbox em `.cardHeader` tem tamanho padrão nativo pequeno (`~16px`).
6. **Oportunidades de refinamento:** Unificar a zona de upload visualmente com ícone, título e ação clara em português; usar `<Badge tone="warning">`; estilizar botões de seleção em lote como controles iOS discretos; permitir recolher blocos já validados (`OK`) mantendo abertos os blocos com `Revisar`.
7. **Componentes compartilhados:** `Button` _(poderia usar `Badge`)_.

---

#### 8. Lista de Repertórios (`RepertoriesPage`)

1. **Estrutura atual:** Cabeçalho `Repertórios` + contagem → `LibraryTabs` (`Músicas | Repertórios`) → painel sempre aberto `Criar repertório` (input + botão primário) → barra de busca → alertas → lista de repertórios (ou `EmptyState`), cada linha com 4 botões de ícone (`Play`, `Pencil`, `Copy`, `Trash2`), edição inline de nome e confirmação inline de exclusão.
2. **Hierarquia visual:** **Invertida no mobile.** O formulário de criação permanente + abas + busca empurram os repertórios existentes para a metade inferior da tela — sendo que, na prática musical, abrir/tocar um repertório existente é 20× mais frequente do que criar um novo!
3. **Problemas de consistência:**
   - Na confirmação inline de exclusão (`Excluir este repertório?`), o botão `"Excluir"` usa `<Button size="sm">` (variante `primary` âmbar!), dando à destruição de dados a mesma cor de ação construtiva.
   - `RepertoriesPage.module.css` usa `background: var(--color-surface)` na busca, enquanto `LibraryPage.module.css` usa `background: var(--color-surface-raised)` para o exato mesmo componente visual de busca.
   - Classes `.eyebrow` e `.description` mortas no CSS Module.
4. **Problemas de usabilidade:** 4 botões somente-ícone (`Play`, `Pencil`, `Copy`, `Trash2`) enfileirados sem rótulo visível e com `36.8 px` de largura exigem memorização de ícones e aumentam cliques acidentais. O botão principal `"Tocar"` (entrar no Show Mode) tem exatamente o mesmo peso visual cinza apagado de `"Duplicar"` e `"Excluir"`.
5. **Problemas de responsividade:** Em `343 px`, títulos de repertório médios coexistem com 4 botões de ação na mesma linha, gerando quebras precoces ou `.cardActions { flex-wrap: wrap }` em duas linhas desalinhadas.
6. **Oportunidades de refinamento:** Mover `"Novo repertório"` para botão `+` no cabeçalho (abrindo sheet/modal enxuto ou linha expansível sob demanda); destacar `"Tocar"` como pill/botão claro e agrupar `"Renomear"`, `"Duplicar"` e `"Excluir"` (em vermelho destrutivo) num menu de ações (`...`) ou _swipe actions_ progressivas.
7. **Componentes compartilhados:** `Button`, `EmptyState`, `LibraryTabs`.

---

#### 9. Editor de Repertório e Diálogo de Adição (`RepertoryEditorPage`, `RepertoryOrderPanel`, `ToneEditor`, `AddSongsDialog`)

1. **Estrutura atual:** Botão voltar → cabeçalho com nome do repertório + botão `"Renomear"` inline + contagem + botão primário `"Tocar"` → feedbacks → `RepertoryOrderPanel` (cabeçalho `"Músicas do repertório"` + botão `"Adicionar"`, lista ordenada `<ol>` com índice, `dragHandle` de arrasto por mouse/touch/teclado, título/artista, `toneChip` que abre `ToneEditor` inline, e 3 botões `ArrowUp`, `ArrowDown`, `Trash2`) + modal/sheet `AddSongsDialog`.
2. **Hierarquia visual:** Muito bem resolvida funcionalmente nas Etapas 36–38 (separação clara entre leitura da ordem e diálogo de adição). Porém, cada linha da lista acumula **6 elementos interativos/visuais simultâneos** (número + handle `GripVertical` + título + chip `Tom` + `Subir` + `Descer` + `Remover`).
3. **Problemas de consistência:** Remoção de música do repertório usa `window.confirm`, enquanto a lista de repertórios ao lado usa confirmação inline. `AddSongsDialog` é o único modal com `lockBodyScroll` + _focus trap_ completo, mas fecha sem animação de saída e sem _grabber_ visual quando vira _bottom sheet_ em `<= 560px`.
4. **Problemas de usabilidade:**
   - Áreas de toque críticas subdimensionadas em `RepertoryOrderPanel`: `.toneChip` tem `24 px` de altura (`1.5rem`); botões `Subir`, `Descer` e `Remover` têm `32 × 32 px` (`2rem`) — e caem para **`29.6 px` (`1.85rem`)** em `<= 420px`!
   - Em `AddSongsDialog`, o botão fechar `.close` tem `32 × 32 px` e o campo de busca tem `font-size: var(--text-sm)` (`14px` → auto-zoom no iOS Safari!).
   - Em `ToneEditor`, o input tem `height: 2rem` (`32 px`) e `font-size: 14px` (auto-zoom no iOS Safari!).
   - Não é possível tocar no título da música dentro do repertório para abri-la rapidamente para consulta/edição (apenas iniciar o Show Mode pelo topo).
5. **Problemas de responsividade:** Em `343 px`, a linha `.item` (`20px + 32px + 1fr + 89px` de 3 botões) espreme o título da música e o nome do artista em ~155 px.
6. **Oportunidades de refinamento:** Aumentar áreas de toque para `>= 44px` (ou recolher `Subir`/`Descer`/`Remover` num menu/modo de edição estilo iOS _"Editar"_ / menu `...`, mantendo o `dragHandle` acessível para reordenação direta); refinar `AddSongsDialog` como _Sheet_ iOS autêntica com _grabber_, fonte `16px` na busca e checkmarks circulares estilo iOS.
7. **Componentes compartilhados:** `Button`.

---

#### 10. Modo Show / Show Mode (`ShowModePage`, `SongSheet[variant="stage"]`)

1. **Estrutura atual:** Fora do `AppShell`, com paleta escura fixa (`--color-stage-*`). Possui: `.topbar` sticky (`Sair`, meta central `1 de 4 · Título · Tom`, botão `Settings2` de controles) → `.confirmExit` condicional → `.songHeading` (`Nome do repertório`, `<h1>Título</h1>`, `Artista`) → painel expansível `.controls` (Tom `- / reset / +`, Tamanho da letra `- / Ajustar / +`, switch de diagramas, status de Wake Lock) → `<ChordDiagram>` inline condicional → área `.reading` com swipe horizontal e `<SongSheet variant="stage">` → barra inferior fixa `.navigation` (linha de rolagem automática + linha `Anterior | 1 de 4 (lista) | Próxima música`) → modal inferior `.trackSheet`.
2. **Hierarquia visual:** A paleta escura de palco (`#0b0c0e` + texto `#f3eee4` + acordes âmbar `#dcae5e`) é um dos pontos mais acertados do projeto. Porém, há redundância direta no topo (`Título` aparece na `.topbar` e repete-se grande logo abaixo em `.songHeading`) e a barra inferior fixa de 2 andares ocupa `~116–130 px` permanentes no celular.
3. **Problemas de consistência e semântica:**
   - **Bug crítico de posicionamento do diagrama:** `<ChordDiagram>` é renderizado inline no topo da página em vez de sobrepor-se como painel flutuante/sheet; se o músico estiver na metade da música, o diagrama abre fora da área visível!
   - `<label htmlFor="show-font-size">` aponta para um ID inexistente.
   - O botão de restaurar tamanho da fonte (`Ajustar`) usa o ícone `<SunMedium>` (**ícone de brilho de tela/sol** para tamanho de texto!).
   - `ShowModePage.module.css` contém regras duplicadas para `.navigation .scrollToggle` e dois usos de `!important`.
4. **Problemas de usabilidade em palco:**
   - **Conflito entre corte horizontal e swipe de troca de música:** Versos de ~45 colunas cortam na horizontal em `343 px` / `390 px`, mas deslizar o dedo horizontalmente para tentar ver o fim da frase pode disparar `move(dx < 0 ? 1 : -1)` (`dx > 64px`) e **trocar de música no meio da execução ao vivo**!
   - Botões `.speedStep` têm `32 × 32 px` (`2rem`) — pequenos demais para um músico com violão no colo a 60–80 cm da estante/celular.
   - Quando o sistema operacional está no **Tema Claro**, entrar no Modo Show mantém `<meta name="theme-color" content="#f5f2ea">` no `index.html`, deixando a barra de status do iOS clara/bege sobre o palco preto `#0b0c0e`.
5. **Problemas de responsividade:** Em _landscape_ no iPhone (altura ~390 px), a `.topbar` sticky (`~56 px`) + a `.navigation` inferior de 2 linhas (`~120 px`) consomem **45% da altura total da tela**, deixando uma fresta estreita para ler a cifra! Em `768 px` (iPad), `.navigation` já vira 1 linha horizontal (`min-width: 760px`), funcionando muito melhor.
6. **Oportunidades de refinamento:** Corrigir imediatamente o diagrama para abrir em overlay/sheet visível em qualquer posição de scroll; resolver o corte horizontal de cifras no palco; colapsar o título duplicado na `.topbar` apenas quando `.songHeading` sair de vista no scroll (padrão clássico de _iOS Large Title → Inline Title_); compactar a barra inferior em 1 linha inteligente em telas baixas/_landscape_; sincronizar `meta[name="theme-color"]` dinamicamente para `#0b0c0e` ao entrar no Show Mode; substituir `<SunMedium>` por ícone tipográfico (`Type` / `100%`).
7. **Componentes compartilhados:** `Button`, `SongSheet`, `ChordDiagram`.

---

#### 11. Ajustes, Backup, Nuvem / Autenticação e PWA (`SettingsPage`, `BackupPanel`, `InstallHelp`, `CloudPage`, `UpdateNotice`, `ErrorBoundary`)

1. **Estrutura atual:** `PageHeader` (`title="Preferências"`) + 3 seções agrupadas (`Dados` com `Versão e armazenamento` + `BackupPanel`; `Instalação` com `InstallHelp`; `Nuvem e conta` com `CloudPage` contendo status, login Google OAuth, OTP de 6 dígitos, Magic Link, sincronização manual, resolução de `account-mismatch` e logout).
2. **Hierarquia visual:** É a tela que mais se aproxima estruturalmente do padrão _iOS Inset Grouped Settings_ (graças ao agrupamento em `.cards` da Etapa 21), mas sofre com micro-desalinhamentos internos.
3. **Problemas de consistência:**
   - Navegação diz **"Ajustes"**, título da página diz **"Preferências"**.
   - **Falta seletor de aparência/tema (`Automático / Claro / Escuro`)**: `tokens.css` já possui seletores `[data-theme='light']` e `[data-theme='dark']`, mas o usuário não tem controle algum na tela de Ajustes!
   - Em `BackupPanel`, `"Exportar biblioteca"` é centralizado, enquanto `"Selecionar backup"` (`.filePicker`) não tem `justify-content: center` e alinha-se à esquerda.
   - Em `InstallHelp`: usa o ícone Android `<Share2>` (três pontos conectados) em vez do ícone Apple `<Share>` (quadrado com seta para cima) ao explicar o menu Compartilhar do Safari; e `<p className={styles.note}>` dentro de `<details>` não possui `padding` horizontal nem inferior, encostando na borda da caixa!
   - Em `CloudPage`: estado `error` usa `<Badge tone="warning">` (amarelo/âmbar) por falta de `tone="danger"` em `Badge`; botão `"Sair da conta"` usa `ghost` neutro sem indicação destrutiva sutil; o input de OTP (`000000`) é uma caixa comum de largura total sem espaçamento tipográfico (`letter-spacing` / `tabular-nums`) de código de verificação.
4. **Problemas de usabilidade:** Confirmação de restauração com conflitos usa `window.confirm`. `UpdateNotice` (atualização PWA) não possui botão de dispensar (`"Depois"`), ficando preso sobre o conteúdo até atualizar.
5. **Problemas de responsividade:** Em `<= 560px`, `.statusHeader` em `CloudPage` empilha verticalmente rótulo e badge sem necessidade (cabem lado a lado até em `320 px`!).
6. **Oportunidades de refinamento:** Unificar nome para **"Ajustes"**; adicionar cartão **"Aparência"** com _Segmented Control_ estilo iOS (`Sistema | Claro | Escuro`); alinhar `.filePicker`; corrigir padding e ícone `<Share>` do Safari em `InstallHelp`; refinar campo OTP com fonte monoespaçada centralizada; adicionar `tone="danger"` ao `Badge` e opção `"Depois"` ao `UpdateNotice`.
7. **Componentes compartilhados:** `PageHeader`, `SettingsCard`, `Button`, `Badge`, `InstallHelp`.

---

### B.3. Matriz transversal de estados intermediários

| Estado                           | Situação atual encontrada no código                                                                                                                                                                                              | Avaliação frente ao padrão Apple / iOS                                                                                                                                                                                    |
| :------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Vazio inicial (`EmptyState`)** | Usado em Biblioteca, Favoritos e Repertórios (`border: 1px dashed`, alinhado à esquerda, sem CTA direto dentro do card). No Editor de Repertório usa `.emptyOrder` próprio.                                                      | Borda tracejada remete a _dropzone_ de upload/wireframe, não a estado vazio iOS. Falta botão de ação primária direto no estado vazio (ex.: `"Importar primeira música"`).                                                 |
| **Vazio de busca/filtro**        | Parágrafos simples `<p className={styles.feedback}>` sem ícone e sem botão `"Limpar busca"` / `"Mostrar todas"`.                                                                                                                 | Cru demais; exige que o usuário volte manualmente ao input para apagar o texto.                                                                                                                                           |
| **Carregamento (`loading`)**     | Texto puro (`"Carregando biblioteca…"`, `"Abrindo música…"`, `"Abrindo modo show…"`), sem transição suave.                                                                                                                       | Como a leitura local via IndexedDB é rápida (< 50ms), um texto piscando pode causar _layout shift_ (flash de texto antes da lista).                                                                                       |
| **Erro (`error` / `alert`)**     | Varia entre caixas com borda vermelha (`LibraryPage`, `ImportSongPage`), caixas sem borda (`SongEditorPage`, `RepertoryEditorPage`) e texto vermelho sem fundo (`CloudPage`).                                                    | Três tratamentos visuais distintos para o mesmo papel semântico.                                                                                                                                                          |
| **Sucesso / Feedback pós-ação**  | Varia entre botão verde dispensável (`LibraryPage`), toast fixo no canto (`SongViewPage`), bloco estático verde (`RepertoriesPage`, `SongEditorPage`, `BackupPanel`) e texto simples (`CloudPage`).                              | Forte inconsistência: salvar na edição mostra bloco no final da página; salvar tom mostra toast flutuante; importar mostra faixa clicável na Biblioteca.                                                                  |
| **Desabilitado (`disabled`)**    | `Button:disabled { opacity: 0.5 }`; `.navButton:disabled { opacity: 0.32 }`; `.itemActions button:disabled { opacity: 0.35 }`; inputs nativos sem estilo `:disabled` explícito em `global.css`.                                  | Opacidades divergentes (`0.32`, `0.35`, `0.40`, `0.50`) e botões primários âmbar com `opacity: 0.5` sobre fundo claro ficam com aspecto barrento/esmaecido em vez de superfície neutra inativa estilo iOS (`systemFill`). |
| **Foco, Hover e Active**         | Foco global `:focus-visible` bem definido (`--color-focus`), inputs com `--focus-ring`. Porém apenas `Button` e FAB têm `:active` tátil (`translateY(1px)`); itens de lista, cards e ícones não têm feedback `:active` ao toque! | Em telas touch (onde `:hover` não existe), tocar num `SongCard`, num repertório ou num botão de ação não produz resposta imediata de pressionamento (_highlight/scale_).                                                  |

---

## C. Problemas encontrados (Catálogo técnico priorizado)

### P01 — Corte horizontal de letras e cifras no mobile e conflito com gesto de swipe no Modo Show

- **Arquivo e componente:** [SongSheet.module.css](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/songs/SongSheet.module.css#L1-L43), [ShowModePage.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/show-mode/ShowModePage.tsx#L322-L342)
- **Evidência:** `.musicLine` define `min-width: max-content` e `.chords, .lyric` usam `white-space: pre` dentro de `.sheet { overflow-x: auto }`. Nas capturas mobile (`390 px`) e em `343 px`, versos normais como _"Numa folha qualquer eu desenho um sol amarelo"_ cortam na borda direita. No `ShowModePage`, `handleReadingTouchEnd` troca de música quando `Math.abs(dx) > 64 && Math.abs(dx) > Math.abs(dy) * 1.35`.
- **Impacto visual ou funcional:** Impede ler o final dos versos/acordes no celular sem rolar horizontalmente; no Modo Show, tentar arrastar a cifra horizontalmente pode pular para outra música no meio da apresentação.
- **Gravidade:** **Crítica**
- **Recomendação:** Implementar quebra sincronizada de linha musical por colunas/palavras (fatiando o par `acordes + letra` no mesmo índice de coluna para caber na largura disponível sem perder o alinhamento harmônico) ou ajuste automático de escala em viewports estreitas, além de ignorar o swipe de troca de música quando o toque ocorrer sobre região com overflow horizontal ativo.

---

### P02 — Diagrama de acorde abre fora da tela após rolagem no Modo Show e desloca a cifra

- **Arquivo e componente:** [ShowModePage.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/show-mode/ShowModePage.tsx#L563-L569)
- **Evidência:** `<ChordDiagram>` é renderizado diretamente no fluxo do documento antes de `<div className={styles.reading}>`, sem overlay fixo.
- **Impacto visual ou funcional:** Se o músico tiver rolado a página para ler o 2º refrão e tocar num acorde, o diagrama é montado lá no topo da página (invisível fora da viewport) e toda a letra dá um salto brusco para baixo.
- **Gravidade:** **Crítica**
- **Recomendação:** Renderizar o diagrama no Modo Show em camada flutuante fixa ancorada na viewport (reutilizando o padrão corrigido de `ChordDiagramOverlay` adaptado aos tokens `--color-stage-*`), sem deslocar o scroll da música.

---

### P03 — Falha de `pointer-events` e escurecimento excessivo em `ChordDiagramOverlay`

- **Arquivo e componente:** [ChordDiagramOverlay.module.css](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/components/music/ChordDiagramOverlay.module.css#L13-L43), [ChordDiagramOverlay.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/components/music/ChordDiagramOverlay.tsx#L22-L29)
- **Evidência:** `.dialog` e `.dialog > aside` declaram `pointer-events: none` (apenas `.dialog button` tem `pointer-events: auto`). Qualquer toque no interior do card (no SVG do acorde ou nos textos) atravessa o diálogo, atinge o elemento de fundo e dispara `onClose()` no listener global `pointerdown` (ou aciona outro acorde que esteja atrás do card). Simultaneamente, `.backdrop` aplica `--color-overlay` (`62%` de preto no tema escuro) na tela inteira.
- **Impacto visual ou funcional:** Fechamento acidental constante ao interagir com o card do acorde e impossibilidade de continuar lendo a letra/cifra enquanto o diagrama está aberto no tema escuro.
- **Gravidade:** **Alta**
- **Recomendação:** Definir `pointer-events: auto` em `.dialog` (mantendo `pointer-events: none` apenas no wrapper `.overlay` quando não-modal) e remover/suavizar drasticamente o backdrop escuro para que o diagrama funcione como um _inspector popover/sheet_ flutuante estilo iOS que preserva a legibilidade da cifra ao fundo.

---

### P04 — Arquitetura de navegação mobile anti-iOS (Hambúrguer + FAB + Abas duplicadas + `BottomNav` morto)

- **Arquivo e componente:** [Topbar.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/components/layout/Topbar.tsx), [MobileNavMenu.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/components/layout/MobileNavMenu.tsx), [BottomNav.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/components/layout/BottomNav.tsx), [LibraryTabs.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/library/LibraryTabs.tsx), [LibraryActionMenu.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/library/LibraryActionMenu.tsx)
- **Evidência:** Navegação móvel oculta em botão hambúrguer superior esquerdo; `BottomNav.tsx` sem nenhuma importação no projeto; `LibraryTabs` repete `Músicas | Repertórios` abaixo do título; `LibraryActionMenu` usa FAB Material Design no canto inferior direito; `Topbar` exibe `"BIBLIOTECA LOCAL"` fixo em todas as rotas desktop e badge `"Online"` permanente.
- **Impacto visual ou funcional:** Aparência de painel web/Android híbrido; exige 2 toques no topo da tela para trocar de seção no iPhone; poluição visual permanente no cabeçalho.
- **Gravidade:** **Alta**
- **Recomendação:** Reativar e refinar a _Tab Bar_ inferior estilo iOS (`Biblioteca`, `Repertórios`, `Favoritos`, `Ajustes`) com superfície translúcida (`backdrop-filter`) e _safe-area_, remover `MobileNavMenu` e `LibraryTabs`, substituir o FAB por ação `+` limpa no cabeçalho da Biblioteca e exibir indicador de conexão apenas quando relevante (ex.: modo offline ou sincronizando).

---

### P05 — Excesso de barras empilhadas em `SongViewPage` e botão `"Salvar"` primário permanentemente ativo

- **Arquivo e componente:** [SongViewPage.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/library/SongViewPage.tsx#L203-L411), [SongViewPage.module.css](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/library/SongViewPage.module.css#L112-L250)
- **Evidência:** A tela empilha `Topbar` + `.back` + `.header` + `.toolbar` (tom + opções com ícone `Menu` hambúrguer) + `.autoScroll` + `.meta` antes de `<SongSheet>`. O botão `Salvar` (`variant="primary"`) fica habilitado e destacado em âmbar sólido mesmo quando `manualShift === null` (nenhuma alteração feita).
- **Impacto visual ou funcional:** Mais da metade da tela vertical de um iPhone é ocupada por controles antes do primeiro acorde; o botão `Salvar` sugere falsamente que há alterações pendentes.
- **Gravidade:** **Alta**
- **Recomendação:** Compactar a barra de ferramentas da música numa faixa unificada estilo iOS; exibir o botão `"Salvar tom"` apenas quando houver transposição não salva (`manualShift !== null`); trocar o ícone `Menu` de opções de leitura por ícone semântico (`SlidersHorizontal` ou `Guitar`).

---

### P06 — Fragmentação de confirmações (`window.confirm`) e ausência de variante destrutiva (`danger`) em `Button` e `Badge`

- **Arquivo e componente:** [App.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/app/App.tsx#L45), [LibraryPage.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/library/LibraryPage.tsx#L43), [FavoritesPage.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/favorites/FavoritesPage.tsx#L25), [RepertoryEditorPage.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/repertories/RepertoryEditorPage.tsx#L151), [BackupPanel.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/settings/BackupPanel.tsx#L115), [RepertoriesPage.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/repertories/RepertoriesPage.tsx#L317-L323), [Button.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/components/ui/Button.tsx), [Badge.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/components/ui/Badge.tsx), [CloudPage.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/settings/CloudPage.tsx#L26-L31)
- **Evidência:** Cinco fluxos usam `window.confirm()` nativo; `RepertoriesPage` usa confirmação inline cujo botão `"Excluir"` é `variant="primary"` (âmbar); `CloudPage` mapeia `status === 'error'` para `tone="warning"` porque `Badge` não suporta `danger`.
- **Impacto visual ou funcional:** Quebra abrupta da experiência visual em PWA instalada; risco de erro cognitivo por falta de vermelho semântico em ações destrutivas.
- **Gravidade:** **Alta**
- **Recomendação:** Adicionar `variant="danger"` (e `danger-soft`) ao `Button`, adicionar `tone="danger"` ao `Badge` e criar um componente leve e acessível `ConfirmDialog` (estilo alerta/action sheet iOS) substituindo todos os `window.confirm`.

---

### P07 — Tipografia de interface (`Bricolage Grotesque`) incompatível com a estética Apple / iOS

- **Arquivo e componente:** [tokens.css](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/styles/tokens.css#L4-L6), [fonts.css](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/styles/fonts.css#L1-L7)
- **Evidência:** `--font-sans` prioriza `'Bricolage Grotesque'` (fonte variável display com terminais estilizados) para 100% da interface, além de usar peso não-padrão `--weight-medium: 520` e tracking apertado `-0.04em` até em títulos curtos.
- **Impacto visual ou funcional:** Confere aparência de template editorial web em vez de aplicativo nativo Apple, além de carregar um arquivo `.woff2` extra quando dispositivos Apple já possuem `SF Pro` nativamente.
- **Gravidade:** **Alta**
- **Recomendação:** Definir `--font-sans: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', system-ui, 'Segoe UI', Roboto, sans-serif`, ajustar pesos para `400 / 500 / 600 / 700` e manter `JetBrains Mono` dedicada à cifra (`SongSheet`), acordes e indicadores numéricos/tabulares.

---

### P08 — Tema claro com aspecto sépia/envelhecido, baixa separação de elevação no tema escuro e ausência de seletor de tema

- **Arquivo e componente:** [tokens.css](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/styles/tokens.css#L51-L167), [SettingsPage.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/settings/SettingsPage.tsx)
- **Evidência:**
  - No tema claro, `--color-bg: #f5f2ea` + `--color-accent: #9a6414` gera aparência ocre/envelhecida nos botões primários e superfícies.
  - No tema escuro, `--color-surface` (`#141518`) e `--color-surface-raised` (`#191b1f`) diferem em apenas ~5 unidades RGB, tornando camadas elevadas dependentes de bordas em vez de luminância.
  - `tokens.css` implementa `:root[data-theme='dark']` e `:root:not([data-theme='light'])` (com 29 linhas duplicadas entre os dois blocos), mas não existe seletor de tema na interface, nem atualização dinâmica de `<meta name="theme-color">`.
- **Impacto visual ou funcional:** O tema claro não transmite a limpeza e precisão do iOS; o usuário não consegue escolher usar o app sempre no modo escuro (muito comum entre músicos) sem alterar o ajuste global do celular inteiro.
- **Gravidade:** **Alta**
- **Recomendação:** Refinar os tokens do tema claro para neutros luminosos estilo iOS com âmbar mais limpo e vibrante; ampliar o degrau de luminância entre superfícies no tema escuro; eliminar a duplicação em `tokens.css`; adicionar controle `Sistema | Claro | Escuro` em Ajustes sincronizado com `meta[name="theme-color"]`.

---

### P09 — Áreas de toque inferiores a `44 × 44 px` em controles frequentes

- **Arquivo e componente:** [RepertoryOrderPanel.module.css](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/repertories/RepertoryOrderPanel.module.css#L128-L147), [SongViewPage.module.css](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/library/SongViewPage.module.css#L132-L245), [ShowModePage.module.css](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/show-mode/ShowModePage.module.css#L247-L259), [ChordDiagram.module.css](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/components/music/ChordDiagram.module.css#L75-L90), [AddSongsDialog.module.css](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/repertories/AddSongsDialog.module.css#L48-L60), [SongSheet.module.css](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/songs/SongSheet.module.css#L54-L69)
- **Evidência:**
  - `.toneChip`: `min-height: 1.5rem` (`24 px`)
  - `RepertoryOrderPanel .itemActions button`: `1.85rem`–`2rem` (`29.6 px`–`32 px`)
  - `SongViewPage .scrollStep` / `ShowModePage .speedStep` / `AddSongsDialog .close` / `ToneEditor input`: `2rem` (`32 px`)
  - `ChordDiagram .iconButton, .navButton` / `SongViewPage .stepButton, .scrollToggle, .back`: `2.25rem` (`36 px`)
  - `SongSheet .chordButton`: inline `~21 px` sem área expandida de toque.
- **Impacto visual ou funcional:** Erros de toque frequentes em celular e iPad, especialmente graves durante ensaios e apresentações ao vivo.
- **Gravidade:** **Alta**
- **Recomendação:** Garantir área clicável mínima de `2.75rem` (`44 px`) em todos os controles primários/touch (usando `min-height: var(--control-height-md)` ou área de hit expandida via `::after` onde o elemento visual precisar permanecer compacto, como em `.chordButton` e `.toneChip`).

---

### P10 — `SongCard` esconde o Tom no mobile, expõe `Excluir` em toque e repete ícone decorativo

- **Arquivo e componente:** [SongCard.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/library/SongCard.tsx), [SongCard.module.css](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/library/SongCard.module.css#L116-L141)
- **Evidência:** `@media (max-width: 520px) { .key { display: none; } }`, enquanto `.icon` (`Music2`) e `.delete` (`Trash2`, visível em `pointer: coarse`) permanecem em todas as linhas.
- **Impacto visual ou funcional:** O dado musical mais útil na listagem (o Tom da música) some no iPhone, enquanto um botão destrutivo de lixeira ocupa espaço nobre em cada item.
- **Gravidade:** **Média**
- **Recomendação:** Remover o ícone genérico `Music2` repetido em cada linha, manter sempre visível o badge sutil do Tom à direita e mover a ação `Excluir` para menu de ações da linha (`...`) e/ou gesto complementar de swipe.

---

### P11 — Inconsistências de semântica HTML/ARIA e gerenciamento de foco

- **Arquivo e componente:** [SongSheet.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/songs/SongSheet.tsx#L72), [LibraryActionMenu.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/library/LibraryActionMenu.tsx#L60), [SongViewPage.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/library/SongViewPage.tsx#L238), [MobileNavMenu.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/components/layout/MobileNavMenu.tsx#L76-L105), [ShowModePage.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/show-mode/ShowModePage.tsx#L499)
- **Evidência:**
  1. `<main>` em `SongSheet` fica aninhado dentro de `<main id="main-content">` do `AppShell` na `SongViewPage`.
  2. `LibraryActionMenu` usa `role="menu"` / `menuitem` sem suporte às teclas `ArrowDown` / `ArrowUp` / `Home` / `End`.
  3. `SongViewPage` usa `aria-haspopup="menu"` para um container sem `role="menu"` que aninha um `role="dialog"` (`RepertoryPicker`).
  4. `ShowModePage` possui `<label htmlFor="show-font-size">` órfão (sem input correspondente).
- **Impacto visual ou funcional:** Navegação degradada com teclado e leitores de tela (VoiceOver no iOS/macOS).
- **Gravidade:** **Média**
- **Recomendação:** Trocar a tag raiz de `SongSheet` para `<article>` (deixando `<main>` no `AppShell` e adicionando `<main>` em `ShowModePage`); alinhar papéis ARIA de menus/popovers ou implementar navegação completa por setas; corrigir `htmlFor` órfão em `ShowModePage`.

---

### P12 — Auto-zoom forçado do iOS Safari em campos de formulário com fonte `< 16px`

- **Arquivo e componente:** [AddSongsDialog.module.css](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/repertories/AddSongsDialog.module.css#L103), [RepertoryOrderPanel.module.css](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/repertories/RepertoryOrderPanel.module.css#L192), [ImportSongPage.module.css](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/library/ImportSongPage.module.css#L116), [BatchImportPage.module.css](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/library/BatchImportPage.module.css#L64)
- **Evidência:** Inputs e textareas nesses módulos definem `font-size: var(--text-sm)` (`0.875rem` = `14px`). O WebKit/Safari no iOS aplica zoom automático na página sempre que um campo editável com `font-size < 16px` recebe foco.
- **Impacto visual ou funcional:** Ao tocar na busca de `AddSongsDialog` ou no `ToneEditor` no iPhone, o Safari dá zoom na tela, desloca o modal/sheet lateralmente e não restaura a escala ao fechar o teclado virtual.
- **Gravidade:** **Média**
- **Recomendação:** Garantir `font-size: max(1rem, ...)` (`>= 16px`) em todos os `input`, `textarea` e `select` em viewports touch/mobile.

---

### P13 — Três padrões díspares de seleção de arquivo (`input[type="file"]`) e desalinhamento em `BackupPanel`

- **Arquivo e componente:** [ImportSongPage.module.css](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/library/ImportSongPage.module.css#L136-L155), [BatchImportPage.module.css](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/library/BatchImportPage.module.css#L51-L87), [BackupPanel.module.css](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/settings/BackupPanel.module.css#L19-L45)
- **Evidência:** `BatchImportPage` expõe o controle nativo do browser (`Choose File / No file chosen`); `BackupPanel` usa label estilizado como botão secundário, mas sem `justify-content: center` (ficando alinhado à esquerda logo abaixo de `"Exportar biblioteca"` centralizado); `ImportSongPage` usa um terceiro estilo compacto com texto cinza.
- **Impacto visual ou funcional:** Sensação de telas feitas por equipes diferentes; texto em inglês do navegador em `BatchImportPage`.
- **Gravidade:** **Média**
- **Recomendação:** Padronizar um único componente/classe de gatilho de arquivo alinhado ao componente `Button` (`variant="secondary"`) ou _Upload Dropzone_ limpa em português.

---

### P14 — Inconsistências de nomenclatura, microcopy e ícones semânticos

- **Arquivo e componente:** [FavoritesPage.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/favorites/FavoritesPage.tsx#L75), [SettingsPage.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/settings/SettingsPage.tsx#L22), [InstallHelp.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/components/system/InstallHelp.tsx#L46), [InstallHelp.module.css](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/components/system/InstallHelp.module.css#L46-L48), [ShowModePage.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/show-mode/ShowModePage.tsx#L519), [SongEditorPage.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/library/SongEditorPage.tsx#L395)
- **Evidência:**
  - `FavoritesPage`: diz `"Use a estrela..."`, mas o ícone é um coração (`Heart`).
  - `SettingsPage`: título `"Preferências"` vs item de menu `"Ajustes"`.
  - `InstallHelp`: usa ícone Android `<Share2>` para ensinar instalação no Safari do iOS, e `.note` encosta nas bordas internas de `<details>` por falta de padding horizontal/inferior.
  - `ShowModePage`: usa `<SunMedium>` (brilho) no botão de tamanho da fonte e duplica o título da música no topo.
  - `SongEditorPage`: usa caractere `'＋'` manual em vez de `<Plus>` Lucide.
- **Impacto visual ou funcional:** Reduz a percepção de cuidado artesanal e coerência com o ecossistema Apple.
- **Gravidade:** **Média**
- **Recomendação:** Corrigir todas as copies e ícones listados na revisão de polimento das respectivas telas.

---

### P15 — Detalhes de integração PWA no iOS (Ícone da Tela de Início e barra de status no Modo Show)

- **Arquivo e componente:** [index.html](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/index.html#L12-L18), [public/brand/icon.svg](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/public/brand/icon.svg), `public/brand/icon-192.png`
- **Evidência:** `icon.svg` embute `rx="112"` sobre o fundo, gerando cantos escurecidos em `icon-192.png` quando o iOS aplica sua própria máscara _squircle_ na Tela de Início (além de faltar tamanho `180x180` dedicado para `apple-touch-icon` e a meta padrão `<meta name="mobile-web-app-capable" content="yes">`). Além disso, `theme-color` fica estático em `#f5f2ea` no modo claro mesmo ao abrir o Modo Show (`#0b0c0e`).
- **Impacto visual ou funcional:** Barra de status clara destoando sobre o fundo escuro do Modo Show no iPhone e artefato sutil nos cantos do ícone instalado.
- **Gravidade:** **Baixa**
- **Recomendação:** Gerar `apple-touch-icon` `180×180` quadrado _full-bleed_ sem `rx` pré-recortado, adicionar `mobile-web-app-capable` e sincronizar dinamicamente `meta[name="theme-color"]` conforme tema ativo e rota `show`.

---

### P16 — Código morto, regras CSS obsoletas e duplicação de estilos base entre páginas

- **Arquivo e componente:** [BottomNav.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/components/layout/BottomNav.tsx), [App.module.css](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/app/App.module.css#L1-L5), [LibraryPage.module.css](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/library/LibraryPage.module.css#L55-L75), [RepertoriesPage.module.css](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/repertories/RepertoriesPage.module.css#L12-L29), [BatchImportPage.module.css](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/library/BatchImportPage.module.css#L107-L110), [InstallHelp.module.css](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/components/system/InstallHelp.module.css#L1-L48), [ShowModePage.module.css](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/show-mode/ShowModePage.module.css#L186-L296), [tokens.css](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/styles/tokens.css#L99-L167)
- **Evidência:**
  - `BottomNav.tsx` e `BottomNav.module.css` órfãos.
  - Classes CSS nunca referenciadas: `App.module.css` (`.page`), `LibraryPage.module.css` (`.eyebrow`, `.description`), `RepertoriesPage.module.css` (`.eyebrow`, `.description`), `BatchImportPage.module.css` (`.success`).
  - Seletores duplicados: `.note` em `InstallHelp.module.css`; `.navigation .scrollToggle` e `!important` em `ShowModePage.module.css`; bloco completo de 29 linhas do tema escuro repetido em `tokens.css`.
  - Estilos de `.back`, `.srOnly`, `.search` e inputs/alertas reescritos manualmente em 6+ CSS Modules com ligeiras divergências (`min-height: 2.25rem` vs `2.75rem`, `padding: var(--space-3)` vs `var(--space-4)`).
- **Impacto visual ou funcional:** Divergências sutis de altura/espaçamento entre páginas e maior custo de manutenção.
- **Gravidade:** **Baixa**
- **Recomendação:** Consolidar utilitários/primitivos visuais durante a revisão do design system e limpar regras órfãs à medida que cada módulo for refinado.

---

## D. Auditoria do Design System e Temas (Claro, Escuro e Palco)

A fonte da verdade atual está concentrada em [tokens.css](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/styles/tokens.css) e [global.css](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/styles/global.css). **Ponto forte importante:** não existem cores hexadecimais ou `rgb()` espalhadas nos CSS Modules de componentes — tudo já consome variáveis CSS. Isso permite evoluir a identidade visual com altíssima segurança arquitetural.

### D.1. Cores e Temas (Avaliação separada)

#### Tema Claro atual vs Direção Apple / iOS

| Papel                            | Token existente                         | Valor atual                       | Diagnóstico do Tema Claro                                                                                                                                                  |
| :------------------------------- | :-------------------------------------- | :-------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fundo principal                  | `--color-bg`                            | `#f5f2ea`                         | Bege/pergaminho muito quente; somado às superfícies creme, cria aspecto sépia/envelhecido.                                                                                 |
| Superfície secundária            | `--color-surface`                       | `#fbf9f4`                         | Pouco contraste com `#f5f2ea` e `#ffffff`; agrupamentos perdem definição limpa sem borda.                                                                                  |
| Superfície elevada               | `--color-surface-raised`                | `#ffffff`                         | Adequado, mas hoje usado dentro de `.surface` sobre `.bg`, gerando 3 tons de creme simultâneos.                                                                            |
| Superfície suave / interativa    | `--color-surface-muted` / `interactive` | `#eeeadf` / `#f1ebdd`             | Tom areia perceptivelmente amarelado em botões e estados ativos.                                                                                                           |
| Texto (principal / sec. / sutil) | `--color-text` / `muted` / `subtle`     | `#202320` / `#5f635d` / `#6c7069` | Bom contraste WCAG AA (`14.19:1` a `4.51:1`), porém `muted` (`#5f635d`) e `subtle` (`#6c7069`) são **quase idênticos**!                                                    |
| Bordas e divisores               | `--color-border` / `border-strong`      | `#e4ded1` / `#cdc4b2`             | Sólidas e terrosas; em listas e inputs parecem pesadas em comparação aos separadores translúcidos do iOS.                                                                  |
| Destaque (Accent)                | `--color-accent`                        | `#9a6414`                         | **Principal problema cromático do tema claro:** para obter contraste com texto claro, o âmbar foi escurecido para um marrom-ocre fechado, perdendo vivacidade e elegância. |
| Semânticas                       | `success` / `warning` / `danger`        | `#2f6f52` / `#7d5410` / `#a83f36` | Funcionais e legíveis, porém falta token de texto/contraste para botão destrutivo sólido.                                                                                  |

**Diretriz para o Tema Claro:** Evoluir de "pergaminho sépia" para **Alabastro Musical iOS**: fundo agrupado neutro-quente sutil (`#F4F4F6` ou `#F5F5F7`), cartões agrupados em branco puro (`#FFFFFF`), preenchimentos interativos translúcidos suaves (`rgba(120, 120, 128, 0.10)`), separadores _hairline_ discretos, diferenciação real entre `text-muted` e `text-subtle`, e um tom de destaque âmbar/cobre ou dourado-escuro mais nítido (ou grafite profundo em botões primários com âmbar nos acentos musicais/ativos, garantindo contraste impecável sem aspecto marrom).

#### Tema Escuro atual vs Direção Apple / iOS

| Papel                                                        | Token existente    | Valor atual                                   | Diagnóstico do Tema Escuro                                                                                                                                              |
| :----------------------------------------------------------- | :----------------- | :-------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fundo principal                                              | `--color-bg`       | `#0d0e10`                                     | Excelente grafite quase-preto confortável em ambientes pouco iluminados.                                                                                                |
| Superfícies (`surface` / `raised` / `muted` / `interactive`) | `--color-surface*` | `#141518` / `#191b1f` / `#1f2126` / `#24262c` | **Escala comprimida demais na base:** `#141518` e `#191b1f` são quase indistinguíveis a olho nu, obrigando o uso de `border` explícita para separar diálogos e cartões. |
| Texto (`text` / `muted` / `subtle`)                          | `--color-text*`    | `#f3eee4` / `#a9a6a0` / `#7f827f`             | Muito equilibrado: branco levemente quente que evita ofuscamento (halation) sobre fundo escuro, com hierarquia clara entre os 3 níveis!                                 |
| Destaque (Accent)                                            | `--color-accent`   | `#d7a24a`                                     | Muito bem calibrado no escuro — remete a cordas de bronze/madeira de violão e instrumentos de estúdio Apple (_Logic Pro_).                                              |
| Overlay                                                      | `--color-overlay`  | `rgb(0 0 0 / 62%)`                            | Adequado para diálogos modais reais (`AddSongsDialog`), mas escuro demais para painéis de consulta rápida como `ChordDiagramOverlay`.                                   |

**Diretriz para o Tema Escuro:** Preservar a identidade grafite + off-white + âmbar dourado, ampliando sutilmente os degraus de elevação das superfícies (`#0B0C0E` → `#15171B` → `#1E2026` → `#282B33`) para que _sheets_, menus e barras translúcidas tenham profundidade própria estilo iOS Dark Mode sem depender de contornos rígidos.

#### Paleta de Palco (`--color-stage-*` no Modo Show)

- **Avaliação:** Decisão arquitetural correta manter tokens independentes (`--color-stage-*`) para garantir leitura escura de alto contraste no palco mesmo que o usuário use o app no tema claro durante o dia. Deve apenas herdar os mesmos refinamentos de alvos de toque, tipografia e translucidez das barras.

---

### D.2. Tipografia

- **Escala existente em `tokens.css`:**
  - `--text-2xs` (`11px`), `--text-xs` (`12px`), `--text-sm` (`14px`), `--text-base` (`16px`), `--text-lg` (`17px` — exatamente o tamanho padrão `Body` do iOS!), `--text-xl` (`22px` — `Title 2` iOS), `--text-2xl` (`28px` — `Title 1` iOS), `--text-3xl` (`32px–44px` — `Large Title` iOS).
- **Diagnóstico:** A escala de tamanhos **já coincide surpreendentemente bem com a escala tipográfica das Apple HIG (`11, 12, 14/15, 16/17, 22, 28, 34 pt`)!** O problema não está nos tokens de tamanho, e sim em:
  1. Uso de `Bricolage Grotesque` em vez da fonte nativa do sistema (`SF Pro`).
  2. Uso excessivo de `--text-3xl` (`até 44px`) com `eyebrow` em caixa alta espaçada (`0.16em`) em subpáginas internas (`ImportSongPage`, `BatchImportPage`, `SongEditorPage`), onde o padrão iOS usa títulos internos compactos (`17px–22px`) e reserva _Large Title_ (`28px–34px`) para as raízes das abas principais (`Biblioteca`, `Repertórios`, `Favoritos`, `Ajustes`).
  3. Uso de `14px` (`--text-sm`) em campos de entrada mobile, disparando zoom automático no Safari.

---

### D.3. Espaçamento e Densidade

- **Escala existente:** `--space-1` (`4px`) até `--space-12` (`48px`) em múltiplos limpos de `4px`. **Excelente base — nenhum token novo de espaçamento é necessário.**
- **Problemas de aplicação:**
  - Padding acumulado em telas mobile: `AppShell .content` (`20px`) + container `.form`/`.panel` (`20px`) consome `80px` horizontais em uma tela de `343px`, restando apenas `263px` úteis. No iOS, grupos e folhas em `<= 390px` usam margens laterais enxutas (`16px` = `--space-4`).
  - Densidade irregular nas listas: `SongCard` tem bom respiro vertical (`12px`), enquanto `RepertoryOrderPanel` espreme 6 controles em `padding: 8px 0`.

---

### D.4. Raios, Controles, Elevação e Ícones

- **Raios (`--radius-sm: 5px`, `md: 8px`, `lg: 12px`, `xl: 16px`, `full: 999px`):** Escala sólida e contida; falta apenas garantir consistência concêntrica (quando um container externo usa `radius-xl: 16px` com `padding: 8px`, os itens internos devem usar `radius-md: 8px`–`10px`).
- **Alturas de controles (`--control-height-sm: 40px`, `md: 44px`, `lg: 52px`):** Os tokens existem em `tokens.css`, mas **são ignorados em vários CSS Modules** que usam valores literais (`1.5rem`, `2rem`, `2.25rem`, `2.6rem`). Consolidar o uso de `--control-height-md` (`44px`) resolverá a maior parte dos problemas de toque sem criar novos tokens.
- **Ícones (`lucide-react`):** Biblioteca limpa e consistente, porém os componentes misturam `strokeWidth` (`1.8`, `2`, `2.2` e padrão `2`) e tamanhos arbitrários (`14, 15, 16, 17, 18, 19, 20, 21, 22, 24`). Padronizar `strokeWidth={1.75}` ou `1.8` para ícones de navegação/lista e uma escala enxuta (`16px` inline, `18–20px` controles/barras, `24px` destaque) trará precisão óptica estilo _SF Symbols_.

---

## E. Responsividade, dispositivos e ergonomia de palco

### E.1. Diagnóstico por largura de viewport

| Largura      | Contexto típico                             | Problemas verificados na estrutura atual                                                                                                                                                                                                                                                  |
| :----------- | :------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **343 px**   | iPhone compacto / Zoom de tela / Split View | Corte severo em letras/cifras (`SongSheet`); truncamento do placeholder da busca (`"Pesquisar por título, a..."`); aperto crítico em `RepertoryOrderPanel` (`29.6px` nos botões de ação) e em `SongLineEditor` (`.chordRow`); padding duplo em formulários deixa apenas `263px` internos. |
| **390 px**   | iPhone 13 / 14 / 15 / 16 (Portrait)         | Placeholder da Biblioteca truncado em `"ou t"`; Tom oculto nos `SongCard`; >55% da altura útil tomada por cabeçalhos em `SongViewPage` e `RepertoriesPage`; corte horizontal em versos musicais comuns (~45 colunas); auto-zoom do Safari ao focar inputs de `14px`.                      |
| **768 px**   | iPad Mini / iPad (Portrait)                 | **Zona híbrida inconsistente:** como `768px <= 860px`, o iPad em retrato perde a `Sidebar` e cai no menu hambúrguer mobile, mas `ChordDiagramOverlay` (`>= 761px`) e `ShowModePage .navigation` (`>= 760px`) já assumem modo desktop!                                                     |
| **1024 px**  | iPad (Landscape) / Notebooks compactos      | Layout com `Sidebar` funciona bem, mas `Topbar` consome `64px` verticais sem função real; em iPhone Pro Max em _landscape_ (`932px > 860px`), entra a `Sidebar` sem respeitar `env(safe-area-inset-left)` da _Dynamic Island_.                                                            |
| **1280 px+** | Desktop e monitores grandes                 | Conteúdo centraliza em `74rem` (`1184px`), porém o FAB (`LibraryActionMenu`) fica preso no canto extremo da janela (desconectado da lista), e a `Topbar` estica de ponta a ponta apenas com `"BIBLIOTECA LOCAL"` e `"Online"`.                                                            |

_(Observação técnica: hoje existem **11 breakpoints distintos** espalhados nos CSS Modules: `420, 480, 520, 560, 600, 640, 650, 700, 760/761, 860/861 px`. Recomenda-se convergir gradualmente para 3 referências claras: Compact Phone `<= 480px`, Mobile/Portrait `<= 768px`, Desktop/Tablet Wide `> 768px`)._

---

### E.2. Contextos específicos Apple / Safari / PWA / Palco

1. **Safari e Teclado Virtual no iOS:**
   - Campos com `font-size: 14px` causam zoom involuntário ao abrir o teclado virtual em `AddSongsDialog`, `ToneEditor` e `ImportSongPage`.
   - Em `AddSongsDialog` (mobile bottom sheet `max-height: 88dvh`), abrir o teclado virtual reduz a `visualViewport`, espremendo a lista `.list` se o cabeçalho e o rodapé de 2 andares ocuparem espaço excessivo.
2. **Safe Areas e PWA instalada (`standalone`):**
   - `AppShell.module.css` usa `padding-bottom: env(safe-area-inset-bottom)` puro no mobile, deixando `0px` de respiro em aparelhos sem barra Home gestual.
   - `Sidebar` não aplica `padding-left: max(..., env(safe-area-inset-left))` para telas com recorte lateral em paisagem.
   - `meta[name="theme-color"]` não acompanha dinamicamente a entrada no Modo Show quando o aparelho está em tema claro.
3. **Orientação Paisagem (_Landscape_) no Modo Show:**
   - Músicos frequentemente apoiam o celular ou iPad na horizontal no suporte do pedestal. Em um iPhone em paisagem (`~844 × 390 px`), a `.topbar` sticky + `.navigation` inferior de 2 linhas roubam quase metade da tela vertical, restando pouquíssimas linhas de cifra visíveis por vez.

---

## F. Oportunidades de melhoria (Alto, Médio e Baixo impacto)

### Alto Impacto (Transformam imediatamente a percepção de produto e o uso musical)

1. **Fundação tipográfica e cromática Apple / iOS:** Adotar `SF Pro / system-ui` na interface (mantendo `JetBrains Mono` nas cifras), refinar a paleta clara para superfícies neutras luminosas, calibrar degraus de elevação no escuro e incluir seletor de tema (`Sistema | Claro | Escuro`) em Ajustes.
2. **Navegação iOS autêntica:** Substituir o menu hambúrguer superior + `LibraryTabs` + FAB Material Design por _Tab Bar_ inferior translúcida no mobile (`<= 768px`), cabeçalhos limpos estilo _Large Title_ nas raízes e ações contextuais `+` no topo.
3. **Leitura de cifras sem corte horizontal e diagramas impecáveis:** Resolver o corte horizontal de `SongSheet` em telas estreitas, corrigir o posicionamento do diagrama no Modo Show (em camada flutuante visível em qualquer scroll) e corrigir `pointer-events` + transparência do `ChordDiagramOverlay`.
4. **Desobstrução da tela da música (`SongViewPage`) e do Modo Show (`ShowModePage`):** Unificar controles de tom/rolagem/opções numa barra compacta, exibir `"Salvar tom"` apenas quando houver mudança pendente e otimizar a altura útil em retrato e paisagem.

### Médio Impacto (Consistência de interação, ergonomia de toque e polimento UX)

5. **Sistema unificado de Sheets, Popovers e Confirmações:** Eliminar os 5 usos de `window.confirm()`, introduzir variantes `danger` em `Button` e `Badge`, e padronizar menus contextuais e _Bottom Sheets_ com animação suave estilo iOS e respeito a `prefers-reduced-motion`.
6. **Refinamento de listas (`SongCard` e `RepertoriesPage`):** Exibir sempre o Tom da música no mobile, remover ícones decorativos repetitivos por linha, recolher criação de repertório sob demanda (`+`) e organizar ações secundárias/destrutivas em menu contextual (`...`) com alvos `>= 44px`.
7. **Prevenção de auto-zoom no Safari e unificação de formulários/upload:** Garantir `font-size >= 16px` em todos os campos editáveis mobile e padronizar os 3 seletores de arquivo (`ImportSongPage`, `BatchImportPage`, `BackupPanel`).

### Baixo Impacto (Higiene técnica, semântica fina e detalhes de acabamento)

8. **Correções semânticas, copies e ícones:** Desaninhar `<main>` em `SongSheet`, corrigir `"estrela"` → `"coração"` em Favoritos, unificar `"Ajustes"`, usar ícone `<Share>` da Apple em `InstallHelp`, trocar `<SunMedium>` no ajuste de fonte do Show Mode e estilizar campos `readOnly`.
9. **Integração PWA e limpeza de CSS:** Ícone `apple-touch-icon` `180×180` _full-bleed_, sincronização dinâmica de `theme-color`, remoção de código morto (`BottomNav` legado ou sua substituição limpa, classes CSS órfãs e duplicação em `tokens.css`).

---

## G. Avaliação de componentes externos (UIArc)

Os três componentes da biblioteca **Arc UI (`uiarc.dev` — `@uiarc/swipe-actions`, `@uiarc/bottom-sheet`, `@uiarc/reorderable-list`)** foram avaliados tecnicamente frente à arquitetura atual do Meu Repertório V2 (`React 19 + TypeScript strict + CSS Modules + zero runtime de animação`).

> **Contexto técnico comum do UIArc:** Embora os componentes do UIArc utilizem CSS Modules (sem exigir Tailwind CSS), sua instalação via registro `shadcn` requer o pacote base `@uiarc/arc-foundation` (`foundation.css` + `arc-motion-tokens`) — criando um **segundo sistema paralelo de design tokens** — e exige a biblioteca **`motion`** (`framer-motion`, ~34–40 kB min+gzip), hoje inexistente no bundle enxuto do aplicativo.

---

### G.1. Swipe Actions (`@uiarc/swipe-actions`)

| Critério                                        | Avaliação comparativa                                                                                                                                                                 |
| :---------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1. Componente existente**                     | Não existe gesto de swipe em linhas de lista hoje; `SongCard` e `RepertoriesPage` exibem botões de ícone diretamente na linha.                                                        |
| **2. Solução externa (`@uiarc/swipe-actions`)** | Revela ações laterais por arrasto horizontal com física elástica baseada em `motion`.                                                                                                 |
| **3. Custo de dependências**                    | **Alto para o benefício isolado:** exige adicionar `motion` (~35+ kB gzip) e adaptar/remover `@uiarc/arc-foundation` para não duplicar `tokens.css`.                                  |
| **4. Compatibilidade com o projeto**            | Funciona com React 19 e CSS Modules, mas exige adaptação manual de tokens de cor/raio e cuidado com scroll vertical em listas longas no iOS Safari.                                   |
| **5. Acessibilidade**                           | Ações escondidas apenas atrás de gestos de swipe são inacessíveis por teclado e difíceis no VoiceOver se não houver botão visível equivalente na linha.                               |
| **6. Integração com o comportamento atual**     | Em `SongCard` e `RepertoriesPage`, a ação principal é um `<button>` de abertura rápida; gestos horizontais mal calibrados podem competir com a rolagem vertical rápida da biblioteca. |
| **7. Manutenção futura**                        | Código copiado via CLI acoplado a APIs internas do `motion`.                                                                                                                          |

**Veredito — NÃO INSTALAR `@uiarc/swipe-actions`:** Para resolver a poluição de botões em `SongCard` e `RepertoriesPage` com padrão Apple/iOS e 100% de acessibilidade (mouse, toque e teclado), a solução primária deve ser **botão de menu contextual discreto (`...` / Action Sheet)** mantendo Favoritar/Tom visíveis. Caso deseje-se _swipe-to-delete/favorite_ no touch em etapa futura, é preferível uma implementação interna enxuta baseada em Pointer Events (~60 linhas, 0 kB extras) como melhoria progressiva sobre o menu acessível.

---

### G.2. Bottom Sheet (`@uiarc/bottom-sheet`)

| Critério                                                 | Avaliação comparativa                                                                                                                                                                                                                                                                                                   |
| :------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Componente existente**                              | Existem **3 implementações parciais e diferentes**: `AddSongsDialog` (vira painel inferior em `<= 560px` com focus trap e `lockBodyScroll`, sem animação/grabber), `ShowModePage .trackSheet` (painel inferior com focus trap próprio, sem animação/grabber) e `ChordDiagramOverlay` (painel inferior sem scroll lock). |
| **2. Solução externa (`@uiarc/bottom-sheet` ou `vaul`)** | `@uiarc/bottom-sheet` oferece snap points, drag handle e fecho por gesto via `motion`. Alternativamente, `vaul` (já previsto em `AGENTS.md` §3) foca em drawers estilo iOS, mas depende de `@radix-ui/react-dialog`.                                                                                                    |
| **3. Custo de dependências**                             | `@uiarc/bottom-sheet` puxa `motion` + `arc-foundation`. Já o projeto **já possui** `lockBodyScroll` testado, gerenciamento de foco reentrante (`AddSongsDialog`) e suporte a `dvh` / `safe-area-inset-bottom`.                                                                                                          |
| **4. Compatibilidade com o projeto**                     | Um primitivo interno `<Sheet>` em CSS Modules usa diretamente `src/styles/tokens.css`, funciona 100% offline sem aumentar o bundle e evita conflitos de portal/z-index nos testes existentes de Vitest/Playwright.                                                                                                      |
| **5. Acessibilidade**                                    | A base de `AddSongsDialog` já implementa `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, trap de `Tab`/`Shift+Tab`, `Escape` e restauração de foco — bastando extrair e padronizar esse comportamento.                                                                                                         |
| **6. Integração com o comportamento atual**              | Unifica `AddSongsDialog`, `.trackSheet` do Modo Show, confirmações mobile e menus de ações (`Mais ações` / `Adicionar a repertório`) num único componente consistente.                                                                                                                                                  |
| **7. Manutenção futura**                                 | Altíssima previsibilidade e zero risco de quebra com futuras versões do React 19.                                                                                                                                                                                                                                       |

**Veredito — NÃO INSTALAR `@uiarc/bottom-sheet`; CONSOLIDAR PRIMITIVO INTERNO `<Sheet>`:** Extrair a lógica já validada de `AddSongsDialog` + `lockBodyScroll` em um componente compartilhado próprio (`src/components/ui/Sheet.tsx`) com barra _grabber_ estilo iOS, animação de entrada/saída com curva `cubic-bezier(0.32, 0.72, 0, 1)`, suporte opcional a arrasto vertical simples no cabeçalho para fechar e fallback para diálogo centralizado no desktop. Zero dependências novas.

---

### G.3. Reorderable List (`@uiarc/reorderable-list`)

| Critério                                           | Avaliação comparativa                                                                                                                                                                                                                                                                                                                                                                                                    |
| :------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Componente existente**                        | [RepertoryOrderPanel.tsx](file:///c:/Users/conta/Downloads/meurepertorio-main/v2/src/features/repertories/RepertoryOrderPanel.tsx) — auditado e estabilizado recentemente nas Etapas 36, 37 e 38.                                                                                                                                                                                                                        |
| **2. Solução externa (`@uiarc/reorderable-list`)** | Baseada em `Reorder.Group` / `Reorder.Item` do `motion`, animando deslocamento visual de itens durante o arrasto.                                                                                                                                                                                                                                                                                                        |
| **3. Custo de dependências**                       | Exige `motion` (~35+ kB gzip) + `arc-foundation`.                                                                                                                                                                                                                                                                                                                                                                        |
| **4. Compatibilidade com o projeto**               | **Baixa aderência arquitetural:** `Reorder.Group` do `motion` espera mutações síncronas locais da lista a cada pixel cruzado (`onReorder(newArray)`), enquanto o Meu Repertório persiste cada movimento transacionalmente no IndexedDB com controle de revisão (`reorderRepertoryItem(..., revision)`).                                                                                                                  |
| **5. Acessibilidade**                              | `RepertoryOrderPanel` atual suporta **4 modalidades completas**: mouse (HTML5 Drag), toque/caneta (Pointer Events isolados no `.dragHandle` preservando `touch-action: pan-y` no restante da linha), teclado (`ArrowUp` / `ArrowDown` no handle) e botões explícitos (`Subir` / `Descer`). `Reorder` do `motion` tem limitações conhecidas de reordenação por teclado nativo e conflitos de scroll em containers longos. |
| **6. Integração com o comportamento atual**        | Substituir `RepertoryOrderPanel` colocaria em risco o bloqueio `busy`, o tratamento de `RepertoryRevisionConflictError`, a edição inline de `ToneEditor` dentro do `<li>` e toda a suíte de 17 testes de integração e E2E da Etapa 38.                                                                                                                                                                                   |
| **7. Manutenção futura**                           | Manter o componente próprio é mais simples, seguro e totalmente testado.                                                                                                                                                                                                                                                                                                                                                 |

**Veredito — REJEITAR SUBSTITUIÇÃO POR `@uiarc/reorderable-list`:** Manter integralmente a engenharia de `RepertoryOrderPanel` e aplicar apenas **refinamento visual e tátil sobre ele** (melhorar área de toque para `44px`, indicador visual de linha de destino _drop line_ âmbar estilo iOS, elevação sutil do item arrastado e limpeza das ações secundárias).

---

## H. Plano de execução incremental (Próximas etapas)

Seguindo a diretriz de etapas pequenas, testáveis, independentes e sem regressão funcional, propõe-se a seguinte sequência de implementação a partir da **Etapa 41**:

### Etapa 41 — Fundação do Design System Apple / iOS e Seletor de Tema

- **Escopo:** `tokens.css`, `fonts.css`, `global.css`, `Button`, `Badge`, `SettingsPage` (novo controle de Aparência `Sistema | Claro | Escuro`) e sincronização de `meta[name="theme-color"]`.
- **Entregas:**
  - Transição de `--font-sans` para pilha nativa Apple (`SF Pro` / `system-ui`), mantendo `JetBrains Mono` para cifras e dados tabulares.
  - Refinamento da paleta clara (alabastro luminoso + separadores sutis + destaque nítido) e calibração de elevação das superfícies escuras, eliminando a duplicação em `tokens.css`.
  - Inclusão de `variant="danger"` (e `danger-soft`) em `Button` e `tone="danger"` em `Badge`.
  - Garantia global de `font-size >= 16px` em controles de entrada mobile (fim do auto-zoom no Safari) e feedback `:active` refinado.

### Etapa 42 — Primitivos Compartilhados de Superfície (`Sheet`, `ConfirmDialog`, `ActionMenu`)

- **Escopo:** Criação de componentes internos leves sem dependências externas e substituição dos `window.confirm`.
- **Entregas:**
  - Componente `<Sheet>` (Bottom Sheet no mobile com _grabber_ e transição estilo iOS / Modal centralizado no desktop, usando `lockBodyScroll` e focus trap).
  - Componente `<ConfirmDialog>` com suporte a ação destrutiva em vermelho semântico, substituindo os 5 usos de `window.confirm` e padronizando confirmações.
  - Componente leve de menu contextual acessível por teclado (`ArrowUp`/`ArrowDown`/`Escape`) e toque.

### Etapa 43 — Reestruturação da Navegação e Moldura (`AppShell`, `TabBar` iOS, `Sidebar`, `PWA`)

- **Escopo:** `AppShell`, substituição do `MobileNavMenu` pela `TabBar` inferior estilo iOS (evoluindo/limpando `BottomNav`), simplificação da `Topbar`, correção de _safe areas_ em retrato/paisagem (`768px` e _landscape_ com notch) e ajuste do `apple-touch-icon` `180×180` + `UpdateNotice` dispensável.

### Etapa 44 — Refinamento da Biblioteca, Favoritos e Lista de Repertórios

- **Escopo:** `LibraryPage`, `FavoritesPage`, `SongCard`, `RepertoriesPage` (remoção de `LibraryTabs` redundantes e do FAB flutuante).
- **Entregas:**
  - Cabeçalhos limpos estilo _Large Title_ com botão `+` contextual no topo e barra de busca estilo iOS com botão limpar (`×`) e placeholder sem corte em `343 px`.
  - `SongCard` enxuto (sem ícone repetitivo `Music2`, com Tom sempre visível no mobile, feedback de toque `:active` e exclusão protegida em menu contextual).
  - `RepertoriesPage` priorizando a lista de repertórios (criação sob demanda via `+`/sheet), destaque claro para `"Tocar"` e menu contextual para `Renomear`, `Duplicar` e `Excluir` (`danger`).
  - Correção da copy `"estrela"` → `"coração"` e estados vazios com ação direta.

### Etapa 45 — Experiência de Leitura da Música e Diagramas (`SongViewPage`, `SongSheet`, `ChordDiagramOverlay`)

- **Escopo:** `SongViewPage`, `SongSheet`, `ChordDiagramOverlay`, `ChordDiagram`, `RepertoryPicker`.
- **Entregas:**
  - Solução definitiva para o corte horizontal de letras/cifras em `343 px` / `390 px` preservando o alinhamento musical dos acordes.
  - Desobstrução vertical de `SongViewPage`: barra de ferramentas compacta unificada, botão `"Salvar tom"` exibido apenas quando houver alteração pendente, áreas de toque `>= 44px` (incluindo área expandida em `.chordButton`) e remoção do `<main>` aninhado.
  - Correção do bug de `pointer-events` e do escurecimento excessivo em `ChordDiagramOverlay`, permitindo ler a música com o diagrama aberto.

### Etapa 46 — Refinamento de Palco no Modo Show (`ShowModePage`)

- **Escopo:** `ShowModePage` e `ShowModePage.module.css`.
- **Entregas:**
  - Correção crítica do diagrama de acorde no Modo Show para abrir em camada flutuante visível em qualquer posição de scroll.
  - Eliminação do conflito entre leitura horizontal e gesto de _swipe_ de troca de música.
  - Compactação inteligente do cabeçalho (sem duplicar o título da música) e da barra inferior (especialmente em orientação _landscape_), alvos de `44px` nos controles de palco, correção do ícone `<SunMedium>` / `htmlFor` e uso do novo `<Sheet>` na lista de faixas.

### Etapa 47 — Editor de Repertório, Editor de Música, Importações e Ajustes Finais

- **Escopo:** `RepertoryEditorPage`, `RepertoryOrderPanel`, `AddSongsDialog`, `SongEditorPage`, `ImportSongPage`, `BatchImportPage`, `SettingsPage`, `BackupPanel`, `InstallHelp`, `CloudPage`.
- **Entregas:**
  - Alvos de toque `>= 44px` e indicador visual refinado de reordenação em `RepertoryOrderPanel` (preservando 100% da mecânica de mouse/touch/teclado/sync) + migração de `AddSongsDialog` para `<Sheet>`.
  - Padronização dos 3 seletores de arquivo, reorganização dos atalhos de entrada em `ImportSongPage`, recolhimento opcional de itens validados em `BatchImportPage` e barra de salvamento contextual em `SongEditorPage`.
  - Polimento final de `SettingsPage` (`"Ajustes"`, ícone `<Share>` do Safari e espaçamentos em `InstallHelp`, alinhamento em `BackupPanel`, campo OTP monoespaçado e badges semânticos em `CloudPage`) + homologação visual completa em `343 px`, `390 px`, `768 px`, `1024 px` e `1280 px` nos temas claro e escuro.
