# Etapa 37 — Auditoria estrutural do editor de repertório

**Etapa:** 37
**Data:** 16/11/2026
**Checkout:** `v2` (base `cfd4066`)
**Status:** concluída em código, testes automatizados e inspeção visual; sem commit/push.

## 1. Objetivo

Auditar estruturalmente o editor de repertório entregue na Etapa 36 e aplicar apenas
refatorações com benefício técnico concreto e risco controlado, sem alterar regras de
negócio, persistência, sincronização ou comportamentos aprovados.

## 2. Método

1. Leitura integral de `RepertoryEditorPage`, `AddSongsDialog`, `useRepertories`, dos
   serviços de repertório, do CSS das telas, dos testes unitários/E2E e das
   dependências consumidas (`useSongs`, `parseTonality`, overlays existentes).
2. Classificação dos achados em Crítico/Alto/Médio/Baixo.
3. Correção apenas dos problemas com impacto demonstrável.
4. Validação completa e inspeção visual em 343 px, 390 px e 1280 px.

Nenhum problema **Crítico** foi encontrado: não havia risco de perda silenciosa de
dados persistidos, quebra de migração ou corrupção de repertório.

## 3. Auditoria

| Problema                                                                                                            | Evidência                                                                                        | Impacto                                                                                   | Nível | Recomendação                                                     |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------- |
| Falha ao ler a biblioteca aparecia como biblioteca vazia                                                            | `AddSongsDialog` consumia apenas `{ data, loading }` de `useSongs` e ignorava `error`            | Usuário concluía que as músicas tinham desaparecido; nenhuma ação de recuperação          | Médio | Exibir erro próprio e não renderizar o estado vazio              |
| Diálogo fechava por `Esc`/fundo durante a gravação, mas “Cancelar” ficava desabilitado                              | Efeito de teclado e `onMouseDown` do overlay chamavam `onClose` sem consultar `adding`           | O progresso sumia e o erro de adição ficava sem contexto; estados contraditórios          | Médio | Bloquear todos os caminhos de fechamento durante `adding`        |
| Conflito de revisão ao adicionar ficava atrás do modal                                                              | `handleAddSongs` gravava `errorMessage`/`revisionConflict` na página e mantinha o diálogo aberto | O botão “Atualizar versão” existia, mas inacessível até fechar o modal manualmente        | Alto  | Fechar o diálogo e expor a recuperação na página                 |
| Tom digitado era perdido quando o serviço rejeitava                                                                 | `onBlur` fechava o editor **antes** de aguardar `handleItemKey`; falha não reabria o valor       | Perda de digitação em tom inválido ou conflito de revisão                                 | Alto  | Manter rascunho local e só fechar após confirmação               |
| Flag global `skipToneCommitRef` e `key` de remontagem controlavam o editor de tom                                   | `key={...preferredKey}` + flag compartilhada entre itens                                         | Efeito colateral frágil, difícil de testar e sensível à ordem de eventos                  | Médio | Estado local no editor de tom, sem flag global nem remontagem    |
| Página com 541 linhas concentrava dados, renomeação, adição, remoção, dois gestos de arraste, tom, erros e feedback | `RepertoryEditorPage.tsx`                                                                        | Baixa coesão; qualquer ajuste na lista exigia mexer no fluxo de persistência              | Alto  | Extrair painel de ordenação e editor de tom                      |
| Estado de arraste fragmentado                                                                                       | `draggingId`, `pointerDraggingId`, `pointerTargetIndex` + refs                                   | Condições redundantes; risco de destaque inconsistente e limpeza parcial                  | Médio | Consolidar em um estado `drag` + refs específicas por modalidade |
| Arrasto HTML5 começava em qualquer ponto da linha                                                                   | `draggable` no `<li>`, apesar da dica “Arraste pelo ícone”                                       | Arrasto acidental ao tocar no chip de tom ou no editor                                    | Médio | Restringir `draggable` ao handle                                 |
| `onDrop` gravava erro bruto sem limpar o conflito anterior                                                          | Caminho `setErrorMessage('Não foi possível localizar o item arrastado.')`                        | Alerta antigo de revisão podia reaparecer sem conflito real                               | Baixo | Unificar mensagem e conflito em um único estado                  |
| Entrada de renomear sem nome acessível                                                                              | `<input value={nameDraft}>` sem `aria-label`/`label`                                             | Leitor de tela anunciava apenas “caixa de edição”                                         | Baixo | Adicionar nome acessível explícito                               |
| Chip de tom não informava o tom atual                                                                               | `aria-label="Editar tom próprio de {title}"`                                                     | Usuário de leitor de tela precisava abrir o editor para saber o tom                       | Baixo | Incluir o tom exibido no nome acessível                          |
| Renomear/salvar tom sem mudança incrementava revisão                                                                | Serviço sempre grava; UI chamava em `blur`/`Salvar` mesmo com valor idêntico                     | Revisões e `syncPending` desnecessários, mais chances de conflito entre abas/dispositivos | Baixo | Guarda de no-op na UI, sem alterar o serviço                     |
| Foco podia escapar do diálogo                                                                                       | Trap só tratava primeiro/último elemento quando o foco já estava no painel                       | Tab a partir de elemento externo não retornava ao modal                                   | Baixo | Reentrar no painel quando o foco estiver fora                    |
| `previousFocus?.focus()` em nó desconectado                                                                         | Cleanup do diálogo                                                                               | Foco perdido quando o gatilho saía do DOM                                                 | Baixo | Verificar `isConnected`                                          |
| Diálogo sem `aria-describedby` e sem `aria-busy`                                                                    | JSX do diálogo                                                                                   | Descrição não associada; estado de gravação não anunciado                                 | Baixo | Associar descrição e expor `aria-busy`                           |
| Hover de opção/controles em telas de toque                                                                          | CSS sem `@media (hover: hover)` em opções e botão fechar                                         | Realce preso após toque em dispositivos móveis                                            | Baixo | Restringir hover a dispositivos com ponteiro                     |

