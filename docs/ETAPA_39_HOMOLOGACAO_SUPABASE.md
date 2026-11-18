# Etapa 39 — Homologação real da integração Supabase

**Etapa:** 39
**Data:** 17/11/2026
**Checkout:** `v2`
**Commit:** `ef9fcfc`
**Status:** diagnóstico e conectividade concluídos; homologação real **não concluída**.

Este documento separa três coisas que não devem ser confundidas:

1. o que está **implementado** no código;
2. o que foi **comprovado contra o projeto Supabase real**;
3. o que continua **pendente de conta, caixa de entrada, dispositivo ou confirmação manual**.

Nenhum valor de `.env`, URL de projeto, chave, token, cookie ou sessão é reproduzido
neste relatório. Nenhum dado pessoal real foi criado ou enviado. Nenhum SQL foi
executado e nenhuma migration foi aplicada.

## 1. Configuração encontrada

### 1.1 Arquivos e variáveis

| Verificação                                                | Resultado      | Classificação |
| ---------------------------------------------------------- | -------------- | ------------- |
| `.env` local existe                                        | sim            | **Aprovado**  |
| `.env` está ignorado pelo Git e não é rastreado            | sim            | **Aprovado**  |
| `VITE_SUPABASE_URL` presente e não vazia                   | sim            | **Aprovado**  |
| `VITE_SUPABASE_PUBLISHABLE_KEY` presente e não vazia       | sim            | **Aprovado**  |
| `.env.example` contém somente os dois nomes, sem valores   | sim            | **Aprovado**  |
| `service_role` ou chave administrativa no código rastreado | não encontrado | **Aprovado**  |

Validação feita apenas sobre o formato, sem imprimir conteúdo:

- a URL é absoluta, usa HTTPS, pertence a um host `*.supabase.co` e não possui
  caminho adicional;
- a chave usa o prefixo público `sb_publishable_`, não tem formato de JWT e
  possui tamanho mínimo compatível com uma chave publishable;
- nenhuma chave administrativa, token ou segredo foi encontrado no código.

### 1.2 Inicialização do cliente

`createSupabaseBackend()` retorna `null` quando uma das variáveis está ausente ou
quando a URL não é absoluta/HTTP(S). Com a configuração atual ele cria uma única
instância de `@supabase/supabase-js` com:

- `persistSession: true`;
- `autoRefreshToken: true`;
- `detectSessionInUrl: true`;
- `flowType: 'pkce'`.

Como as variáveis são `VITE_*`, elas são incorporadas no build. Alterar o `.env`
exige reiniciar o Vite ou gerar novo build.

O `CloudSyncController` registra `onAuthStateChange`, recupera a sessão com
`getSession` e somente cria o `SyncCoordinator` depois de obter um usuário. O
coordenador sincroniza `songs`, `repertories` e `repertoryItems` com as tabelas
`v2_songs`, `v2_repertories` e `v2_repertory_items`, usando as RPCs
`v2_upsert_songs`, `v2_upsert_repertories` e `v2_upsert_repertory_items`.

**Comprovação em navegador:** uma sondagem automatizada temporária abriu o build
de produção em Chromium, navegou até **Ajustes > Nuvem** e confirmou:

- o estado exibido foi **Desconectado**, não **Indisponível**;
- o botão **Entrar com Google** estava disponível;
- o formulário de e-mail estava visível;
- a mensagem “Configure as variáveis do Supabase” não apareceu.

Isso prova que o cliente foi inicializado no build com a configuração atual. Não
prova autenticação, sessão ou sincronização. O spec temporário foi removido.

## 2. Conectividade

Foram feitas somente requisições `GET` ao projeto configurado, exceto uma chamada
RPC com lote vazio (`p_rows: []`), que não insere nem altera registros. Nenhum
corpo de resposta, URL ou chave foi registrado.

