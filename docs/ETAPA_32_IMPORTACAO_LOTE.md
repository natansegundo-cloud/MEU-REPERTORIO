# Etapa 32 — Diagnóstico e correção estrutural do importador em lote

**Etapa:** 32
**Data:** 13/11/2026
**Checkout:** `v2`
**Status:** concluída em código, testes automatizados e homologação com o documento real.

## 1. Objetivo

Investigar a perda de músicas na importação em lote, identificar a causa raiz em
todo o fluxo (extração → normalização → segmentação → parser → revisão →
biblioteca) e corrigir a menor estrutura suficiente, preservando o parser
individual e o restante do aplicativo.

## 2. Documento de origem

O arquivo real usado na homologação foi:

```text
C:\Users\conta\Downloads\CIFRAS - NATIRUTS.docx
```

Características medidas:

| Item                                           | Valor |
| ---------------------------------------------- | ----- |
| Linhas extraídas pelo Mammoth                  | 4.485 |
| Linhas iniciadas por U+200B (zero-width space) | 1.796 |
| Linhas `Tom:`                                  | 25    |
| Separadores tipográficos (`—` + hífens)        | 24    |
| Músicas esperadas                              | 25    |

O arquivo não é versionado por conter cifras de terceiros. A homologação foi
feita localmente e a regressão foi convertida em fixture sintética.

## 3. Fluxo mapeado

```text
PDF/DOCX
  → extractBatchDocument
     → PDF: extractPdfPages (pdfjs + reconstrução de layout)
     → DOCX: mammoth.extractRawText
  → segmentBatchDocument
     → normalizeLines
     → explicitSegments (separadores)
     → automaticSegments (cabeçalhos estruturais)
  → makeSegment (título, artista, tom, avisos)
  → BatchImportPage (revisão e edição)
  → importSongsBatch (uma transação Dexie)
  → parser individual (parseSongText) na validação
```

## 4. Causa raiz comprovada

### 4.1. Normalização divergente entre lote e parser individual

O parser individual já removia caracteres invisíveis
(`U+200B–U+200D`, `U+2060`, `U+FEFF`, `U+00AD`). O importador em lote não fazia
essa limpeza.

No DOCX real, 1.796 linhas do corpo começam com `U+200B`. Consequências:

- `isLikelyChordLine` recebia `\u200bC#m` e não reconhecia o acorde;
- `isBodyLine` não reconhecia `\u200b[Intro]`;
- `hasBodyAfter` rejeitava cabeçalhos verdadeiros;
- linhas de acorde passavam a ser aceitas como títulos;
- linhas de letra passavam a ser aceitas como artistas.

Esse é o ponto exato da perda: a segmentação automática não encontrava os 25
cabeçalhos reais e aceitava apenas 3 falsos inícios.

### 4.2. Separadores tipográficos não reconhecidos

O documento separa músicas com linhas como:

```text
—---------------------------------------------
```

O padrão aceitava apenas hífens, iguais ou cerquilhas ASCII
(`-`, `=`, `#`). Como o travessão `—` quebrava o padrão, nenhum dos 24
separadores era reconhecido. O fluxo caía em `automaticSegments`, justamente o
caminho mais frágil.

### 4.3. Números de página podiam virar metadados

Em documentos paginados, um número de página no início ou no fim da página
podia ser aceito como título ou artista. A correção remove apenas números de
página e rodapés simples nas extremidades de cada página.

### 4.4. Falso positivo do parser com palavras minúsculas

Depois da correção da segmentação, restavam 78 advertências de classificação.
A maior parte vinha de palavras portuguesas minúsculas como `em`, interpretadas
como o acorde `Em`. A raiz da advertência era o caminho de tokens ambíguos do
parser individual, que aceitava raiz minúscula.

## 5. Correção implementada

### 5.1. `src/import/batch.ts`

- normalização central de linhas com remoção dos mesmos caracteres invisíveis
  usados pelo parser individual e conversão de `U+00A0` em espaço;
- reconhecimento de separadores formados por cinco ou mais hífens, travessões
  (`—`), meia-riscas (`–`), iguais ou cerquilhas;
