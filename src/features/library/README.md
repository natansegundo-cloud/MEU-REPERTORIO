# Biblioteca e edição de músicas

A biblioteca é a primeira experiência funcional do aplicativo. O fluxo local é:

1. `ImportSongPage` recebe texto e metadados opcionais.
2. `importSong` chama o parser da Etapa 3 e bloqueia somente diagnósticos de erro.
3. O serviço grava o texto original e o `ParsedSong` em uma transação Dexie.
4. `useSongs` observa a tabela com `liveQuery`.
5. A lista pesquisa título, artista e tom sem recarregar a página.
6. `SongViewPage` renderiza linhas estruturadas e oferece transposição temporária.
7. `SongEditorPage` altera linhas, cifras, metadados e informações musicais sem
   converter a música para texto plano.

`editor-model.ts` é independente de React e concentra as operações estruturais
de linha, cifra, posição e validação. O editor mantém uma cópia temporária e
salva somente por ação explícita, usando a revisão da música para evitar
sobrescrita acidental.

Exclusões são lógicas. Sincronização, repertórios, favoritos avançados e modo
show permanecem fora desta etapa.