| Sondagem                                | Resultado                    | Classificação                      |
| --------------------------------------- | ---------------------------- | ---------------------------------- |
| `/auth/v1/settings`                     | HTTP 200                     | **Aprovado**                       |
| `/auth/v1/health`                       | HTTP 200                     | **Aprovado**                       |
| Provider de e-mail habilitado           | sim                          | **Aprovado**                       |
| Provider Google habilitado              | sim                          | **Aprovado**                       |
| Cadastro por e-mail habilitado          | sim                          | **Aprovado**                       |
| Confirmação automática de e-mail        | desabilitada                 | **Aprovado**                       |
| Autorização Google inicia o fluxo       | HTTP 302 para host do Google | **Aprovado**                       |
| Leitura anônima de `v2_songs`           | HTTP 401                     | **Aprovado** (recusa)              |
| Leitura anônima de `v2_repertories`     | HTTP 401                     | **Aprovado** (recusa)              |
| Leitura anônima de `v2_repertory_items` | HTTP 401                     | **Aprovado** (recusa)              |
| Tabela inexistente, para comparação     | HTTP 404                     | **Aprovado** (controle)            |
| Colunas esperadas nas três tabelas      | HTTP 401                     | **Aprovado** (existência aparente) |
| Coluna inexistente, para comparação     | HTTP 400                     | **Aprovado** (controle)            |
| RPC `v2_upsert_songs` anônima           | HTTP 401                     | **Aprovado** (recusa)              |
| RPC `v2_upsert_repertories` anônima     | HTTP 401                     | **Aprovado** (recusa)              |
| RPC `v2_upsert_repertory_items` anônima | HTTP 401                     | **Aprovado** (recusa)              |
| RPC inexistente, para comparação        | HTTP 404                     | **Aprovado** (controle)            |
| Verificação OTP inválida contra o Auth  | HTTP 403                     | **Aprovado** (teste negativo)      |

Interpretação correta:

- a mesma chave publishable foi aceita em `/auth/v1/settings`, portanto o HTTP 401
  nas tabelas não é simplesmente “chave inválida”;
- a diferença entre 404 (tabela/RPC inexistente), 400 (coluna inexistente) e 401
  (objeto existente, acesso negado) é evidência de que as três tabelas, as colunas
  esperadas e as três RPCs existem no schema exposto pelo PostgREST;
- **HTTP 401 anônimo não comprova RLS**. A migration revoga privilégios de `anon`,
  o que já produz recusa mesmo que uma política estivesse ausente. RLS, políticas,
  chaves primárias, índices, triggers e grants só podem ser confirmados com uma
  sessão autenticada e/ou no painel do Supabase.

Conclusão da fase: o projeto está acessível, a chave pública é aceita e o acesso
anônimo às tabelas e RPCs foi recusado. A proteção entre usuários autenticados
continua não comprovada.

## 3. Situação da migration

Arquivo inspecionado: `supabase/migrations/202611070001_v2_sync.sql`.

### 3.1 Checklist estático do SQL

| Item                                                                         | Situação no arquivo                            |
| ---------------------------------------------------------------------------- | ---------------------------------------------- |
| Tabelas `v2_songs`, `v2_repertories`, `v2_repertory_items`                   | definidas                                      |
| Chave primária composta `(user_id, id)` nas três                             | definida                                       |
| `user_id` com `default auth.uid()` e FK para `auth.users`                    | definido, com `on delete cascade`              |
| `revision` inteira, positiva, com `check (revision > 0)`                     | definido                                       |
| `deleted_at` para tombstones                                                 | definido                                       |
| `created_at` e `updated_at`                                                  | definidos, com default UTC                     |
| Índices `(user_id, updated_at)`                                              | três índices                                   |
| Função `v2_set_updated_at()`                                                 | definida                                       |
| Triggers `before insert or update` nas três tabelas                          | definidos                                      |
| RLS habilitado nas três tabelas                                              | definido                                       |
| `revoke all` de `anon`                                                       | definido                                       |
| `grant select, insert, update, delete` para `authenticated`                  | definido                                       |
| Políticas de select, insert, update e delete por tabela                      | 12 políticas, todas por `auth.uid() = user_id` |
| `with check` em insert e update                                              | definido                                       |
| RPCs `v2_upsert_songs`, `v2_upsert_repertories`, `v2_upsert_repertory_items` | definidas                                      |
| RPCs `security invoker` com `search_path = public`                           | definido                                       |
| RPC exige usuário autenticado e valida `row_data.user_id`                    | definido                                       |
| RPC aplica “maior revision vence; empate mantém o servidor”                  | definido                                       |
| `execute` das RPCs revogado de `public` e `anon`                             | definido                                       |
| `execute` das RPCs concedido a `authenticated`                               | definido                                       |

### 3.2 Confirmação remota