- remoção de números de página e rodapés simples nas extremidades de cada
  página;
- rejeição de números de página como título estrutural;
- reconhecimento de marcadores de seção entre parênteses, como
  `(intro 2x) riff` e `(refrão)`, como corpo da música — isso permite detectar
  um cabeçalho seguido de intro e impede que uma letra seguida de `(refrão)`
  seja aceita como novo título;
- aviso quando um bloco contém mais de um `Tom:` ou mais de um `Título:`,
  sinalizando possível concatenação;
- preservação integral das linhas musicais e da ordem dos blocos.

### 5.2. `src/features/parser/recognize.ts`

- o caminho de advertência para tokens ambíguos passou a considerar apenas
  raízes maiúsculas (`A`–`G`), que é a notação usada em cifras;
- linhas de cifra minúsculas continuam sendo reconhecidas normalmente pelo
  caminho principal;
- nenhuma alteração em transposição, geração de diagramas ou estrutura da
  música.

### 5.3. Revisão em lote

- o resumo agora informa **“25 músicas reconhecidas”** em vez de “blocos
  encontrados”;
- cada card mostra **“Música N”** e um selo **Revisar** quando há aviso, erro,
  título ausente ou conteúdo vazio;
- os avisos do parser incluem o número da linha e são deduplicados;
- o total de blocos que precisam de revisão aparece no resumo;
- nenhum campo existente foi removido: título, artista, tom e conteúdo
  continuam editáveis.

## 6. Antes e depois no documento real

### Antes

| #   | Título extraído                      | Artista extraído                    | Tom    | Linhas |
| --- | ------------------------------------ | ----------------------------------- | ------ | ------ |
| 1   | `\u200bF#m Bm ...` (linha de acorde) | `\u200b Soul revolution...` (letra) | `Bb`   | 453    |
| 2   | `\u200bBm7 ...` (linha de acorde)    | `\u200b E sim anjinhos...` (letra)  | `null` | 65     |
| 3   | `\u200bBm7 ...` (linha de acorde)    | `\u200b Fica de fora...` (letra)    | `Ebm`  | 1.915  |

Resultado: **3 blocos**, todos com metadados errados.

### Depois

| Item                              | Resultado             |
| --------------------------------- | --------------------- |
| Músicas reconhecidas              | **25**                |
| Ordem original                    | preservada            |
| Títulos corretos                  | 25 de 25              |
| Artistas corretos                 | 25 de 25 (`Natiruts`) |
| Tons corretos                     | 25 de 25              |
| Linhas úteis preservadas          | 1.884 de 1.884        |
| Separadores dentro do conteúdo    | nenhum                |
| Caracteres invisíveis no conteúdo | nenhum                |
| Blocos marcados para revisão      | 10 de 25              |
| Advertências de classificação     | 78 → 35               |

Exemplos conferidos:

- primeira música: `Andei Só` / `Natiruts` / `C#m`;
- última música: `Leve Com Você` / `Natiruts` / `C`;
- `Em Paz` e `A Cor do Mar` permaneceram como títulos, sem serem confundidas
  com linhas de acorde.

A homologação na interface real, em 390 px, mostrou 25 cards, sem overflow
horizontal (`scrollWidth === innerWidth`). Evidência:
`docs/screenshots/etapa32/revisao-real-mobile.png`.

### Compatibilidade com o documento antigo de 3 músicas

O mesmo fluxo foi conferido com `C:\Users\conta\Downloads\CIFRAS.docx`, que não
tem separadores explícitos e depende da segmentação automática. Antes do ajuste
de seções entre parênteses, o arquivo gerava 3 blocos, mas o bloco do meio vinha
errado (`E preservar essa vida como Deus criou? Deus criou` / `(refrão)` /
`null`). A intro `(intro 2x) riff` não era reconhecida como corpo, então
`Caraíva` era descartada e uma letra seguida de `(refrão)` virava cabeçalho.

Depois da correção:

