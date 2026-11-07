# Parser de músicas

O parser é uma camada pura de domínio. Ele recebe texto importado, normaliza
apenas o necessário para análise e devolve um modelo serializável sem depender
de React, Dexie ou Supabase.

`originalText` preserva exatamente o conteúdo recebido. `normalizedText` e as
posições estruturadas usam quebras de linha normalizadas, caracteres invisíveis
removidos e tabulações expandidas para quatro colunas. Cada cifra mantém a
posição lógica no texto, a coluna visual e o intervalo da origem para permitir
reconstrução e transposição sem perder a letra.

Metadados explícitos (`Tom:`, `Artista:`, `Título:`, `Capotraste:`) são extraídos
do corpo. Título e artista também podem ser inferidos somente quando há um
marcador claro de corpo musical. Linhas desconhecidas não são descartadas: ficam
como letra e podem produzir diagnósticos de aviso.

Migrações para o modelo Dexie e a interface de importação ficam para etapas
posteriores. Alterações futuras no contrato devem aumentar a versão do modelo e
incluir uma migração explícita, sem apagar o texto original.