| Item                                         | Situação                         | Classificação          |
| -------------------------------------------- | -------------------------------- | ---------------------- |
| Tabelas e colunas esperadas expostas         | evidência indireta via PostgREST | **Aprovado** (parcial) |
| RPCs esperadas expostas                      | evidência indireta via PostgREST | **Aprovado** (parcial) |
| Chaves primárias compostas                   | não confirmado no painel         | **Pendente**           |
| Índices                                      | não confirmado no painel         | **Pendente**           |
| Triggers de `updated_at`                     | não confirmado no painel         | **Pendente**           |
| RLS efetivamente habilitado                  | não confirmado no painel         | **Pendente**           |
| Políticas e `with check`                     | não confirmado no painel         | **Pendente**           |
| Grants de `anon` e `authenticated`           | não confirmado no painel         | **Pendente**           |
| Permissões de execução das RPCs              | não confirmado no painel         | **Pendente**           |
| Migration aplicada exatamente como o arquivo | não confirmado                   | **Pendente**           |

O projeto responder e as tabelas aparecerem no PostgREST **não** provam que a
migration foi aplicada integralmente nem que o SQL remoto corresponde ao arquivo
versionado. A confirmação exige inspeção manual no painel/SQL Editor do projeto
alvo, sem executar SQL novo.

### 3.3 Pontos de atenção da migration

- Não há FK de `v2_repertory_items.repertory_id` para `v2_repertories` nem de
  `song_id` para `v2_songs`; a integridade referencial dos itens depende do
  cliente local.
- Não há restrição de unicidade para `(user_id, repertory_id, song_id)`. A
  aplicação evita duplicatas na interface, mas o servidor não as impede.
- O índice de pull é `(user_id, updated_at)` e não inclui `id`; a ordenação por
  `(updated_at, id)` pode exigir ordenação adicional em páginas grandes.
- Os tombstones não são limpos automaticamente, por decisão documentada.

## 4. Autenticação real

Legenda: **Aprovado** = executado e comprovado; **Pendente** = depende de conta,
caixa de entrada, provider ou dispositivo.

### 4.1 Magic Link

| Cenário                                         | Situação                                      | Classificação |
| ----------------------------------------------- | --------------------------------------------- | ------------- |
| Solicitar link pela interface                   | código implementado; envio real não executado | **Pendente**  |
| Receber o e-mail em caixa autorizada            | não houve caixa autorizada                    | **Pendente**  |
| Abrir o link e concluir a autenticação          | não executado                                 | **Pendente**  |
| Confirmar sessão                                | não executado                                 | **Pendente**  |
| Fechar e reabrir o aplicativo mantendo a sessão | não executado                                 | **Pendente**  |

Implementação presente: `signInWithOtp` com `emailRedirectTo` igual à origem da
aplicação, `detectSessionInUrl` e PKCE. O fluxo não armazena token manualmente.

### 4.2 OTP por e-mail

| Cenário                                | Situação                                                                | Classificação |
| -------------------------------------- | ----------------------------------------------------------------------- | ------------- |
| Solicitar código pela interface        | código implementado; envio real não executado                           | **Pendente**  |
| Receber código de seis dígitos         | não houve caixa autorizada                                              | **Pendente**  |
| Confirmar código válido                | não executado                                                           | **Pendente**  |
| Rejeitar código inválido no aplicativo | endpoint real respondeu 403; fluxo completo não executado               | **Pendente**  |
| Rejeitar código expirado no aplicativo | não executado                                                           | **Pendente**  |
| Reenviar código após o intervalo       | lógica de 30 s coberta por teste automatizado; envio real não executado | **Pendente**  |

O teste negativo chamou apenas o endpoint de verificação com um endereço
inexistente e código fictício, sem criar conta e sem enviar e-mail. Ele confirma
que o endpoint responde 403 para credencial inválida, mas não substitui o teste
de expiração/reenvio com uma conta real.

### 4.3 Google OAuth

| Cenário                                    | Situação                          | Classificação |
| ------------------------------------------ | --------------------------------- | ------------- |
| Provider Google habilitado no Supabase     | confirmado em `/auth/v1/settings` | **Aprovado**  |
| Iniciar o fluxo e receber redirecionamento | HTTP 302 para host do Google      | **Aprovado**  |
| Concluir consentimento e autenticar        | não executado                     | **Pendente**  |
| Retornar à origem correta                  | não executado                     | **Pendente**  |
| Manter sessão após reabrir                 | não executado                     | **Pendente**  |

O redirecionamento inicial não prova que o Client ID/Secret, as origens
autorizadas e o callback do Google estão corretos para o aplicativo. Esses pontos
só se confirmam concluindo o login real.

### 4.4 Sessão e logout

