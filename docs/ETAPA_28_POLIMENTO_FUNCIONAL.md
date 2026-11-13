# Etapa 28 — Polimento funcional e experiência de uso

**Etapa:** 28
**Data:** 12/11/2026
**Checkout:** `v2`
**Status:** concluída, aguardando revisão.

## 1. Objetivo

Corrigir pequenos problemas reais de confiabilidade, feedback, acessibilidade e
ergonomia nos fluxos existentes, sem reformular a identidade visual da Etapa 26,
a simplificação da Etapa 25, a navegação da Etapa 24 ou os diagramas da Etapa 27.

Nenhuma funcionalidade grande foi criada, nenhuma dependência foi adicionada e
nenhum contrato de dados, sincronização ou persistência foi alterado.

## 2. Auditoria realizada

Foram lidos e verificados:

- `AGENTS.md`.
- `docs/ETAPA_25_SIMPLIFICACAO.md`.
- `docs/ETAPA_26_IDENTIDADE_VISUAL.md`.
- `docs/ETAPA_27_DIAGRAMAS_ACORDES.md`.
- Biblioteca, Favoritos, visualização e edição de músicas.
- Repertórios e editor de repertório.
- Modo Show, controlador de rolagem, sessão e Screen Wake Lock.
- Importação individual, importação em lote e extração de arquivos.
- Ajustes, backup, restauração e nuvem.
- Overlays, menus, estados de carregamento, sucesso, erro e vazio.
- Testes unitários, de integração e E2E relacionados.

### 2.1. Problemas reais encontrados

| #   | Problema                                                                                                                                                                                  | Impacto    | Frequência                   | Risco de regressão | Esforço |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------- | ------------------ | ------- |
| 1   | `SongEditorPage.handleSave` não bloqueava envios simultâneos. Dois cliques rápidos usavam a mesma revisão: o primeiro salvava e o segundo exibia conflito de revisão enganoso.            | Alto       | Frequente                    | Baixo              | Pequeno |
| 2   | `SongViewPage.saveDisplayedKey` tinha o mesmo problema ao salvar o tom preferido.                                                                                                         | Alto       | Frequente                    | Baixo              | Pequeno |
| 3   | `createRepertory` e `duplicateRepertory` não possuem trava de revisão. Cliques repetidos criavam repertórios duplicados.                                                                  | Alto       | Frequente                    | Baixo              | Pequeno |
| 4   | Renomear/excluir repertório e adicionar/reordenar/remover músicas usavam revisão capturada antes do primeiro envio. O segundo clique gerava conflito enganoso.                            | Médio-alto | Frequente                    | Baixo              | Pequeno |
| 5   | `releaseScreenWakeLock` não tratava rejeição de `handle.release()`, e a reaquisição podia sobrescrever um bloqueio anterior sem liberá-lo. Não havia feedback do estado real do bloqueio. | Médio      | Ocasional                    | Baixo              | Pequeno |
| 6   | `omittedIntervals` era gerado, mas nunca exibido. O usuário não sabia quando o voicing omitia a quinta.                                                                                   | Médio      | Frequente ao abrir diagramas | Baixo              | Pequeno |
| 7   | Em viewport estreita, abrir “Opções de leitura” expandia a barra e cortava o botão “Salvar tom”.                                                                                          | Médio      | Frequente no mobile          | Baixo              | Pequeno |
| 8   | Os campos de renomear repertório não respondiam a Enter/Escape.                                                                                                                           | Baixo      | Ocasional                    | Baixo              | Pequeno |

### 2.2. Pontos auditados que já estavam adequados

- `ImportSongPage` e `BatchImportPage` já bloqueiam envio repetido e exibem
  diagnósticos e confirmação.
- `BackupPanel` já tem estados de exportação/restauração, progresso, desabilitação
  e mensagens de erro.
- `CloudPage` já tem estados de sincronização, erro, pendências, cooldown de
  código e bloqueio de autenticação em andamento.
- `LibraryActionMenu`, menu “Mais ações”, lista de músicas do Modo Show e overlay
  de diagramas já tratavam Escape, clique externo e restauração de foco.
- Biblioteca, Repertórios e editor já tinham estados de carregamento, erro e
  vazio compreensíveis.