| #   | Título          | Artista  | Tom | Linhas úteis |
| --- | --------------- | -------- | --- | ------------ |
| 1   | `Au de Cabeça`  | Natiruts | Fm  | 59           |
| 2   | `Caraíva`       | Natiruts | B   | 29           |
| 3   | `Dois Planetas` | Natiruts | Gm  | 92           |

As 180 linhas úteis do arquivo foram preservadas na ordem original.

## 7. Testes de regressão

Arquivo novo: `src/import/batch.regression.test.ts`.

| Cenário                                                      | Cobertura |
| ------------------------------------------------------------ | --------- |
| 2 músicas separadas por hífens                               | sim       |
| 5 músicas sem separadores explícitos                         | sim       |
| 12 músicas com separadores tipográficos e U+200B             | sim       |
| Linhas em branco entre músicas                               | sim       |
| Músicas separadas por títulos                                | sim       |
| Músicas sem separadores explícitos                           | sim       |
| Acordes junto das letras                                     | sim       |
| Artistas e tons                                              | sim       |
| Páginas com cabeçalho repetido                               | sim       |
| Estruturas diferentes no mesmo documento                     | sim       |
| Títulos contendo nomes de acordes (`Em Paz`, `A Cor do Mar`) | sim       |
| Intro entre parênteses e falsa divisão por `(refrão)`        | sim       |
| Progressões entre parênteses sem virarem título              | sim       |
| Conteúdo musical extenso (60 versos)                         | sim       |
| Bloco concatenado com dois tons ou dois títulos              | sim       |
| Parser individual em todos os blocos gerados                 | sim       |

O teste principal reproduz a forma do arquivo real: corpo com `U+200B`,
separadores `—` + hífens, 12 músicas com título/artista/tom e letras
exclusivas. Ele falha no código anterior e passa na correção.

Também foram adicionados testes no parser individual para:

- não advertir sobre palavras minúsculas como `em`;
- continuar reconhecendo linhas de cifra escritas em minúsculas;
- manter o aviso para acorde ambíguo em maiúscula no meio da letra.

## 8. Validação executada

| Comando                                                                       | Resultado                        |
| ----------------------------------------------------------------------------- | -------------------------------- |
| `npx vitest run src/import/batch.test.ts src/import/batch.regression.test.ts` | 20 testes passaram               |
| `npx vitest run src/features/parser/parser.test.ts`                           | 18 testes passaram               |
| `npm test`                                                                    | 46 arquivos, 245 testes passaram |
| `npm run typecheck`                                                           | passou                           |
| `npm run lint`                                                                | passou                           |
| `npm run format:check`                                                        | passou                           |
| `npm run build`                                                               | passou                           |
| `npx playwright test --workers=1`                                             | 66 testes passaram               |

Homologação adicional, executada com o arquivo real e removida do repositório
depois da captura: 25 cards, primeiro e último metadados corretos, sem overflow
em 390 px.

## 9. Limitações conhecidas

- A segmentação automática (sem separadores) continua conservadora: documentos
  sem título, artista ou tom podem virar um único bloco para revisão manual.
- Cabeçalhos totalmente arbitrários repetidos em páginas não são removidos pelo
  lote; a extração de PDF já remove cabeçalhos/rodapés repetidos antes da
  segmentação.
- O DOCX não expõe páginas físicas; todos os blocos do DOCX ficam como página 1.
- As 35 advertências restantes no documento real são majoritariamente
  progressões entre parênteses, como `( Bb7M  Eb7M )`, que o parser individual
  preserva como conteúdo mas não classifica como linha de cifra.
- A conferência visual foi feita em Chromium, sem aparelho físico.
- Nenhum commit ou push foi realizado.

## 10. Conclusão

A perda de músicas não estava na persistência nem no parser individual. A causa
raiz estava na normalização do lote, que não removia os caracteres invisíveis
presentes no DOCX, combinada com a não recognição dos separadores tipográficos.
As duas falhas faziam o fluxo abandonar os separadores explícitos e cair na
segmentação automática, que interpretava linhas de acorde como títulos e linhas
de letra como artistas.

Com a correção, o documento real passou de **3 blocos incorretos para 25
músicas completas**, com títulos, artistas, tons, ordem e conteúdo preservados.
