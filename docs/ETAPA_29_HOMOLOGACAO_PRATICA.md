# Etapa 29 — Homologação prática e refinamento final

**Etapa:** 29
**Data:** 12/11/2026
**Checkout:** `v2`
**Status:** concluída em código e validação automatizada; homologação física pendente.

## 1. Objetivo

Aproximar o Meu Repertório V2 do uso cotidiano, auditando os fluxos principais e
corrigindo apenas problemas concretos de confiabilidade, feedback, foco,
acessibilidade e ergonomia. A identidade visual da Etapa 26, a simplificação da
Etapa 25, os diagramas da Etapa 27 e o polimento da Etapa 28 foram preservados.

Não foram criadas funcionalidades grandes, não foram adicionadas dependências e
não houve alteração no parser, no motor musical, na transposição, no banco, nas
migrations, nos contratos do Supabase ou no formato persistido das músicas.

## 2. Auditoria realizada

Foram lidos `AGENTS.md`, `docs/ETAPA_25_SIMPLIFICACAO.md`,
`docs/ETAPA_26_IDENTIDADE_VISUAL.md`, `docs/ETAPA_27_DIAGRAMAS_ACORDES.md`,
`docs/ETAPA_28_POLIMENTO_FUNCIONAL.md`, `docs/HOMOLOGACAO_PWA_IOS.md`,
`docs/ESTABILIZACAO_FINAL.md`, o código atual, os testes e as capturas anteriores.

Fluxos verificados:

- **Biblioteca e Favoritos:** pesquisa, abertura, favorito, edição, exclusão,
  importação individual e em lote, estados vazio/carregando/erro e retorno pelo
  histórico.
- **Repertórios:** criação, renomeação, duplicação, exclusão, adição, remoção,
  reordenação por botão, teclado e toque, tom próprio e abertura do Modo Show.
- **Modo Show:** início, pausa, retomada, velocidade, arraste vertical, troca
  horizontal de música, controles, diagramas, saída, Wake Lock e retomada após
  recarregar.
- **Diagramas:** posição, pestana, dedos, casa inicial, intervalos omitidos e
  navegação entre variações.
- **Dados e sincronização:** exportação, leitura, prévia, restauração,
  conflitos, progresso, falhas e estados de carregamento.

A auditoria confirmou que os fluxos principais estão estáveis e cobertos por
testes. Os problemas encontrados e corrigidos estão na seção 3.

## 3. Problemas identificados e correções

| #   | Problema confirmado                                                                                                    | Correção aplicada                                                                                                               |
| --- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Botões de variação do diagrama tinham 28 px, abaixo da faixa confortável de toque.                                     | Alvos elevados para 36 px (`2.25rem`), mantendo o ícone e sem redesenhar o painel.                                              |
| 2   | Falha ao alternar favorito na Biblioteca, na tela da música e em Favoritos era silenciosa.                             | Cada fluxo agora captura o erro e exibe uma mensagem com `role="alert"`; a tela da música usa o toast de erro existente.        |
| 3   | O conflito de versão do repertório exibia a mensagem crua e o botão “Revisar versão atual” apenas dispensava o alerta. | O conflito é identificado, recebe texto específico e oferece “Atualizar versão”, que reassina a consulta reativa do repertório. |
| 4   | A exportação de backup não tinha trava por `ref`; dois cliques no mesmo ciclo podiam iniciar duas exportações.         | `exportingRef` bloqueia exportações simultâneas. A restauração também ganhou `restoringRef` e não roda durante uma exportação.  |
| 5   | Cancelar a renomeação em Repertórios ou no editor de repertório deixava o foco no `body`.                              | O foco volta ao botão “Renomear” correspondente após cancelar com Escape/Cancelar ou concluir a renomeação.                     |
| 6   | Os campos “Tom próprio” de itens diferentes tinham o mesmo nome acessível (“Tom próprio”).                             | Cada campo recebeu `aria-label="Tom próprio de <música>"`.                                                                      |

Nenhum problema estrutural ou de alto risco foi encontrado. As pendências que
dependem de aparelho físico ou de ambiente Supabase real estão na seção 7.

## 4. Arquivos modificados nesta etapa

Arquivos alterados diretamente pela Etapa 29:

| Arquivo                                                   | Alteração                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------- |
| `src/components/music/ChordDiagram.module.css`            | Alvos de 36 px para fechar e navegar entre variações.               |
| `e2e/song-reading.spec.ts`                                | Verificação de que os botões de variação têm pelo menos 36×36 px.   |
| `src/features/library/LibraryPage.tsx`                    | Feedback de falha ao favoritar.                                     |
| `src/features/library/LibraryPage.test.tsx`               | Teste do feedback de falha.                                         |
| `src/features/library/SongViewPage.tsx`                   | Feedback de falha ao favoritar e integração ao toast.               |
| `src/features/library/SongViewPage.test.tsx`              | Teste do feedback de falha.                                         |
| `src/features/favorites/FavoritesPage.tsx`                | Feedback de falha ao remover favorito.                              |
| `src/features/favorites/FavoritesPage.test.tsx`           | Teste do feedback de falha.                                         |
| `src/features/repertories/RepertoryEditorPage.tsx`        | Conflito de versão específico, atualização real e foco ao renomear. |
| `src/features/repertories/RepertoryEditorPage.module.css` | Alerta de conflito com ação.                                        |
| `src/features/repertories/RepertoryEditorPage.test.tsx`   | Testes de conflito e de retorno de foco.                            |
| `src/features/repertories/RepertoriesPage.tsx`            | Retorno de foco ao botão de renomear.                               |
| `src/features/repertories/RepertoriesPage.test.tsx`       | Teste de retorno de foco.                                           |
| `src/features/repertories/useRepertories.ts`              | `refresh()` no detalhe reativo do repertório.                       |
| `src/features/settings/BackupPanel.tsx`                   | Travas por `ref` para exportação e restauração.                     |
| `src/features/settings/BackupPanel.test.tsx`              | Teste de exportação duplicada no mesmo ciclo.                       |
| `docs/ETAPA_29_HOMOLOGACAO_PRATICA.md`                    | Este relatório e a checklist física.                                |
| `docs/screenshots/etapa29/`                               | Capturas dos alvos de variação ampliados.                           |

Os arquivos da Etapa 28 continuam não commitados no mesmo checkout e foram
preservados: `ChordDiagram.tsx`, `ShowModePage.tsx`, `SongEditorPage.tsx`,
`SongViewPage.module.css`, `wake-lock.ts`, testes correspondentes e
`docs/ETAPA_28_POLIMENTO_FUNCIONAL.md`.

## 5. Testes executados

| Comando                           | Resultado                                                 |
| --------------------------------- | --------------------------------------------------------- |
| `npm run format:check`            | passou                                                    |
| `npm run typecheck`               | passou                                                    |
| `npm run lint`                    | passou                                                    |
| `npm test`                        | 44 arquivos, 223 testes, todos passaram                   |
| `npm run test:e2e -- --workers=1` | 66 testes, todos passaram                                 |
| `npm run build`                   | passou (PWA com 22 entradas de precache)                  |
| `git diff --check`                | sem erros de whitespace (apenas avisos de LF/CRLF do Git) |

Testes novos ou ampliados:

- `LibraryPage.test.tsx`: falha ao favoritar.
- `SongViewPage.test.tsx`: falha ao favoritar.
- `FavoritesPage.test.tsx`: falha ao remover favorito.
- `RepertoryEditorPage.test.tsx`: conflito de versão com atualização real,
  retorno de foco ao cancelar a renomeação e nome acessível do tom próprio.
- `RepertoriesPage.test.tsx`: retorno de foco ao cancelar a renomeação.
- `BackupPanel.test.tsx`: duas exportações no mesmo ciclo.
- `song-reading.spec.ts`: alvo mínimo de 36×36 px nas variações.

## 6. Capturas

- `docs/screenshots/etapa29/diagrama-variacoes-desktop-claro.png`
- `docs/screenshots/etapa29/diagrama-variacoes-desktop-escuro.png`
- `docs/screenshots/etapa29/diagrama-variacoes-mobile-claro.png`
- `docs/screenshots/etapa29/diagrama-variacoes-mobile-escuro.png`

As capturas mostram o acorde `C7M` na variação com `5ª omitida`, com os botões
de navegação maiores e o painel ainda compacto, em tema claro e escuro.