- O controlador de rolagem do Modo Show já preservava posição ao pausar/retomar,
  aplicava nova velocidade sem criar outra execução e encerrava no fim da página.

## 3. Melhorias implementadas

### 3.1. Intervalos omitidos nos diagramas

- O painel agora deriva o aviso do voicing atualmente exibido.
- Quando a quinta é omitida, aparece `5ª omitida` de forma discreta ao lado do
  resumo de dedos.
- Quando nenhum intervalo é omitido, nada é exibido.
- A informação muda junto com a navegação de variações, inclusive ao restaurar a
  variação salva.
- A geração musical, presets, variações, SVG e identidade visual foram
  preservados.

### 3.2. Confiabilidade do Modo Show

- A liberação do Screen Wake Lock agora ignora rejeições de bloqueios já
  encerrados pelo navegador.
- A reaquisição libera o bloqueio anterior antes de assumir o novo, evitando
  bloqueios acumulados.
- A aquisição considera visibilidade da página e descarta o bloqueio se o
  componente sair antes da resposta.
- O painel de controles informa quando a tela permanecerá acesa, quando não foi
  possível mantê-la acesa ou quando a API não é suportada.
- O salvamento de tom do item ganhou trava contra envio repetido e os botões de
  tom ficam desabilitados enquanto a gravação está pendente.
- O botão de controles alterna o nome acessível entre “Abrir controles” e
  “Fechar controles”.

O algoritmo de rolagem não foi alterado.

### 3.3. Prevenção de ações repetidas

- **Música:** salvar alterações e salvar tom exibem `Salvando…`, ficam
  desabilitados durante a operação e ignoram novos cliques até a conclusão.
- **Repertórios:** criar, renomear, duplicar e excluir ficam bloqueados durante
  a operação, com rótulos `Criando…`, `Salvando…` e `Excluindo…`.
- **Editor de repertório:** renomear, adicionar, reordenar e remover usam a mesma
  trava; os controles de ordem e remoção ficam desabilitados durante a mutação.
- A trava usa `ref` além do estado visual, para cobrir cliques no mesmo ciclo de
  renderização.

Nenhuma confirmação nova foi adicionada. A exclusão de música e de repertório
continua usando a confirmação existente.

### 3.4. Acessibilidade e viewport estreita

- Enter confirma e Escape cancela a renomeação de repertório nas duas telas.
- Em telas de até 760 px, “Opções de leitura” abre como painel sobreposto
  ancorado à direita, em vez de expandir a barra e cortar o botão de salvar.
- O novo teste E2E verifica que o botão “Salvar tom” permanece dentro dos 343 px
  de largura.
- Foco, Escape e clique externo dos overlays existentes foram preservados.

## 4. Arquivos modificados

| Arquivo                                                 | Mudança                                                                     |
| ------------------------------------------------------- | --------------------------------------------------------------------------- |
| `src/components/music/ChordDiagram.tsx`                 | Rótulo discreto do intervalo omitido do voicing atual.                      |
| `src/components/music/ChordDiagram.module.css`          | Estilo discreto do rótulo.                                                  |
| `src/components/music/ChordDiagram.test.tsx`            | Teste de omissão por variação.                                              |
| `src/features/show-mode/ShowModePage.tsx`               | Wake Lock robusto, feedback, trava do tom e nome do botão de controles.     |
| `src/features/show-mode/wake-lock.ts`                   | Liberação tolerante a rejeição.                                             |
| `src/features/show-mode/wake-lock.test.ts`              | Teste de rejeição ao liberar.                                               |
| `src/features/library/SongEditorPage.tsx`               | Trava de salvamento e estado `Salvando…`.                                   |
| `src/features/library/SongEditorPage.test.tsx`          | Teste de clique repetido.                                                   |
| `src/features/library/SongViewPage.tsx`                 | Trava ao salvar tom e estado `Salvando…`.                                   |
| `src/features/library/SongViewPage.test.tsx`            | Teste de clique repetido.                                                   |
| `src/features/library/SongViewPage.module.css`          | Painel de leitura sobreposto no mobile.                                     |
| `src/features/repertories/RepertoriesPage.tsx`          | Travas de criar/renomear/duplicar/excluir, rótulos ocupados e Enter/Escape. |
| `src/features/repertories/RepertoriesPage.test.tsx`     | Testes de criação, duplicação e renomeação por teclado.                     |
| `src/features/repertories/RepertoryEditorPage.tsx`      | Travas de renomear/adicionar/reordenar/remover e Enter/Escape.              |
| `src/features/repertories/RepertoryEditorPage.test.tsx` | Testes de adição e reordenação repetidas.                                   |
| `e2e/song-reading.spec.ts`                              | Verificação do botão de tom dentro do viewport estreito.                    |
| `docs/ETAPA_28_POLIMENTO_FUNCIONAL.md`                  | Este relatório.                                                             |
| `docs/screenshots/etapa28/`                             | Capturas da informação de quinta omitida.                                   |

