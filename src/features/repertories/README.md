# Repertórios

Domínio de criação, edição, ordenação e composição de repertórios.

`RepertoriesPage` administra a lista e as operações de ciclo de vida.
`RepertoryEditorPage` coordena a leitura da ordem, o tom próprio de cada item e
as ações de reordenação e remoção. A seleção de novas músicas fica em
`AddSongsDialog`, aberto sob demanda para não empurrar a lista do repertório.
As regras de persistência ficam em `src/services/repertories.ts` e são
observadas por `liveQuery` através de `useRepertories` e `useRepertoryDetail`.

A ordenação usa posições numéricas espaçadas. Um movimento comum altera apenas
o item movido; uma reindexação completa só ocorre quando não há mais espaço
numérico seguro entre os vizinhos.
