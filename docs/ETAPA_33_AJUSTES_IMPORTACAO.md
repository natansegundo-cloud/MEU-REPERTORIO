# Etapa 33 — Ajustes pontuais da importação

**Etapa:** 33
**Data:** 13/11/2026
**Checkout:** `v2`
**Status:** concluída em código, testes automatizados e validação de build.

## 1. Objetivo

Corrigir três incômodos da importação sem alterar o que já havia sido construído
na importação em lote, no parser e na transposição:

1. o vão em branco no início (e no fim) da cifra ao abrir uma música;
2. os campos de título, artista e tom vazios ao colar o conteúdo;
3. a possibilidade de salvar a mesma música mais de uma vez.

## 2. Vão em branco na cifra

### Causa

O parser remove o título, o artista e a linha `Tom:` do corpo musical, mas as
linhas em branco que os cercavam continuavam na estrutura. O `SongSheet`
renderiza cada linha `blank` com altura fixa (`.blank { height: 1.2rem; }`),
produzindo o espaço antes do primeiro acorde ou seção.

### Correção

Foi criado o utilitário `trimBlankEdges` em `src/utils/trim-blank-edges.ts`, que
remove itens vazios apenas nas extremidades da lista. O `SongSheet` passou a
usar esse utilitário sobre `structure.lines`.

- linhas em branco internas continuam preservadas (espaçamento intencional da
  cifra);
- o modelo estruturado salvo não é alterado, então o editor continua com as
  mesmas linhas;
- músicas já importadas também ficam corrigidas, sem necessidade de reimportar;
- a mudança vale para a tela da música e para o modo show, que usam o mesmo
  componente.

## 3. Preenchimento dos primeiros campos

### Causa

A tela de importação só preenchia título e artista ao carregar PDF/TXT, usando
metadados do arquivo. Ao colar o conteúdo, apenas o tom era derivado do parser.

### Correção

`src/features/library/ImportSongPage.tsx` agora usa o resultado de
`parseSongText` para preencher, sem sobrescrever o que o usuário já digitou:

- título;
- artista;
- tom original (comportamento que já existia).

No carregamento de arquivo, a ordem de prioridade é: metadados extraídos do
PDF, depois o cabeçalho reconhecido no texto e, por fim, o nome do arquivo.

## 4. Duplicatas

### Causa

`importSong` e `importSongsBatch` comparavam apenas o `content` exato. A mesma
música reimportada com espaços, quebras de linha ou cabeçalho diferentes era
gravada novamente.

### Correção

`src/services/songs.ts` passou a gerar assinaturas normalizadas:

- **conteúdo**: texto original sem caixa, acentos ou diferenças de espaço;
- **corpo**: conteúdo musical sem título/artista/tom, também normalizado;
- **identidade**: par título + artista normalizado, exigindo os dois
  preenchidos e ignorando o título padrão “Música sem título”.

Uma música é recusada se qualquer assinatura coincidir com uma música ativa.
Título e artista só bloqueiam juntos, permitindo músicas homônimas de artistas
diferentes. A verificação vale tanto para a importação individual quanto para
cada item do lote.

## 5. Testes adicionados

- `src/utils/trim-blank-edges.test.ts` — remoção apenas nas extremidades;
- `src/features/songs/SongSheet.test.tsx` — cifra sem vão inicial/final e com
  linhas internas preservadas;
- `src/services/songs.test.ts` — duplicata com espaços diferentes, duplicata
  pelo corpo, duplicata por título + artista, músicas homônimas de artistas
  diferentes e duplicata dentro do lote;
- `src/app/library.integration.test.tsx` — preenchimento automático de título,
  artista e tom ao colar o conteúdo.

## 6. Validação

| Comando                           | Resultado                        |
| --------------------------------- | -------------------------------- |
| `npm run typecheck`               | passou                           |
| `npm run lint`                    | passou                           |
| `npm run format:check`            | passou                           |
| `npm run build`                   | passou                           |
| `npm test`                        | 47 arquivos, 259 testes passaram |
| `npx playwright test --workers=1` | 66 testes passaram               |

## 7. Limitações

- A comparação de duplicatas é intencionalmente conservadora: duas versões
  realmente diferentes da mesma música, com mesmo título e mesmo artista, são
  tratadas como duplicata na importação. A edição posterior continua livre.
- O vão é removido na apresentação; o texto original permanece intacto no
  banco para restauração e edição.
