# Migracao Dexie v5

A v5 adiciona o campo local `syncPending` a `songs`, `repertories` e
`repertoryItems`. O campo faz parte da outbox por registro:

- `true`: a versao local ainda precisa ser enviada;
- `false`: o backend confirmou a versao atualmente armazenada localmente.

Todos os registros existentes recebem `true` durante o upgrade. Nenhum registro
e removido, nenhum texto e reprocessado e nenhuma tabela da versao antiga e
tocada. A primeira sincronizacao, portanto, envia dados criados antes da
Etapa 8. A migracao e coberta por `migrations.test.ts`.

Cursores do pull, dono dos dados locais e horario da ultima sincronizacao ficam
na tabela `settings`, com as chaves `sync.cursor.*`, `sync.ownerUserId` e
`sync.lastSyncedAt`. Preferencias, favoritos e posicao do modo show continuam
locais por dispositivo e nao entram na outbox.