## 7. Checklist de homologação física

Esta checklist deve ser executada em aparelhos reais. Nenhum item abaixo foi
declarado homologado neste ambiente; a validação automatizada usou Chromium
desktop, Chromium mobile simulado e WebKit com iPhone/iPad simulados apenas para
o PWA.

### 7.1. iPhone — Safari

| Área                | Passo                                                                  | Resultado esperado                                                                                                              |
| ------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Toque e voltar      | Abrir Biblioteca → música → voltar pelo gesto/botão do Safari.         | Retorna à lista sem perder pesquisa, posição de rolagem ou estado da música.                                                    |
| Toque e voltar      | Abrir repertório → Modo Show → sair pelo botão e pelo gesto de voltar. | Retorna ao editor e depois à lista de repertórios sem tela em branco.                                                           |
| Scroll e swipe      | Rolar uma cifra longa e, no Modo Show, arrastar a letra verticalmente. | Scroll vertical suave; o arraste não abre menus nem seleciona texto.                                                            |
| Scroll e swipe      | No Modo Show, deslizar horizontalmente para trocar de música.          | Troca somente quando o gesto é horizontal e fora de controles/cifra.                                                            |
| Rolagem automática  | Iniciar, pausar, alterar velocidade e retomar a rolagem.               | A velocidade muda sem salto; pausar/retomar preserva a posição.                                                                 |
| Wake Lock           | Manter o Modo Show aberto e aguardar o tempo de bloqueio da tela.      | A tela permanece acesa quando a API é suportada; ao voltar do segundo plano, a sessão continua na música e posição persistidas. |
| Safe areas          | Testar em retrato e paisagem com notch, câmera e barra inferior.       | Topbar, controles, navegação inferior e rodapé não ficam sob o sistema.                                                         |
| Diagramas           | Ativar diagramas, abrir um acorde, navegar por todas as variações.     | Pestana, dedos, casa inicial e omissões corretos; botões de 36 px são tocáveis.                                                 |
| Importação e edição | Colar cifra, importar, editar, salvar e reabrir.                       | Conteúdo preservado; teclado não cobre o botão principal; erros são visíveis.                                                   |
| Backup              | Exportar backup, compartilhar/salvar o arquivo e restaurar.            | Arquivo JSON válido; prévia mostra contagens; restauração não duplica dados.                                                    |
| Sincronização       | Com Supabase configurado, entrar, editar offline e reconectar.         | Nenhuma música é perdida; conflitos são preservados e informados.                                                               |
| Offline             | Ativar modo avião, recarregar e navegar por Biblioteca/Repertórios.    | Shell, músicas e repertórios continuam disponíveis.                                                                             |

### 7.2. iPhone — PWA instalada

| Área        | Passo                                                               | Resultado esperado                                                              |
| ----------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Instalação  | Safari → Compartilhar → Adicionar à Tela de Início → abrir o ícone. | Abre em modo standalone, com ícone e nome corretos.                             |
| Navegação   | Repetir toque, voltar, scroll e swipe da seção 7.1.                 | Mesmo comportamento do Safari, sem barra de endereço.                           |
| Safe areas  | Retrato/paisagem com barra de status e indicador inferior.          | Nenhum controle fica cortado; conteúdo respeita `safe-area-inset-*`.            |
| Wake Lock   | Deixar o Modo Show ativo e bloquear/desbloquear o aparelho.         | Retomada previsível; se o iOS suspender a tela, o estado persistido é reaberto. |
| Atualização | Publicar nova versão, abrir a PWA e confirmar “Atualizar”.          | A versão nova ativa sem apagar IndexedDB; o Modo Show não é interrompido.       |
| Offline     | Abrir a PWA em modo avião, navegar e reabrir.                       | Dados locais e shell continuam funcionando.                                     |
| Backup      | Exportar e restaurar pela PWA instalada.                            | Download/compartilhamento e seleção de arquivo funcionam no iOS.                |

### 7.3. Android — Chrome

