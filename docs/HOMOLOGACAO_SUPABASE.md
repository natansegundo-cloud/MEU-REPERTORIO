# Homologação real do Supabase — Meu Repertório V2

**Etapa:** 13
**Data:** 08/11/2026
**Checkout:** `v2`
**Status:** diagnóstico concluído; homologação autenticada bloqueada por configuração local e ausência de conta de teste autorizada.

## 1. Arquitetura encontrada

O aplicativo continua offline-first. O IndexedDB/Dexie é a fonte local principal; o Supabase é um backend opcional iniciado somente quando `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` estão disponíveis.

O fluxo está separado em camadas:

- `src/sync/supabase-backend.ts`: cliente Supabase, magic link, sessão, pull REST e push por RPC.
- `src/sync/controller.ts`: estado da nuvem, autenticação, eventos online/offline, visibilidade e mensagens para a interface.
- `src/sync/coordinator.ts`: pull incremental, push, outbox por registro, cursores, retry, idempotência e conflitos.
- `src/sync/mappers.ts`: conversão entre entidades locais e colunas remotas.
- `src/sync/metadata.ts`: dono local, cursores, última sincronização e contagem de pendências/erros.
- `src/features/settings/CloudPage.tsx`: login por magic link, sincronização manual, logout e estados de erro/offline.

Cada registro sincronizado mantém `id`, `revision`, `createdAt`, `updatedAt`, `deletedAt`, `syncPending` e `syncError` localmente. O push considera somente registros pendentes. O pull ocorre antes do push, na ordem músicas, repertórios e itens de repertório.

## 2. Estrutura remota e RLS inspeculados

A migration manual `supabase/migrations/202611070001_v2_sync.sql` define somente:

- `public.v2_songs`;
- `public.v2_repertories`;
- `public.v2_repertory_items`;
- índices por `(user_id, updated_at)`;
- trigger de `updated_at` mantido pelo servidor;
- RPCs `v2_upsert_songs`, `v2_upsert_repertories` e `v2_upsert_repertory_items`.

As três tabelas possuem chave primária composta por `(user_id, id)`, referência de `user_id` para `auth.users`, `revision` positiva e `deleted_at` para tombstones.

A inspeção estática da migration confirmou:

- RLS habilitado nas três tabelas;
- privilégios de tabela removidos de `anon`;
- privilégios necessários concedidos a `authenticated`;
- políticas de select, insert, update e delete limitadas a `(select auth.uid()) = user_id`;
- `with check` aplicado a insert e update;
- RPCs executáveis por `authenticated`, não por `anon`;
- RPCs `security invoker`, com verificação explícita de `auth.uid()` e `row_data.user_id`;
- conflito remoto decidido por `revision`, sem usar o relógio local;
- tombstones preservados, sem limpeza automática.

Essa é uma inspeção do SQL versionado. Ela não prova que a migration foi executada no projeto remoto atual.

## 3. Recursos sincronizados

Atualmente são sincronizados:

- músicas, incluindo conteúdo original, metadados e estrutura de cifras;
- repertórios;
- itens de repertório, posição e tom preferido do item.

Permanecem locais por dispositivo, conforme o comportamento atual documentado:

- favoritos;
- preferências de leitura/interface;
- posição atual do modo show;
- configurações e cursores internos de sincronização.

Não foi implementada sincronização adicional nesta etapa.

## 4. Segurança e integridade

Não foram encontrados `service_role`, tokens administrativos ou segredos embutidos no código rastreado. O frontend usa somente a chave publishable configurada por `VITE_SUPABASE_PUBLISHABLE_KEY`.

O cliente Supabase está configurado com sessão persistente, renovação automática de token e detecção de sessão no retorno do magic link. O logout encerra a sessão e não apaga a biblioteca local.

Além do filtro RLS esperado no servidor, o adaptador agora rejeita respostas remotas cujo `user_id` não corresponda à sessão ativa. Também rejeita resposta RPC com formato não-array e configuração de URL inválida. Isso é defesa em profundidade; não substitui RLS.

A conta registrada em `sync.ownerUserId` bloqueia a sincronização quando uma conta diferente entra no mesmo armazenamento local. A interface oferece manter os dados separados ou sair da conta. Os dados locais não são apagados automaticamente.

## 5. Problemas encontrados e correções realizadas

### Problemas encontrados

1. **Configuração incompatível no checkout:** o `.env` local possui nomes `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, mas o V2 lê exclusivamente `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. Consequentemente, a aplicação V2 exibe a nuvem como indisponível.
2. **Homologação autenticada indisponível:** não há conta de teste/inbox autorizada fornecida nesta execução para validar magic link, leitura, gravação ou RLS entre usuários.
3. **Migration remota não comprovada:** o SQL existente é manual e não foi executado pelo Codex. A resposta anônima da API não comprova que as tabelas, políticas e RPCs do projeto alvo correspondem exatamente ao arquivo versionado.

