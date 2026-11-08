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
```

O separador não entra no conteúdo do bloco. Uma música pode continuar em páginas seguintes sem ser dividida por mudança de página. Separadores misturados, curtos ou blocos vazios geram avisos para revisão.

Quando não há separadores, a divisão estrutural é conservadora e cada bloco recebe o aviso **Bloco separado automaticamente; confirme o início e o fim da música**. Se não houver sinais suficientes, o documento vira um único bloco para evitar perda silenciosa de conteúdo. Linhas internas de letra, acordes ou fragmentos de texto não são suficientes para abrir uma música.

## Persistência e duplicatas

O serviço `importSongsBatch` valida todos os blocos antes da gravação e utiliza uma única transação Dexie para os itens selecionados. Se qualquer item for inválido, nenhum item do lote é gravado.

Conteúdo original idêntico a uma música ativa existente, ou a outro item do mesmo lote, é tratado como duplicata e não sobrescreve a música anterior. O restante do lote pode ser salvo, e a biblioteca mantém seus identificadores, estrutura e dados existentes.

As músicas salvas usam o mesmo `importSong`/`Song` e os mesmos campos de sincronização local do fluxo unitário. Não há alteração de tabelas, migrations ou dados existentes.

## Testes

Foram adicionados testes para:

- separadores de hífen, igualdade e cerquilha;
- separadores curtos e blocos vazios;
- música atravessando páginas;
- separação estrutural sem separadores;
- extração DOCX e propagação de avisos do conversor;
- duplicação no lote;
- rollback quando um bloco é inválido;
- E2E de abertura do fluxo e erro de DOCX inválido.

Também foi feita homologação real, sem versionar o arquivo, com `C:\Users\conta\Downloads\CIFRAS.pdf`:

| Música                   | Páginas detectadas | Tom detectado |
| ------------------------ | ------------------ | ------------- |
| Au de Cabeça — Natiruts  | 1–2                | Fm            |
| Caraíva — Natiruts       | 3                  | B             |
| Dois Planetas — Natiruts | 4–6                | Gm            |

Resultado observado: **3 músicas**, não 86 blocos. Os conteúdos das páginas de continuação permaneceram no primeiro e no terceiro bloco correspondentes.

Os testes de PDF seguem usando fixtures sintéticas de `PdfTextItem`; nenhum PDF de terceiros é versionado.

## Limitações conhecidas

- A qualidade da segmentação automática ainda depende da presença de cabeçalhos reconhecíveis; documentos sem separadores e sem título/metadados podem ser apresentados como um único bloco para revisão.
- PDF escaneado/imagem exige OCR, que não faz parte desta etapa.
- DOCX com caixas de texto, elementos flutuantes ou formatação musical complexa pode gerar avisos ou texto simplificado.
- Páginas físicas de DOCX não são expostas pelo conversor; o bloco é marcado como página 1, enquanto separadores e parágrafos continuam sendo reconhecidos.
- A homologação de arquivos reais variados deve continuar com uma coleção de documentos de teste do usuário, sem dados pessoais.
