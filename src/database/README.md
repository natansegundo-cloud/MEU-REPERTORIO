# Camada de banco local

A persistência usa IndexedDB por meio do Dexie. Componentes não acessam as
tabelas diretamente; serviços e hooks fazem essa fronteira.

## Banco atual

- Nome: `meu-repertorio-v2`
- Schema: `5`
- Tabelas: `songs`, `repertories`, `repertoryItems`, `favorites`,
  `preferences` e `settings`
- Exclusões de entidades são lógicas e preservam tombstones.
- `revision` é incrementada em cada escrita sincronizável.
- `syncPending` é a outbox por registro de músicas, repertórios e itens.

## Evolução do schema

As versões publicadas são imutáveis e incrementais. Nenhuma versão remove
registros ou reprocessa texto sem necessidade.

- v2: adiciona `deletedAt` e `structure` usando o parser existente;
- v3: adiciona campos editáveis de música;
- v4: adiciona `preferredKey` aos itens de repertório;
- v5: adiciona `syncPending` e marca registros anteriores como pendentes para a
  primeira sincronização.

Favoritos continuam locais e não entram na sincronização com a nuvem.

Detalhes e o teste de preservação da v5 estão em
[`SCHEMA_V5.md`](SCHEMA_V5.md) e `migrations.test.ts`.

## Integridade

- Escritas de músicas usam transações Dexie.
- Escritas que alteram repertório e itens usam a mesma transação.
- Editores verificam a revision observada antes de salvar.
- Exclusões lógicas incrementam a revision e entram na outbox.
- Cursores de pull, dono local e última sincronização ficam em `settings`.
- Preferências, favoritos e posição do modo show não sincronizam nesta etapa.