| Cenário                        | Situação                                                  | Classificação |
| ------------------------------ | --------------------------------------------------------- | ------------- |
| Sessão persistente em desktop  | não executado                                             | **Pendente**  |
| Renovação automática de token  | não observada em sessão real                              | **Pendente**  |
| Logout sem apagar dados locais | coberto por teste automatizado; sessão real não executada | **Pendente**  |

Nenhum método de autenticação pode ser declarado homologado nesta etapa.

## 5. Sincronização real entre ambientes

Não havia duas contas/ambientes autorizados com a mesma conta para executar o
roteiro. Nenhum dado de teste foi criado no projeto remoto.

| Cenário                                     | Situação                    | Classificação |
| ------------------------------------------- | --------------------------- | ------------- |
| Criar música no ambiente A e sincronizar    | não executado               | **Pendente**  |
| Receber a música no ambiente B              | não executado               | **Pendente**  |
| Editar no B e refletir no A                 | não executado               | **Pendente**  |
| Criar repertório e adicionar músicas        | não executado               | **Pendente**  |
| Alterar ordem, tom próprio e remover item   | não executado               | **Pendente**  |
| Confirmar propagação de todas as alterações | não executado               | **Pendente**  |
| Ausência de duplicatas                      | não executado               | **Pendente**  |
| Persistência após recarregar                | não executado               | **Pendente**  |
| Ausência de sincronizações repetidas        | não medido em ambiente real | **Pendente**  |
| Tombstones após exclusão                    | não executado               | **Pendente**  |
| Conflito de revisão entre dois ambientes    | não executado               | **Pendente**  |
| Recuperação após falha de conexão           | não executado               | **Pendente**  |

O que existe e foi validado de forma **automatizada**, com backend em memória e
IndexedDB falso:

- pull antes do push, na ordem músicas → repertórios → itens;
- cursor composto `(updated_at, id)` e margem de dois minutos;
- outbox por `syncPending`, lotes de 50 e reenvio individual em falha de lote;
- idempotência, tombstones, conflito por `revision` e bloqueio de conta divergente;
- paginação com `updated_at` idêntico usando `id` como desempate;
- fila de uma nova sincronização durante uma sincronização em andamento.

Esses testes são **testes automatizados simulados**. Eles não são homologação real
e não provam que as RPCs, o RLS ou o relógio do servidor se comportam assim no
projeto remoto.

## 6. Isolamento entre contas

| Cenário                                      | Situação                  | Classificação |
| -------------------------------------------- | ------------------------- | ------------- |
| Conta A cria dados                           | não executado             | **Pendente**  |
| Conta B consulta os dados de A               | não executado             | **Pendente**  |
| Conta B altera ou exclui dados de A          | não executado             | **Pendente**  |
| RPCs respeitam o usuário autenticado         | não executado             | **Pendente**  |
| Conta diferente no mesmo armazenamento local | apenas teste automatizado | **Pendente**  |

Evidências parciais, que **não** substituem o teste entre contas:

- leitura anônima das três tabelas recusada com HTTP 401;
- RPCs anônimas recusadas com HTTP 401;
- o adaptador rejeita resposta remota cujo `user_id` não corresponde à sessão;
- o coordenador bloqueia sincronização quando `sync.ownerUserId` diverge da conta
  autenticada e a interface oferece manter os dados locais separados;
- há teste automatizado para esse bloqueio.

A segunda conta de teste autorizada não existia nesta execução. Sem ela, não é
possível afirmar que o RLS isola corretamente os usuários no projeto real.

## 7. Offline e PWA

### 7.1 Comportamento local automatizado

| Cenário                                         | Situação               | Classificação               |
| ----------------------------------------------- | ---------------------- | --------------------------- |
| Navegação essencial sem rede                    | E2E em Chromium        | **Aprovado** (automatizado) |
| Criar e editar repertório offline               | E2E em Chromium        | **Aprovado** (automatizado) |
| Recarregar o shell sem internet                 | E2E com Service Worker | **Aprovado** (automatizado) |
| Dados locais disponíveis após recarregar        | E2E                    | **Aprovado** (automatizado) |
| Instalação/manifest e ícones                    | E2E                    | **Aprovado** (automatizado) |
| Shell offline em WebKit simulado de iPhone/iPad | E2E                    | **Aprovado** (automatizado) |

### 7.2 Offline com sincronização real

| Cenário                               | Situação      | Classificação |
| ------------------------------------- | ------------- | ------------- |
| Criar música offline autenticado      | não executado | **Pendente**  |
| Editar repertório offline autenticado | não executado | **Pendente**  |
| Reconectar e enviar pendências reais  | não executado | **Pendente**  |
| Fechar e reabrir recuperando a sessão | não executado | **Pendente**  |
| Falha de rede durante request real    | não executado | **Pendente**  |

