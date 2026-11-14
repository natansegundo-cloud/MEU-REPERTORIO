# Importação em lote de documentos

**Etapa:** 16  
**Status:** implementada e corrigida após homologação real
**Escopo:** importação local, offline-first, sem alteração do parser musical, do Supabase ou do schema IndexedDB.

## Fluxo

Na tela de importação de música existe a ação **Abrir importação em lote (PDF ou DOCX)**. O fluxo é:

1. selecionar um PDF textual ou DOCX;
2. extrair o texto localmente no navegador;
3. segmentar os blocos de músicas;
4. revisar cada bloco, título, artista, tom e conteúdo;
5. selecionar os blocos desejados;
6. salvar explicitamente.

Nenhuma música é gravada durante a leitura ou a revisão. Cancelar o fluxo preserva a biblioteca.

## Extração

- PDF usa a extração e reconstrução de layout já existente, incluindo páginas, colunas e texto original.
- DOCX usa `mammoth.extractRawText` localmente. Parágrafos são preservados; avisos do conversor aparecem na revisão.
- Não há OCR. PDFs escaneados, arquivos protegidos ou corrompidos são rejeitados com mensagem clara.
- A extração não envia arquivos para a internet e não depende do Supabase.

## Causa raiz corrigida

A primeira versão confundia uma linha curta do texto extraído com o início de uma música. A heurística aceitava uma linha seguida, em poucos passos, por um acorde, uma seção ou `Tom:`. Em uma cifra isso também acontece no corpo musical e fazia continuações, fragmentos e cabeçalhos internos virarem novos blocos. Por isso o `CIFRAS.pdf` chegou a produzir 86 blocos.

A correção separa os conceitos de linha extraída, bloco e música identificada. Sem separador explícito, uma nova música agora precisa apresentar um cabeçalho composto confiável: título com artista e corpo, título/artista/tom rotulados, ou título/artista/tom em linhas consecutivas. Cabeçalhos sem rótulos também precisam começar no início do documento, de uma página ou depois de uma linha em branco. Uma continuação de página não satisfaz essa condição e permanece no bloco anterior.

Os metadados são extraídos do bloco inteiro. O sistema reconhece tanto linhas rotuladas (`Título`, `Artista`, `Tom`) quanto o cabeçalho visual em linhas separadas, sem remover letras, cifras, seções, quebras ou posicionamento do conteúdo. O bloco completo continua sendo validado pelo parser musical existente na revisão.

### Correção da Etapa 32

Um DOCX real de 25 músicas produzia apenas 3 blocos. Duas falhas independentes explicavam o problema:

1. o DOCX prefixava 1.796 linhas do corpo com `U+200B` (zero-width space). O parser individual já removia esse caractere, mas o importador em lote não. Com isso, linhas de acorde e seções deixavam de ser reconhecidas, cabeçalhos verdadeiros eram rejeitados e pares de acorde/letra viravam falsos títulos.
2. os separadores do documento usavam travessão (`—`) seguido de hífens. O padrão aceitava apenas `-`, `=` e `#`, então nenhum dos 24 separadores era reconhecido e o fluxo caía na segmentação automática.

A correção centraliza a remoção dos caracteres invisíveis no lote, reconhece separadores com travessão/meia-risca e remove números de página nas extremidades das páginas. O documento passou de 3 para 25 músicas, com título, artista, tom, ordem e conteúdo preservados.

Na segmentação automática, marcadores de seção entre parênteses (`(intro 2x) riff`, `(refrão)`) também contam como corpo musical. Isso permite reconhecer um cabeçalho cuja intro vem antes do primeiro acorde e impede que uma linha de letra seguida de `(refrão)` seja confundida com um novo título. O documento `CIFRAS.docx`, sem separadores, permanece com 3 músicas (`Au de Cabeça`/Fm, `Caraíva`/B, `Dois Planetas`/Gm) e as 180 linhas úteis preservadas.

O parser musical também passou a reconhecer sem aviso:

- extensão depois da barra, como `E7+/9` e `A7+/9` (sem confundir com inversão, como `E7+/G#`);
- progressões entre parênteses, como `( Bb7M  Eb7M )`;
- rótulos de seção seguidos de dois-pontos, como `Intro: ( Gm Cm7 Dm7 )` e `introdução: Am7 Dm Am7 Dm.`;
- palavras como `Em` em linhas de letra, que antes podiam ser confundidas com Mi menor.

Com isso, o documento real passou de 35 para 1 advertência de classificação. A restante é uma linha de acorde com anotação livre entre parênteses, que permanece sinalizada para revisão.

## Segmentação

A prioridade é deliberada:

1. separadores explícitos;
2. cabeçalho estrutural (título/artista/tom seguido de corpo musical);
3. um bloco único quando não há evidência suficiente;
4. revisão manual com avisos.

Um separador explícito precisa ocupar sozinho a linha, descontando espaços laterais, e conter pelo menos cinco caracteres iguais de uma destas famílias:

