# Ajustes

A area de Nuvem usa magic link quando as variaveis Vite do Supabase estao
configuradas. Sem elas, a V2 permanece local e offline.

A sincronizacao inclui musicas, repertorios e itens de repertorio. Favoritos,
preferencias de leitura e posicao do modo show sao especificos de cada aparelho
e ficam fora desta etapa.

## Dados e migracao

Em Ajustes, o backup JSON pode ser baixado ou restaurado por mesclagem. A
substituicao exige `SUBSTITUIR` e baixa automaticamente um backup local antes
da transacao. Musicas, repertorios e itens ausentes no backup sao mantidos como
tombstones pendentes de sincronizacao, nunca removidos fisicamente. A secao de migracao le backups V1, o IndexedDB antigo
`caderno-cifras` e, quando autenticado, as tabelas antigas do Supabase sem
escrever nessas fontes. PDFs antigos sao apenas contabilizados e permanecem
pendentes; a V2 nao copia nem sincroniza os arquivos originais.