## 4. Correções aplicadas

### 4.1. Diálogo de adição

- `useSongs` passou a expor `error`; falha de leitura mostra
  “Não foi possível carregar as músicas da biblioteca.” com `role="alert"` e não
  mostra o estado de biblioteca vazia.
- `addingRef` espelha `adding` para o listener de teclado; `Esc`, botão fechar, X,
  backdrop e “Cancelar” ficam bloqueados durante a gravação.
- O conflito de revisão fecha o diálogo e mantém na página o alerta com
  “Atualizar versão”; erros comuns continuam dentro do diálogo.
- O trap de foco reentra no painel quando o foco escapa; o foco anterior só é
  restaurado se ainda estiver conectado.
- `aria-describedby` associa o subtítulo e `aria-busy` anuncia a gravação.

### 4.2. Editor de tom

- Novo `ToneEditor` mantém `draft` local, `cancelledRef` e `savingRef`.
- `Enter` e blur salvam; `Esc` cancela sem gravar. Em falha, o editor permanece
  aberto com o valor digitado e a mensagem de erro.
- O editor só fecha quando `onSave` retorna `true`; a página devolve esse booleano.
- Valor igual ao tom próprio atual fecha sem chamar o serviço.
- Removidos `skipToneCommitRef` e o `key` de remontagem do input.

### 4.3. Lista e arrasto

- `draggable` foi movido do `<li>` para o handle, alinhando o gesto à dica visual e
  evitando arrasto acidental ao interagir com chip/editor.
- `draggingId`/`pointerDraggingId`/`pointerTargetIndex` foram substituídos por
  `drag` (`{ itemId, source, targetIndex }`) mais `pointerDragRef`/`mouseDragRef`.
- `onDrop` apenas dispara a movimentação; erro e conflito passam pelo mesmo
  `notice` da página.
- O handle continua suportando `↑`/`↓` por teclado e os botões seguem funcionando.

### 4.4. Página

- Renomear faz `trim` e não chama o serviço quando o nome não mudou; o foco volta
  ao botão “Renomear” em sucesso, cancelamento e no-op.
- `errorMessage` + `revisionConflict` foram unificados em
  `notice: { message, conflict }`, eliminando a possibilidade de o botão de
  atualização reaparecer após um erro comum.

## 5. Extrações e justificativa

| Extração                         | Motivo                                                                                                                                                                    | Reutilização real                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `RepertoryOrderPanel`            | Isola lista, arrasto por mouse/toque, ações por item e chip/editor de tom; a página fica responsável por carregamento, renomeação, adição, remoção, conflitos e mensagens | Consumido por `RepertoryEditorPage`; não foi criada abstração genérica de modal/lista    |
| `ToneEditor`                     | Concentra rascunho, salvamento e cancelamento do tom, com estado local testável                                                                                           | Usado pelo painel para cada item; sem API genérica                                       |
| `RepertoryOrderPanel.module.css` | Separa estilos da lista dos estilos da página, removendo ~304 linhas do CSS da página                                                                                     | Um único consumidor direto, com estados próprios (`data-editing`, foco do handle, hover) |

