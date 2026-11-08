# Evolução Dexie v5

A v5 adiciona o campo local `syncPending` a `songs`, `repertories` e
`repertoryItems`. O campo faz parte da outbox por registro:

- `true`: a versão local ainda precisa ser enviada;
- `false`: o backend confirmou a versão atualmente armazenada localmente.

Todos os registros existentes recebem `true` durante o upgrade. Nenhum registro
é removido, nenhum texto é reprocessado e nenhuma tabela da versão anterior é
tocada. A primeira sincronização envia dados criados antes da etapa de
sincronização. O comportamento é coberto por `migrations.test.ts`.

Cursores do pull, dono dos dados locais e horário da última sincronização ficam
na tabela `settings`, com as chaves `sync.cursor.*`, `sync.ownerUserId` e
`sync.lastSyncedAt`. Preferências, favoritos e posição do modo show continuam
locais por dispositivo e não entram na outbox.
