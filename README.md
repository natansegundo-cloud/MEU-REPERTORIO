# Meu Repertório V2

Aplicativo pessoal para organizar, estudar e executar repertórios musicais no
violão. A V2 é uma PWA React/Vite offline-first.

Versão de lançamento: **2.0.0**.

## Estado atual

- React 19, TypeScript strict, Vite, Dexie, Vitest, Testing Library e Playwright;
- motor musical, parser, biblioteca, editor, repertórios, favoritos e modo show;
- IndexedDB com evoluções incrementais até o schema 5;
- sincronização opcional de músicas, repertórios e itens via Supabase;
- pull incremental por `updated_at`, outbox por registro, tombstones, revisões
  e fila de sincronizações;
- área de Nuvem com magic link, estados offline/erro/sincronizado e proteção
  contra mistura de contas;
- importação TXT/PDF e cache sob demanda do PDF.js;
- SQL novo em `supabase/migrations/` e instruções de aplicação manual em
  `supabase/README.md`.

## Executar

```bash
npm install
npm run dev
```

Sem `.env`, a aplicação funciona localmente e a área de Nuvem aparece como
indisponível. Para habilitar o backend, copie `.env.example` e preencha somente
`VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Scripts

| Script                 | Função                          |
| ---------------------- | ------------------------------- |
| `npm run dev`          | servidor Vite                   |
| `npm run typecheck`    | TypeScript strict               |
| `npm run lint`         | ESLint                          |
| `npm run format:check` | Prettier                        |
| `npm test`             | Vitest sem rede                 |
| `npm run test:e2e`     | Playwright                      |
| `npm run build`        | build de produção               |
| `npm run validate`     | typecheck, lint, testes e build |

## Sincronização

O núcleo fica em `src/sync` e não depende de React. A ordem é pull de músicas,
repertórios e itens, depois push na mesma ordem. A conta local e os três
cursores ficam em `settings`. A regra é maior `revision`; em empate, vence a
versão que o servidor já escolheu. O relógio local não decide conflitos.

Exclusões são mantidas como marcas. A evolução do schema v5 é descrita em
`src/database/SCHEMA_V5.md`. Preferências, favoritos e posição do modo show não
sincronizam nesta etapa.

## Supabase

O arquivo `supabase/migrations/202611070001_v2_sync.sql` não foi executado pelo
projeto. A aplicação deve ser manual, primeiro em um projeto de teste, conforme
`supabase/README.md`.

Todos os testes usam IndexedDB falso e backend em memória; nenhum teste acessa
o Supabase real ou depende de rede.

## Lançamento 2.0.0

- O aplicativo solicita persistência do armazenamento quando o navegador oferece
  essa API e exibe o estado em Ajustes.
- Atualizações do PWA mostram `Nova versão disponível — atualizar`; a troca só
  acontece após a confirmação do usuário e não apaga o IndexedDB.
- O fallback global informa falhas inesperadas sem ocultar que os dados locais
  permanecem preservados.
- O deploy da Vercel usa cabeçalhos de segurança em `vercel.json`.

### Auditoria de dependências

Em 2026-11-07, `npm audit --omit=dev` encontrou **0 vulnerabilidades de
produção**. A auditoria completa encontrou **15 vulnerabilidades somente em
dependências de desenvolvimento** (2 baixas e 13 moderadas, sem altas ou
críticas). As correções automáticas propostas envolvem downgrade ou mudança de
versão major, por isso nenhuma foi aplicada e `npm audit fix` não foi usado.

O aplicativo não exige variáveis para funcionar offline. Quando a nuvem for
habilitada, use somente `VITE_SUPABASE_URL` e
`VITE_SUPABASE_PUBLISHABLE_KEY`; nenhum segredo ou `service_role` deve ser
colocado no navegador.
