# Serviços

Esta pasta concentra operações de negócio e persistência sem depender de React.
Componentes e hooks não acessam tabelas Dexie diretamente.

## Músicas

`songs.ts` concentra o fluxo da biblioteca:

- `importSong` chama exclusivamente o parser, bloqueia diagnósticos de erro e
  salva a estrutura produzida pelo parser em uma transação;
- `listSongs`, `searchSongs`, `getSong` e `observeSongs` consultam registros
  ativos;
- `softDeleteSong` preserva o registro e incrementa a revisão;
- `updateSongMetadata` atualiza metadados sem perder a estrutura musical.

Os componentes usam `useSongs` e `useSong`, que assinam `liveQuery` por meio do
serviço. Sincronização e repertórios continuam fora do escopo desta etapa.