```text
-------------------------
=========================
#########################
—————————————————————————
```

Travessões (`—`) e meia-riscas (`–`) podem ser combinados com hífens na mesma
linha separadora.

O separador não entra no conteúdo do bloco. Uma música pode continuar em páginas seguintes sem ser dividida por mudança de página. Separadores misturados, curtos ou blocos vazios geram avisos para revisão.

Caracteres invisíveis (`U+200B–U+200D`, `U+2060`, `U+FEFF`, `U+00AD`) são removidos antes da segmentação, igual ao parser individual. Números de página e rodapés simples nas extremidades de cada página não são tratados como título ou artista.

Quando não há separadores, a divisão estrutural é conservadora e cada bloco recebe o aviso **Bloco separado automaticamente; confirme o início e o fim da música**. Se não houver sinais suficientes, o documento vira um único bloco para evitar perda silenciosa de conteúdo. Linhas internas de letra, acordes ou fragmentos de texto não são suficientes para abrir uma música.

## Persistência e duplicatas

O serviço `importSongsBatch` valida todos os blocos antes da gravação e utiliza uma única transação Dexie para os itens selecionados. Se qualquer item for inválido, nenhum item do lote é gravado.

A comparação ignora caixa, acentos e variações de espaço em branco. São consideradas duplicatas: o mesmo conteúdo original, o mesmo corpo musical (mesmo que o título/artista informado mude) ou o mesmo par título + artista quando ambos estão preenchidos. Título e artista só bloqueiam juntos, para não impedir músicas homônimas de artistas diferentes. Conteúdo idêntico a uma música ativa existente, ou a outro item do mesmo lote, não sobrescreve a música anterior. O restante do lote pode ser salvo, e a biblioteca mantém seus identificadores, estrutura e dados existentes.

As músicas salvas usam o mesmo `importSong`/`Song` e os mesmos campos de sincronização local do fluxo unitário. Não há alteração de tabelas, migrations ou dados existentes.

## Testes

Foram adicionados testes para:

- separadores de hífen, igualdade, cerquilha e travessão;
- caracteres invisíveis `U+200B` no corpo do DOCX;
- separadores curtos e blocos vazios;
- música atravessando páginas;
- separação estrutural sem separadores;
- extração DOCX e propagação de avisos do conversor;
- duplicação no lote;
- rollback quando um bloco é inválido;
- E2E de abertura do fluxo e erro de DOCX inválido.

A regressão da Etapa 32 está em `src/import/batch.regression.test.ts` e cobre 2, 5 e 12 músicas, separadores explícitos, linhas em branco, ausência de separadores, acordes junto da letra, artistas e tons, páginas com cabeçalho repetido, estruturas diferentes, títulos com nomes de acordes, conteúdo extenso e blocos concatenados. O parser individual também ganhou testes para palavras minúsculas como `em` e para linhas de cifra minúsculas.

Também foi feita homologação real, sem versionar o arquivo, com `C:\Users\conta\Downloads\CIFRAS.pdf`:

| Música                   | Páginas detectadas | Tom detectado |
| ------------------------ | ------------------ | ------------- |
| Au de Cabeça — Natiruts  | 1–2                | Fm            |
| Caraíva — Natiruts       | 3                  | B             |
| Dois Planetas — Natiruts | 4–6                | Gm            |

Resultado observado: **3 músicas**, não 86 blocos. Os conteúdos das páginas de continuação permaneceram no primeiro e no terceiro bloco correspondentes.

Na Etapa 32, a homologação com `C:\Users\conta\Downloads\CIFRAS - NATIRUTS.docx` (4.485 linhas, 1.796 linhas com `U+200B`, 24 separadores tipográficos e 25 linhas `Tom:`) passou de **3 blocos incorretos** para **25 músicas completas**, na ordem original, com títulos, artistas (`Natiruts`) e tons corretos. As 1.884 linhas úteis do documento foram preservadas.

Os testes de PDF seguem usando fixtures sintéticas de `PdfTextItem`; nenhum PDF de terceiros é versionado.

## Limitações conhecidas

- A qualidade da segmentação automática ainda depende da presença de cabeçalhos reconhecíveis; documentos sem separadores e sem título/metadados podem ser apresentados como um único bloco para revisão.
- PDF escaneado/imagem exige OCR, que não faz parte desta etapa.
- DOCX com caixas de texto, elementos flutuantes ou formatação musical complexa pode gerar avisos ou texto simplificado.
- Páginas físicas de DOCX não são expostas pelo conversor; o bloco é marcado como página 1, enquanto separadores e parágrafos continuam sendo reconhecidos.
- Cabeçalhos de página totalmente arbitrários e diferentes entre páginas não são removidos pelo lote; a extração de PDF já remove cabeçalhos e rodapés repetidos antes da segmentação.
- A homologação de arquivos reais variados deve continuar com uma coleção de documentos de teste do usuário, sem dados pessoais.
