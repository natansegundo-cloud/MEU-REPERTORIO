# Supabase da V2

Esta pasta contem apenas SQL para aplicacao manual. O Codex nao executa este
SQL e a aplicacao nao altera as tabelas antigas (`songs`, `setlists` ou o
bucket de PDFs).

## Modelo

- `v2_songs`: uma linha por musica, incluindo `content` original e `structure`
  em JSONB.
- `v2_repertories`: uma linha por repertorio.
- `v2_repertory_items`: uma linha por item, com `position` e `preferred_key`.
- Cada chave e `(user_id, id)` e cada tabela possui `revision`, `deleted_at` e
  `updated_at`.
- `updated_at` e mantido pelo trigger do servidor e serve como cursor de pull.
- Exclusoes sao tombstones. Nao existe limpeza automatica nesta etapa.

As funcoes `v2_upsert_*` aplicam a regra de conflito no servidor: revision
maior vence; em empate, a versao que ja esta no servidor vence. O reenvio do
mesmo registro e idempotente, e o relogio local nunca decide o conflito.

Preferencias de leitura, favoritos e posicao atual do modo show continuam
locais por dispositivo e nao sao enviados.

## Aplicacao segura

1. Crie ou escolha um projeto Supabase de teste separado do projeto usado pela
   versao antiga.
2. No SQL Editor, execute o arquivo
   `migrations/202611070001_v2_sync.sql` inteiro, sem misturar com os SQL da
   versao antiga.
3. Confira as tabelas, indices, triggers, funcoes e politicas usando o
   checklist abaixo.
4. Configure apenas `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_PUBLISHABLE_KEY` no ambiente da V2. A chave publishable pode
   ficar no frontend; nenhuma chave administrativa deve ser usada.
5. Teste login, pull, push, exclusao e dois aparelhos no projeto de teste.
6. Repita o mesmo arquivo no projeto real somente depois de revisar o diff do
   SQL e confirmar que as tabelas antigas continuam intactas.

## Checklist RLS

Para cada tabela `v2_songs`, `v2_repertories` e `v2_repertory_items`, confirme:

- RLS esta habilitado.
- `anon` nao possui privilegios de tabela.
- `authenticated` possui somente select/insert/update/delete necessarios.
- A politica de select usa `(select auth.uid()) = user_id`.
- Insert e update exigem `(select auth.uid()) = user_id` em `with check`.
- Delete, embora nao seja usado pelo app, esta limitado ao proprio usuario.
- As funcoes `v2_upsert_*` podem ser executadas por `authenticated`, mas nao
  por `anon`.
- Um usuario autenticado nao consegue consultar ou alterar o id de outro
  usuario.
- `updated_at` muda no servidor em insert e update.

## Rollback

Nao ha rollback automatico porque as tabelas sao novas e os tombstones devem
ser preservados. Se o teste precisar ser desfeito, exporte ou inspecione os
dados primeiro e depois remova manualmente, na ordem abaixo, somente no projeto
de teste:

```sql
drop function if exists public.v2_upsert_repertory_items(jsonb);
drop function if exists public.v2_upsert_repertories(jsonb);
drop function if exists public.v2_upsert_songs(jsonb);
drop table if exists public.v2_repertory_items;
drop table if exists public.v2_repertories;
drop table if exists public.v2_songs;
drop function if exists public.v2_set_updated_at();
```

No projeto real, prefira manter as tabelas e corrigir uma nova migracao. Nao
apague tombstones como parte deste rollback.