| Área                | Passo                                                                | Resultado esperado                                                         |
| ------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Toque e voltar      | Navegar Biblioteca → música → repertório → Modo Show e usar voltar.  | Histórico coerente, sem perder alterações não salvas.                      |
| Scroll e swipe      | Rolar cifra, arrastar no Modo Show e deslizar entre músicas.         | Scroll e swipe não competem; troca horizontal é intencional.               |
| Rolagem e Wake Lock | Iniciar/pausar/retomar, trocar velocidade e aguardar bloqueio.       | Rolagem estável; tela acesa quando suportado; retomada após segundo plano. |
| Safe areas          | Testar com barra de gestos e em paisagem.                            | Controles e navegação não ficam sob a barra do sistema.                    |
| Diagramas           | Abrir acordes, navegar por variações e conferir pestana/omissões.    | Diagrama correto e botões confortáveis ao toque.                           |
| Importação e edição | Importar cifra, editar, salvar, excluir e desfazer pela confirmação. | Feedback claro; exclusão só ocorre após confirmação.                       |
| Backup e sync       | Exportar, restaurar, entrar na nuvem, editar offline e reconectar.   | Sem perda/duplicação; conflitos e falhas de conexão visíveis.              |
| Offline             | Modo avião, recarregar e usar Biblioteca/Repertórios/Modo Show.      | Funcionalidades essenciais disponíveis offline.                            |

### 7.4. Desktop — Chromium

| Área                | Passo                                                         | Resultado esperado                                                         |
| ------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Navegação           | Biblioteca → música → repertório → Modo Show → voltar.        | Histórico e foco coerentes; Escape fecha menus e diagramas.                |
| Teclado e foco      | Renomear repertório, cancelar com Escape; abrir “Mais ações”. | Foco volta ao botão de origem; menus fecham e não prendem o foco.          |
| Scroll e swipe      | Rolar cifra longa; no Modo Show usar roda, teclado e arraste. | Rolagem automática e manual convivem sem saltos.                           |
| Diagramas           | Abrir diagrama, navegar por variações e fechar com Escape.    | Foco entra no painel, Escape fecha e devolve o foco ao acorde.             |
| Importação e edição | Importar individual/lote, revisar, salvar, editar e excluir.  | Estados de carregamento/sucesso/erro visíveis e sem duplo envio.           |
| Backup e sync       | Exportar duas vezes rápido, restaurar e sincronizar.          | Só uma exportação inicia; prévia e conflitos corretos; nenhuma duplicação. |
| Offline             | DevTools → offline, recarregar e navegar.                     | Shell e dados locais disponíveis; erros de rede são compreensíveis.        |
| Acessibilidade      | Percorrer com Tab, Shift+Tab, Enter, Espaço e Escape.         | Ordem de foco lógica, rótulos úteis e alvos de toque/click confortáveis.   |

### 7.5. Registro sugerido

Para cada aparelho, registrar: modelo, versão do sistema, navegador/PWA, data,
resultado por item (OK / falha), evidência (captura ou vídeo) e observações. Uma
falha deve ser tratada antes de declarar a etapa homologada fisicamente.

## 8. Pendências identificadas

- Homologação em iPhone Safari, iPhone com PWA, Android Chrome e desktop
  Chromium reais ainda não foi executada.
- A sincronização Supabase depende de configuração externa e de duas sessões
  reais; não foi validada em aparelhos nesta etapa.
- O comportamento do Wake Lock quando o iOS suspende a PWA em segundo plano
  precisa ser confirmado em aparelho físico.
- A instalação e a atualização de uma PWA já instalada no iPhone/iPad precisam
  ser confirmadas no aparelho.
- O compartilhamento/download de backup no iOS e a seleção de arquivo pela PWA
  instalada precisam de validação manual.

Nenhuma dessas pendências impede o uso local, mas nenhuma deve ser declarada
homologada sem o teste correspondente.

## 9. Escopo preservado e confirmação

- Nenhuma alteração na identidade visual aprovada.
- Nenhuma alteração na navegação estrutural.
- Nenhuma alteração no parser, na transposição ou na geração musical.
- Nenhuma alteração no banco, em migrations ou no formato persistido.
- Nenhuma alteração na sincronização ou nos contratos do Supabase.
- Nenhuma dependência adicionada.
- Nenhum recurso removido.
- Nenhum commit ou push realizados.
- Etapa 30 não iniciada.

O aplicativo permanece estável e pronto para a homologação final em dispositivos
físicos, mantendo o design aprovado e sem regressões funcionais conhecidas.
