# Changelog

## 2.0.0 — 2026-11-07

- Finalizada a V2 com backup, restauração protegida, migração opcional da V1,
  importação TXT/PDF, favoritos e sincronização offline-first.
- Corrigidos conflitos do parser, tom sugerido, agrupamento de avisos e
  preservação das posições dos acordes.
- Reforçada a restauração `Substituir tudo` com tombstones sincronizáveis.
- Adicionado fallback global de erro, aviso de atualização do PWA, persistência
  solicitada para o armazenamento local, versão visível em Ajustes e cabeçalhos
  de segurança da Vercel.
- Mantida a auditoria sem alterações automáticas: 0 vulnerabilidades de
  produção e 15 apenas em dependências de desenvolvimento.
- Removida a V1 antiga da pasta pai conforme decisão explícita do usuário.