## 5. Testes executados

| Comando                           | Resultado                                                 |
| --------------------------------- | --------------------------------------------------------- |
| `npm run format:check`            | passou                                                    |
| `npm run typecheck`               | passou                                                    |
| `npm run lint`                    | passou                                                    |
| `npm test`                        | 41 arquivos, 215 testes, todos passaram                   |
| `npm run test:e2e -- --workers=1` | 66 testes, todos passaram                                 |
| `npm run build`                   | passou (PWA com 22 entradas de precache)                  |
| `git diff --check`                | sem erros de whitespace (apenas avisos de LF/CRLF do Git) |

Testes novos ou ampliados:

- `ChordDiagram.test.tsx`: variação com e sem quinta omitida.
- `wake-lock.test.ts`: rejeição ao liberar bloqueio.
- `SongEditorPage.test.tsx`: clique duplo em salvar.
- `SongViewPage.test.tsx`: clique duplo em salvar tom.
- `RepertoriesPage.test.tsx`: criação e duplicação repetidas; renomeação por
  teclado.
- `RepertoryEditorPage.test.tsx`: adição e reordenação repetidas.
- `song-reading.spec.ts`: botão de tom visível em 343 px.

## 6. Capturas

- `docs/screenshots/etapa28/diagrama-quinta-omitida-desktop-claro.png`
- `docs/screenshots/etapa28/diagrama-quinta-omitida-desktop-escuro.png`
- `docs/screenshots/etapa28/diagrama-quinta-omitida-mobile-claro.png`
- `docs/screenshots/etapa28/diagrama-quinta-omitida-mobile-escuro.png`
- `docs/screenshots/etapa28/diagrama-sem-omissao-desktop-claro.png`
- `docs/screenshots/etapa28/diagrama-sem-omissao-mobile-claro.png`

As capturas mostram o mesmo acorde (`C7M`) em variações diferentes: uma com
`5ª omitida` e outra sem o aviso. A captura mobile também registra o painel de
leitura já corrigido, sem cortar o botão de salvar.

## 7. Pendências para etapas futuras

- Falhas ao alternar favorito na Biblioteca e na tela da música ainda não geram
  feedback visual; a operação é local e de baixa frequência, mas pode ser
  tratada em um polimento específico.
- O botão “Revisar versão atual”, exibido no conflito do editor de repertório,
  apenas dispensa a mensagem; o detalhe já é atualizado pela consulta reativa.
  O texto pode ser refinado para “Tentar novamente”.
- Os botões de navegação de variações do diagrama têm 28 px. Atendem ao mínimo
  de 24 px, mas podem chegar a 36–44 px em uma etapa de ergonomia dedicada.
- A exportação de backup não tem uma trava por `ref` contra dois cliques no
  mesmo ciclo de renderização. O botão já é desabilitado pelo estado visual e a
  operação é idempotente, então não foi alterado nesta etapa.
- A validação de toque e leitura continua sendo feita em Chromium desktop e
  mobile simulados, sem aparelho físico.

## 8. Escopo preservado

- Nenhuma alteração na identidade visual aprovada.
- Nenhuma alteração na navegação estrutural.
- Nenhuma alteração no parser, na transposição ou na geração musical dos
  diagramas.
- Nenhuma alteração no banco, em migrations ou no formato persistido.
- Nenhuma alteração na sincronização ou nos contratos do Supabase.
- Nenhuma dependência adicionada.
- Nenhum recurso removido.
- Nenhum commit ou push realizados.
- Etapa 29 não iniciada.

O aplicativo permanece com a mesma estrutura visual e funcional, com ganhos
localizados de confiabilidade, feedback, acessibilidade e ergonomia.
