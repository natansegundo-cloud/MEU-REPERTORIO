# Backup e restauração — Meu Repertório V2

## Objetivo

O backup é uma camada local e offline-first para proteger a biblioteca do navegador sem depender do Supabase ou de conexão com a internet. O arquivo exportado não contém credenciais, tokens, sessões ou metadados internos de sincronização.

## Formato do arquivo

O formato atual é JSON versionado:

```json
{
  "format": "meu-repertorio-backup",
  "version": 1,
  "application": "Meu Repertório V2",
  "createdAt": "2026-11-08T12:00:00.000Z",
  "data": {
    "songs": [],
    "repertories": [],
    "repertoryItems": [],
    "favorites": [],
    "preferences": [],
    "settings": []
  },
  "integrity": {
    "algorithm": "SHA-256",
    "digest": "<64 caracteres hexadecimais>"
  }
}
```

`data` contém os registros locais das seis tabelas do IndexedDB. Músicas incluem a cifra estruturada, o conteúdo original, metadados e diagnósticos preservados pelo parser. Itens de repertório e favoritos mantêm seus identificadores para reconstruir as relações.

O digest SHA-256 é calculado sobre `data` em uma representação canônica. A leitura valida o formato, a versão, o tipo dos campos, chaves duplicadas, referências entre tabelas e o digest antes de qualquer gravação.

As configurações com chaves iniciadas por `sync.`, `auth.`, `session.` ou `token.` são excluídas do backup. Elas podem conter estado técnico, credenciais ou identificadores de sessão e não são necessárias para a biblioteca local.

O limite de leitura é 50 MB. A versão incompatível é rejeitada explicitamente; não há tentativa de interpretar um formato desconhecido.

## Como exportar

1. Abra **Ajustes**.
2. Em **Backup e restauração**, selecione **Exportar biblioteca**.
3. Guarde o arquivo `meu-repertorio-backup-AAAA-MM-DD.json` em um local confiável.

Para exportar uma música, abra a música na biblioteca e selecione **Exportar TXT**. Esse arquivo contém o conteúdo original disponível, incluindo letras e cifras, e é independente do backup completo.

## Como restaurar

1. Abra **Ajustes** e selecione **Selecionar backup**.
2. Escolha um arquivo JSON exportado pelo Meu Repertório V2.
3. Aguarde a prévia. Ela mostra quantidade total, registros novos, registros iguais e conflitos por tabela.
4. Escolha uma estratégia:
   - **Mesclar com segurança**: adiciona apenas registros ausentes, mantém registros iguais e preserva conflitos locais.
   - **Substituir conflitos**: substitui somente registros com o mesmo identificador e conteúdo diferente, depois de uma confirmação explícita.
5. Selecione **Restaurar backup** e aguarde o resultado.

A restauração não apaga registros que não existem no arquivo. A escrita das seis tabelas ocorre em uma única transação IndexedDB; se uma etapa falhar, a transação é cancelada e a biblioteca anterior permanece intacta. A interface mostra o andamento por tabela e o resultado da operação.

## Limitações conhecidas

- O backup não restaura credenciais, sessão ou estado de sincronização do Supabase.
- A restauração depende de a versão do formato ser suportada pelo aplicativo instalado.
- O download depende das permissões e da disponibilidade de armazenamento do navegador.
- A integridade confirma alterações acidentais no arquivo, mas não substitui guardar uma cópia em local seguro ou com controle de acesso.
- A exportação TXT individual usa o `content` original da música; alterações estruturais que ainda não tenham sido refletidas nesse campo não são um novo formato de exportação.
