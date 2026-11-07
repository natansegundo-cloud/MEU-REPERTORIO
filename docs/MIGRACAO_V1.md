# Migracao da V1

## Fontes suportadas

A V2 faz uma leitura explicita e somente-leitura destas fontes:

- backup JSON da V1 com `app: "meu-repertorio"`, `v: 3`, `songs` e
  `setlists` (tambem aceita o nome antigo `repertoires`);
- IndexedDB `caderno-cifras`, versao 3, stores `songs` e `setlists`;
- tabelas antigas `songs` e `setlists` do Supabase, apenas quando existe uma
  sessao autenticada e as variaveis publicaveis estao configuradas.

O leitor antigo nao grava, remove, atualiza tabelas nem altera o bucket
`song-pdfs`. Ao ler a nuvem, a interface informa quantos PDFs antigos foram
encontrados. Eles ficam pendentes para decisao posterior: nao sao baixados,
armazenados no IndexedDB nem sincronizados pela V2.

## Conversao

Cada musica passa pelo parser da V2. Sao preservados titulo, artista, corpo,
tom, capo, observacoes, estrutura interpretada e datas quando validas. Cada
registro recebe um ID deterministico e `legacyId`, tornando uma nova leitura
idempotente. Repertorios mantem nome, exclusao logica e ordem dos itens. O
campo antigo `semi` e convertido para `preferredKey`, respeitando `pref: flat`
quando nao havia tom preferido explicito.

Registros sem conteudo, itens que apontam para uma musica inexistente e falhas
do parser aparecem no relatorio antes da confirmacao. A importacao confirmada
usa uma unica transacao Dexie e marca entidades sincronizaveis com
`syncPending: true`, revision inicial 1.

## Backup V2

O backup atual possui `app`, `formatVersion`, `exportedAt`, `counts`, musicas,
repertorios, itens, favoritos e preferencias. Nao inclui tokens, sessao,
e-mail, chaves, cursores, fila de outbox ou erros temporarios de sincronizacao.

Mesclar compara `updatedAt`, preserva tombstones locais e nao ressuscita
exclusoes sem a opcao explicita. Substituir exige a palavra `SUBSTITUIR`, gera
um backup automatico do estado atual e so entao restaura o conteudo do backup
dentro de uma transacao. Registros locais de musicas, repertorios e itens que
nao existem no backup nao sao removidos: viram tombstones com revision
incrementada e `syncPending`, para que a sincronizacao propague a exclusao.
Favoritos e preferencias, que sao locais, podem ser substituidos fisicamente.
Arquivos invalidos, futuros, vazios ou acima de 20 MB sao rejeitados antes de
qualquer escrita.

## Texto e PDF

TXT usa UTF-8 e fallback Latin-1. PDF usa `pdfjs-dist` somente quando o
usuario seleciona um PDF; a extracao agrupa itens por coordenadas para manter
linhas e espacamento das cifras. O limite e 20 MB, nao ha OCR e PDFs originais
nao sao persistidos. O worker e carregado como chunk separado e fica apenas em
cache de runtime.
