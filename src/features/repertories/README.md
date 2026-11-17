# Repertórios

Domínio de criação, edição, ordenação e composição de repertórios.

`RepertoriesPage` administra a lista e as operações de ciclo de vida.
`RepertoryEditorPage` coordena o carregamento, a renomeação, a adição e as
mensagens do repertório. A ordem, o arrasto, as ações por item e o editor de tom
ficam em `RepertoryOrderPanel`; `ToneEditor` concentra o rascunho e o
cancelamento do tom próprio. A seleção de novas músicas fica em
`AddSongsDialog`, aberto sob demanda para não empurrar a lista do repertório.
As regras de persistência ficam em `src/services/repertories.ts` e são
observadas por `liveQuery` através de `useRepertories` e `useRepertoryDetail`.

A ordenação usa posições numéricas espaçadas. Um movimento comum altera apenas
o item movido; uma reindexação completa só ocorre quando não há mais espaço
numérico seguro entre os vizinhos.