O funcionamento offline local está bem coberto por testes automatizados. O ciclo
offline → reconexão → Supabase real continua pendente.

## 8. Resultado por plataforma

| Contexto                                  | O que foi feito                                       | Classificação               |
| ----------------------------------------- | ----------------------------------------------------- | --------------------------- |
| Navegador desktop (Chromium real)         | build, abertura, navegação, suíte E2E; sem login real | **Aprovado** (automatizado) |
| Navegador mobile (Chrome emulado Pixel 7) | suíte E2E mobile                                      | **Aprovado** (automatizado) |
| WebKit iPhone/iPad simulado               | testes de PWA/manifest/offline                        | **Aprovado** (automatizado) |
| Safari em iPhone real                     | não executado                                         | **Pendente**                |
| PWA instalada na Tela de Início do iPhone | não executado                                         | **Pendente**                |
| Android real                              | não executado                                         | **Pendente**                |
| Sessão compartilhada entre Safari e PWA   | não testada e não presumida                           | **Pendente**                |

Safari e PWA instalada podem ter `localStorage`, IndexedDB e cookies separados.
A implementação não tenta compartilhar sessão entre contextos. A conclusão sobre
esses ambientes exige dispositivo físico.

## 9. Testes automatizados

Comandos executados nesta etapa, com a árvore limpa:

| Comando                           | Resultado                                 |
| --------------------------------- | ----------------------------------------- |
| `npm run typecheck`               | passou                                    |
| `npm run lint`                    | passou                                    |
| `npm run format:check`            | passou                                    |
| `npm run build`                   | passou; PWA gerou 22 entradas de precache |
| `npm test`                        | 47 arquivos, 272 testes passaram          |
| `npx playwright test --workers=1` | 69 passaram, 1 ignorado                   |

O teste ignorado é o arrasto por mouse no projeto mobile, ignorado de forma
intencional porque o dispositivo emulado usa toque. Nenhum teste falhou.

Também foi executada uma sondagem Playwright temporária, em Chromium, para
confirmar a inicialização do cliente e o estado **Desconectado** na tela Nuvem.
Ela passou e foi removida em seguida.

**Importante:** toda a suíte acima é composta por testes automatizados/simulados.
Ela valida o comportamento do código, não a autenticação, o RLS ou a sincronização
no projeto Supabase real.

## 10. Pendências externas

Para concluir a homologação, são necessários:

1. **Conta de teste autorizada** com caixa de entrada descartável, sem dados
   pessoais reais.
2. **Segunda conta de teste** para o teste de isolamento entre usuários.
3. **Conta Google de teste** autorizada no projeto OAuth, caso o consentimento
   ainda esteja em modo de teste.
4. **Confirmação manual no painel Supabase** de que a migration
   `202611070001_v2_sync.sql` foi aplicada no projeto correto e de que PKs,
   índices, triggers, RLS, políticas e grants conferem com o arquivo.
5. **Dois ambientes independentes** (por exemplo, dois perfis de navegador ou
   desktop + celular) autenticados na mesma conta para executar o roteiro de
   sincronização.
6. **iPhone real** com Safari e PWA instalada para validar sessão, retorno do
   OAuth/Magic Link e offline.
7. **Site URL e Redirect URLs** do Supabase contendo a origem exata usada no
   teste; o retorno de Magic Link/Google depende disso.
8. **Template de OTP** exibindo `{{ .Token }}` e política de expiração/limite
   adequada ao teste.
9. **Controle de rede** para simular falha durante o request e reconexão.

Nenhum desses itens deve ser contornado com valores inventados, chave
administrativa ou alteração do projeto remoto.

## 11. Problemas encontrados no código

Nenhum defeito funcional foi comprovado pelos testes executados. As observações
abaixo vêm da leitura do código e devem ser confirmadas em ambiente real antes de
qualquer alteração; nenhuma foi corrigida nesta etapa.

### 11.1 Possível sincronização duplicada na inicialização

**Causa:** o `CloudSyncController` registra `onAuthStateChange` e também chama
`getSession()` no `start()`. O Supabase emite `INITIAL_SESSION` para novos
assinantes e `getSession()` resolve a mesma sessão. Com uma sessão persistida, os
dois caminhos chamam `handleSession`, que recria o `SyncCoordinator` e chama
`syncNow()`.