### Correções realizadas

- Adicionada validação de `user_id` nas respostas de pull e push do adaptador Supabase.
- Adicionada rejeição de respostas RPC com formato inválido.
- Adicionada validação de protocolo da URL antes de criar o cliente.
- Adicionados testes unitários do adaptador para sessão, magic link, logout, pull paginado, RPC, erros e resposta de outra conta.

Não foram alteradas tabelas, migrations, parser, motor musical, dados locais ou a versão antiga.

## 6. Validações executadas

### Testado neste checkout

- `npm run typecheck`: passou.
- `npm run lint`: passou.
- `npm run format:check`: passou na validação final.
- `npm run validate`: passou; typecheck, lint, 27 arquivos de teste Vitest, 139 testes e build de produção.
- `npm run test:e2e`: passou; 36 testes em Chromium desktop e mobile-chrome.
- Testes direcionados de sincronização e adaptador: 2 arquivos, 18 testes aprovados.
- Testes locais existentes de sincronização: cobrem pull/push, idempotência, duplicação, tombstones, conflitos de revisão, falha de lote, erro por registro, cursor, fila e isolamento de conta.
- Testes de interface da nuvem: cobrem indisponibilidade, desconectado, sincronizando, erro de sessão e offline com backend controlado.

### Sondagem externa segura

Foi feita somente uma sondagem GET, sem gravação, login ou exposição de valores:

- endpoint de configurações de autenticação: **HTTP 200**;
- leitura anônima de `v2_songs`: **HTTP 401**.

Os valores usados vieram dos nomes `NEXT_PUBLIC_*` já presentes no ambiente local e não são usados pelo build Vite atual. O corpo das respostas, URL e chave não foram registrados.

O HTTP 401 é compatível com a proteção esperada para acesso anônimo, mas não é evidência suficiente para aprovar RLS. Ainda falta testar uma sessão autenticada própria e uma sessão de outra conta.

### Não testado por falta de configuração externa

- recebimento e consumo de magic link;
- criação de sessão autenticada real;
- leitura e gravação autenticadas;
- RLS com duas contas de teste;
- sincronização entre duas sessões/dispositivos reais;
- criação offline e recuperação após reconexão real;
- edição concorrente, conflito e tombstone no Supabase real;
- repetição de sincronização real sem duplicação;
- falha de internet durante request real e recuperação posterior;
- execução da migration no projeto remoto atual.

Nenhum desses resultados foi inventado ou considerado aprovado.

## 7. Configuração necessária para concluir a homologação

O usuário precisa fornecer/configurar, no ambiente local do checkout V2, sem enviar os valores no chat ou no relatório:

1. Copiar os mesmos valores do projeto de teste para as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no `.env` da V2. Não usar `service_role`.
2. Reiniciar o Vite/preview depois de alterar o `.env`, pois as variáveis são incorporadas no build.
3. Confirmar que `202611070001_v2_sync.sql` foi aplicada primeiro em um projeto Supabase de teste, sem executar migration destrutiva.
4. Configurar no Supabase Auth o Site URL e as Redirect URLs correspondentes ao endereço local e ao deploy da V2.
5. Disponibilizar uma caixa de entrada descartável/autorizada para receber o magic link. Não é necessário fornecer senha ou token ao Codex.
6. Para RLS, usar uma segunda conta de teste ou dois perfis de navegador, sem dados pessoais reais.

Depois disso, a homologação deve repetir os cenários de autenticação, leitura, gravação, isolamento por usuário, duas sessões, offline/reconexão, conflitos, exclusões e idempotência.

## 8. Riscos atuais

- Com os nomes atuais do `.env`, a nuvem da V2 permanece desativada e o usuário pode interpretar o funcionamento local como sincronização disponível.
- A migration manual pode não estar aplicada, estar aplicada em outro projeto ou ter políticas divergentes; isso só pode ser confirmado no painel/SQL Editor do projeto alvo.
- Favoritos, preferências e posição do show não são recuperados em outro aparelho pelo Supabase atual; o backup manual da Etapa 12 continua sendo a proteção para esses dados.
- A confiança definitiva na segurança entre contas depende do teste RLS autenticado, não apenas da inspeção estática ou da resposta anônima 401.

## 9. Conclusão

A arquitetura local e o núcleo de sincronização estão implementados e possuem cobertura automatizada controlada. A análise estática da migration indica uma política de isolamento adequada, e o endpoint anônimo não permitiu leitura de `v2_songs`.

A homologação real da Etapa 13 **não está concluída** porque o build V2 não possui as variáveis `VITE_*` configuradas e não há uma conta de teste/inbox autorizada para executar autenticação e sincronização destrutiva controlada. O próximo passo depende dessa configuração externa; não avançar para uma nova etapa até repetir os testes reais e registrar seus resultados.
