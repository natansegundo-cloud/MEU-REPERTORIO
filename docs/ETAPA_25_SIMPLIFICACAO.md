# Etapa 25 — Simplificação de interface e hierarquia visual

**Etapa:** 25
**Data:** 11/11/2026
**Checkout:** `v2`
**Status:** concluída, aguardando revisão.

## 1. Objetivo

Reduzir controles visíveis ao mesmo tempo, botões redundantes, cartões e bordas
aninhadas, informação secundária e espaçamento excessivo nas telas de
Biblioteca, música, editor de repertório, Ajustes e Modo Show, sem remover
funcionalidades.

## 2. Excesso encontrado na auditoria

- Cabeçalhos repetiam contexto ("Meu repertório", "Acesso rápido", "Editor de
  repertório") e descrições longas antes do conteúdo principal.
- Biblioteca e Repertórios usavam cartões por item, com bordas e sombras
  repetidas, além de contadores duplicados entre cabeçalho e barra de busca.
- Tela da música combinava cabeçalho com ícone, botões de texto para favorito e
  edição, painel de tom em cartão e opções de leitura em outra faixa.
- Editor de repertório exibia abas de navegação redundantes com a navegação
  principal, além de um painel grande de adição sempre aberto e cartões
  individuais para cada música.
- Ajustes aninhavam cartões dentro de seções já delimitadas, com títulos e
  descrições longas.
- Modo Show mantinha um painel flutuante de rolagem sobre a barra fixa, além de
  um grupo redundante de velocidade dentro dos controles, uma cifra dentro de
  cartão e cabeçalho muito espaçado.

## 3. Mudanças por tela

### Biblioteca e Favoritos

- Cabeçalho compacto: título e contador no mesmo nível, sem sobretítulo nem
  descrição.
- Contador movido para o cabeçalho; removido da barra de busca.
- Filtro de favoritas virou ação discreta (ícone no mobile, texto no desktop).
- Lista em linhas divisórias, sem cartões. Exclusão continua disponível e
  aparece ao passar o mouse no desktop.
- Aviso de importação reduzido.

### Tela da música

- Removidos sobretítulo e caixa de ícone do cabeçalho.
- Favorito, editar e mais ações viraram botões de ícone compactos com rótulos
  acessíveis.
- Controles de tom e opções de leitura passaram para uma única faixa compacta;
  "Opções de leitura" é um `details` discreto.
- Metadados (tom original, capotraste, afinação) viraram uma linha sutil.

### Editor de repertório

- Abas internas removidas; a navegação principal continua responsável pelo
  contexto.
- Cabeçalho compacto com "Renomear" inline e botão "Tocar" pequeno.
- "Adicionar músicas" virou seção recolhível, aberta por padrão e fechada
  automaticamente após adicionar.
- Músicas do repertório passaram de cartões para linhas com divisórias,
  mantendo arrastar, teclado, tom próprio e remoção.

### Ajustes

- Cabeçalho sem sobretítulo nem descrição.
- Cada seção (Dados, Instalação, Nuvem e conta) usa uma única superfície com
  divisórias internas; cartões internos perderam borda, sombra e padding
  próprio.
- Textos auxiliares e descrições encurtados.
- Estrutura de títulos preservada (níveis 1, 2 e 3).

### Modo Show

- Controles de rolagem incorporados à barra fixa inferior, eliminando o painel
  flutuante sobreposto.
- Grupo redundante de velocidade removido do painel de controles.
- Cifra usando a variante `stage` do `SongSheet`: sem cartão, borda ou sombra,
  alinhada ao cabeçalho.
- Cabeçalho e espaçamentos verticais reduzidos.
- Barra inferior em duas linhas no mobile (rolagem e navegação) e em uma linha
  no desktop, mantendo velocidade, iniciar/pausar e navegação sempre acessíveis.

## 4. Decisões de UX

- Ações frequentes permanecem visíveis; ações secundárias foram agrupadas em
  menus ou `details`.
- A navegação de primeiro nível (etapas anteriores) não foi alterada.
- Nenhum rótulo usado por testes ou leitores de tela foi removido.
- A paleta global, o motor musical, o parser, a persistência, a sincronização e
  os algoritmos de rolagem não foram modificados.

## 5. Arquivos modificados

- `src/app/App.tsx`
- `src/components/layout/PageHeader.module.css`
- `src/components/settings/SettingsCard.module.css`
- `src/components/system/InstallHelp.tsx`
- `src/features/favorites/FavoritesPage.tsx`
- `src/features/library/LibraryPage.tsx`
- `src/features/library/LibraryPage.module.css`
- `src/features/library/SongCard.module.css`
- `src/features/library/SongViewPage.tsx`
- `src/features/library/SongViewPage.module.css`
- `src/features/repertories/RepertoriesPage.tsx`
- `src/features/repertories/RepertoriesPage.module.css`
- `src/features/repertories/RepertoryEditorPage.tsx`
- `src/features/repertories/RepertoryEditorPage.module.css`
- `src/features/settings/BackupPanel.tsx`
- `src/features/settings/CloudPage.tsx`
- `src/features/settings/SettingsPage.tsx`
- `src/features/settings/SettingsPage.module.css`
- `src/features/show-mode/ShowModePage.tsx`
- `src/features/show-mode/ShowModePage.module.css`
- `src/features/songs/SongSheet.tsx`
- `src/features/songs/SongSheet.module.css`

## 6. Capturas

- `docs/screenshots/etapa25/antes/`
- `docs/screenshots/etapa25/depois/`

Telas: Biblioteca, música, Repertórios, editor de repertório, Ajustes e Modo
Show, em desktop (1440×900) e mobile (390×844). Também foram capturados os
controles abertos do Modo Show.

## 7. Validação

| Comando                | Resultado                          |
| ---------------------- | ---------------------------------- |
| `npm run format:check` | aprovado                           |
| `npm run typecheck`    | aprovado                           |
| `npm run lint`         | aprovado                           |
| `npm test`             | 201 testes aprovados (38 arquivos) |
| `npm run test:e2e`     | 66 testes aprovados                |
| `npm run build`        | aprovado                           |
| `git diff --check`     | sem erros                          |

## 8. Pendências

- Revisão visual do usuário nas capturas e em dispositivo real.
- Nenhuma alteração de dados, sincronização ou funcionalidade foi feita nesta
  etapa.
