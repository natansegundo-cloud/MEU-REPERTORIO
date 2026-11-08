# Sincronização

O módulo de sync é opcional e permanece independente de React. O app continua
funcionando sem login, sem variáveis Supabase e sem internet.

## Fluxo

1. O pull incremental roda primeiro para `songs`, `repertories` e
   `repertoryItems`, nesta ordem.
2. O push envia somente registros com `syncPending: true`, na mesma ordem para
   respeitar dependências.
3. O cursor de cada tabela é composto por `(updated_at, id)`, fica em
   `settings` e o próximo pull reconsulta uma margem de dois minutos.
4. Uma nova chamada durante uma sync não é descartada: ela fica enfileirada e
   roda depois da atual.

## Outbox e conflitos

Foi escolhida uma outbox por registro, sem uma tabela adicional. A versão 5 do
Dexie adiciona `syncPending` e `syncError`; registros já existentes recebem
`true` e erro nulo, mudanças locais recebem `true`, e uma resposta confirmada do
backend define `false` e limpa o erro. Pushes são limitados a lotes de 50
registros.

Se um lote falha, cada registro é reenviado individualmente. O registro que
continua inválido permanece local, recebe `syncError` e aparece na área Nuvem;
os demais continuam sendo sincronizados.

O backend decide conflitos por `revision`. A maior revision vence. Em empate,
a versão que já está no servidor vence. O relógio do aparelho não participa da
decisão.

Tombstones (`deletedAt`/`deleted_at`) nunca são apagados nesta etapa. Um pull de
exclusão substitui uma versão local com revision menor ou igual, impedindo
ressurreição acidental.

Uma conta diferente da dona registrada em `sync.ownerUserId` interrompe o
processo antes de pull ou push. Os dados locais permanecem intactos e a UI
oferece continuar separado/offline ou sair da conta.

Preferências, favoritos e posição do modo show são específicas de cada aparelho
e ficam fora desta sincronização.