**Impacto possível:** dois pulls/pushes no início da sessão, com coordenação
parcial, já que cada chamada pode substituir o coordenador. O servidor é
idempotente e o cursor é monotônico, então o risco esperado é de requisições
redundantes e avisos repetidos, não de perda de dados.

**Situação:** não reproduzido em ambiente real nesta etapa; o item “ausência de
sincronizações repetidas” permanece **Pendente**. Não alterar o módulo de sync
sem medir o comportamento real e cobrir a correção com teste.

### 11.2 “Manter local separado” não é durável

**Causa:** `keepLocalSeparate()` marca `accountBlocked` apenas em memória e anula
o coordenador, mas o `SyncCoordinator` já criado mantém seu timer de retry. Um
novo evento de sessão (`INITIAL_SESSION`, `TOKEN_REFRESHED`) ou uma recarga zera
`accountBlocked` e recria o coordenador.

**Impacto possível:** o estado de conta divergente reaparece após renovação de
token ou recarga, e o retry do coordenador antigo continua fazendo leituras
locais periódicas. Não há perda de dados e o `runOnce` falha antes de qualquer
pull/push quando o dono diverge.

**Situação:** comportamento observado por leitura de código; não executado com
duas contas reais.

### 11.3 Integridade referencial remota dos itens

**Causa:** a migration não cria FK para `repertory_id`/`song_id` nem unicidade de
música por repertório.

**Impacto possível:** um cliente com defeito poderia gravar item órfão ou repetido
no Supabase. A interface e os serviços locais evitam esse cenário hoje.

**Situação:** risco de integridade, não defeito observado. A correção exigiria
alteração de migration e não faz parte desta homologação.

### 11.4 Limite da evidência de RLS

O HTTP 401 anônimo é compatível com a migration, mas não distingue “privilégio de
tabela revogado” de “RLS ativo”. A aprovação de RLS continua dependendo de uma
sessão autenticada e de uma segunda conta.

## 12. Conclusão sobre o estado real da integração

| Área                                                         | Classificação          |
| ------------------------------------------------------------ | ---------------------- |
| Configuração local e formato das variáveis                   | **Aprovado**           |
| Inicialização do cliente no build                            | **Aprovado**           |
| Conectividade com o projeto                                  | **Aprovado**           |
| Recusa de acesso anônimo a tabelas e RPCs                    | **Aprovado**           |
| Existência aparente de tabelas, colunas e RPCs               | **Aprovado** (parcial) |
| Aplicação integral da migration no remoto                    | **Pendente**           |
| Magic Link real                                              | **Pendente**           |
| OTP real (envio, código válido, inválido, expirado, reenvio) | **Pendente**           |
| Google OAuth real                                            | **Pendente**           |
| Persistência de sessão                                       | **Pendente**           |
| Sincronização real entre dois ambientes                      | **Pendente**           |
| Isolamento entre duas contas                                 | **Pendente**           |
| Offline → reconexão com sessão real                          | **Pendente**           |
| Safari e PWA instalada em iPhone                             | **Pendente**           |
| Testes automatizados locais                                  | **Aprovado**           |

**A integração não está homologada.** O que se pode afirmar com segurança é:

- a configuração existe e tem formato compatível com uma chave publishable;
- o cliente Supabase é inicializado no build;
- o projeto configurado responde e aceita a chave pública;
- há evidência de que as três tabelas, as colunas esperadas e as três RPCs
  existem no schema exposto;
- o acesso anônimo foi recusado;
- o provider Google está habilitado e inicia o redirecionamento;
- a suíte automatizada está verde.

O que **não** se pode afirmar:

- que a migration foi aplicada integralmente e corresponde ao arquivo;
- que o RLS isola corretamente duas contas;
- que Magic Link, OTP ou Google concluem a autenticação real;
- que a sessão persiste ao fechar e reabrir;
- que músicas, repertórios e itens sincronizam entre dois ambientes reais sem
  duplicatas, com tombstones, conflitos e recuperação de falha;
- que Safari e PWA instalada compartilham ou preservam sessão.

Pelo critério da etapa, como os testes essenciais continuam pendentes, a
integração **não pode ser declarada homologada**. O próximo passo é executar o
roteiro das seções 4 a 8 com as contas, a caixa de entrada, o painel e os
dispositivos listados na seção 10, registrando os resultados no lugar das
classificações **Pendente**.

Nenhum arquivo de código, migration, banco local ou contrato de sincronização foi
alterado. Nenhum commit ou push foi feito; a árvore permanece limpa no commit
`ef9fcfc`.