Não foram adicionadas dependências (Radix, Vaul, dnd-kit) porque os modais e gestos
existentes têm comportamentos distintos e não havia reutilização real que
justificasse a troca.

## 6. Código, estados e estilos removidos

- Estados: `draggingId`, `pointerDraggingId`, `pointerTargetIndex`, `errorMessage`,
  `revisionConflict`, `editingToneId` na página e `skipToneCommitRef`.
- O `key` dinâmico do input de tom e o `defaultValue` não controlado.
- Handlers de drag antigos no `<li>` (`onDragStart`/`onDrop` por linha) e a
  atribuição de erro bruto no drop.
- ~304 linhas de CSS de lista/tom/ações/estado vazio/`srOnly` retiradas de
  `RepertoryEditorPage.module.css` (equivalentes migrados para o painel, com
  ajustes de foco e hover).
- Nenhuma função de serviço, regra de revisão ou contrato de persistência foi
  removido.

## 7. Arquivos

**Novos**

- `src/features/repertories/RepertoryOrderPanel.tsx`
- `src/features/repertories/RepertoryOrderPanel.module.css`
- `src/features/repertories/ToneEditor.tsx`
- `docs/ETAPA_37_AUDITORIA_EDITOR_REPERTORIO.md`

**Alterados**

- `src/features/repertories/RepertoryEditorPage.tsx` (541 → 312 linhas)
- `src/features/repertories/RepertoryEditorPage.module.css` (437 → 133 linhas)
- `src/features/repertories/AddSongsDialog.tsx` (186 → 212 linhas)
- `src/features/repertories/AddSongsDialog.module.css`
- `src/features/repertories/RepertoryEditorPage.test.tsx` (6 → 16 testes)
- `e2e/repertories.spec.ts` (novo fluxo de arrasto por mouse)
- `src/features/repertories/README.md`

**Não alterados:** `src/services/repertories.ts`, `src/services/songs.ts`,
`src/database`, `src/sync`, contratos de revisão, IndexedDB e persistência.

## 8. Validação

| Comando                           | Resultado                                              |
| --------------------------------- | ------------------------------------------------------ |
| `npm run typecheck`               | passou                                                 |
| `npm run lint`                    | passou                                                 |
| `npm run format:check`            | passou                                                 |
| `npm run build`                   | passou                                                 |
| `npm test`                        | 47 arquivos, 271 testes passaram                       |
| `npx playwright test --workers=1` | 69 passaram, 1 ignorado (`isMobile` no fluxo de mouse) |

Testes direcionados adicionados/atualizados: 25/25 em
`src/features/repertories` + `src/app/library.integration.test.tsx`, cobrindo
falha de carga da biblioteca, fechamento durante gravação, conflito na adição,
foco, no-op de renomear/tom, tom rejeitado e arrasto por mouse.

Inspeção visual com capturas temporárias (removidas do repositório após a
conferência) em:

- 343 px: editor com 3 músicas e diálogo aberto, sem rolagem horizontal;
- 390 px: editor vazio/preenchido, diálogo, busca, seleção múltipla, tom
  aberto/erro/salvo/cancelado;
- 1280 px: editor e diálogo centralizado.

## 9. Funcionalidades preservadas

- Criar e renomear repertórios, adicionar várias músicas e impedir duplicatas.
- Busca por título, artista e tom no diálogo.
- Tom próprio e tom herdado, com chip indicando o tom efetivo.
- Reordenação por toque, mouse e botões/teclado.
- Remoção com confirmação nativa.
- Show Mode, conflitos de revisão, persistência, sincronização e modo offline.
- Mensagens de sucesso, carregamento, erro e estado vazio.
- Ordenação por `position` e contratos de revisão inalterados.

## 10. Limitações e pontos deliberadamente não alterados

- A remoção continua usando `window.confirm`; trocar por diálogo próprio exigiria
  outro fluxo e não era necessário para esta auditoria.
- O diálogo permanece manual, sem foco inicial em elemento “inert” nem portal; o
  trap e o bloqueio de rolagem existentes atendem ao uso atual.
- Durante `adding`, os checkboxes ainda podem ser alterados, embora os botões de
  ação estejam desabilitados; a requisição já foi enviada com a seleção capturada
  e mudar a seleção não afeta a gravação em andamento.
- Não foi alterada a semântica do serviço de reordenação nem a reindexação de
  posições.
- Não houve commit nem push.
