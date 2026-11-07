# Sincronizacao

O modulo de sync e opcional e permanece independente de React. O app continua
funcionando sem login, sem variaveis Supabase e sem internet.

## Fluxo

1. O pull incremental roda primeiro para `songs`, `repertories` e
   `repertoryItems`, nesta ordem.
2. O push envia somente registros com `syncPending: true`, na mesma ordem para
   respeitar dependencias.
3. O cursor de cada tabela e composto por `(updated_at, id)`, fica em
   `settings` e o proximo pull reconsulta uma margem de dois minutos.
4. Uma nova chamada durante uma sync nao e descartada: ela fica enfileirada e
   roda depois da atual.

## Outbox e conflitos

Foi escolhida uma outbox por registro, sem uma tabela adicional. A migracao
Dexie v5 adiciona `syncPending` e `syncError`; dados legados recebem `true` e
erro nulo, mudancas locais recebem `true`, e uma resposta confirmada do backend
define `false` e limpa o erro. Pushes sao limitados a lotes de 50 registros.

Se um lote falha, cada registro e reenviado individualmente. O registro que
continua invalido permanece local, recebe `syncError` e aparece na area Nuvem;
os demais continuam sendo sincronizados.

O backend decide conflitos por `revision`. A maior revision vence. Em empate,
a versao que ja esta no servidor vence. O relogio do aparelho nao participa da
decisao.

Tombstones (`deletedAt`/`deleted_at`) nunca sao apagados nesta etapa. Um pull
de exclusao substitui uma versao local com revision menor ou igual, impedindo
ressurreicao acidental. Uma ressurreicao so pode ocorrer por uma operacao
explicita de edicao/restauracao que aumente a revision depois de o usuario ter
conhecimento da exclusao; o fluxo automatico nunca faz isso.

Uma conta diferente da dona registrada em `sync.ownerUserId` interrompe o
processo antes de pull ou push. Os dados locais permanecem intactos e a UI
oferece continuar separado/offline ou sair da conta.

Preferencias de leitura, favoritos e posicao do modo show sao especificas de
cada aparelho e ficam fora desta sincronizacao.
