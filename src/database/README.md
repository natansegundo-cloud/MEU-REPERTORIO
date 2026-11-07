# Camada de banco local

A persistencia usa IndexedDB por meio do Dexie. Componentes nao acessam as
tabelas diretamente; servicos e hooks fazem essa fronteira.

## Banco atual

- Nome: `meu-repertorio-v2`
- Schema: `5`
- Tabelas: `songs`, `repertories`, `repertoryItems`, `favorites`,
  `preferences` e `settings`
- Exclusoes de entidades sao logicas e preservam tombstones.
- `revision` e incrementada em cada escrita sincronizavel.
- `syncPending` e a outbox por registro de musicas, repertorios e itens.

## Migracoes

As migracoes publicadas sao imutaveis e incrementais. Nenhuma migracao remove
registros ou reprocessa texto sem necessidade.

- v2: adiciona `deletedAt` e `structure` legada usando o parser existente;
- v3: adiciona campos editaveis de musica;
- v4: adiciona `preferredKey` aos itens de repertorio;
- v5: adiciona `syncPending` e marca registros anteriores como pendentes para a
  primeira sincronizacao.

`legacyId` e um identificador opcional usado pela migracao da V1; ele nao muda
o schema indexado do Dexie. Favoritos continuam locais e entram no backup JSON,
mas nao entram na sincronizacao com a nuvem.

Detalhes e o teste de preservacao da v5 estao em
[`MIGRATION_V5.md`](MIGRATION_V5.md) e `migrations.test.ts`.

## Integridade

- Escritas de musicas usam transacoes Dexie.
- Escritas que alteram repertorio e itens usam a mesma transacao.
- Editores verificam a revision observada antes de salvar.
- Exclusoes logicas incrementam a revision e entram na outbox.
- Cursores de pull, dono local e ultima sincronizacao ficam em `settings`.
- Preferencias, favoritos e posicao do modo show nao sincronizam nesta etapa.
