# Meu Repertorio V2

Aplicativo pessoal para organizar, estudar e executar repertorios musicais no
violao. A V2 e uma PWA React/Vite offline-first e a versao antiga na raiz nao e
alterada.

## Estado atual

Etapas 1 a 8 implementadas na V2:

- React 19, TypeScript strict, Vite, Dexie, Vitest, Testing Library e Playwright;
- motor musical, parser, biblioteca, editor, repertorios e modo show;
- IndexedDB com migracoes incrementais ate o schema 5;
- sincronizacao opcional de musicas, repertorios e itens via Supabase;
- pull incremental por `updated_at`, outbox por registro (`syncPending`),
  tombstones, revisoes e fila de sincronizacoes;
- area de Nuvem com magic link, estados offline/erro/sincronizado e protecao
  contra mistura de contas;
- SQL novo em `supabase/migrations/` e instrucoes de aplicacao manual em
  `supabase/README.md`.

## Executar

```bash
npm install
npm run dev
```

Sem `.env`, a aplicacao funciona localmente e a area de Nuvem aparece como
indisponivel. Para habilitar o backend, copie `.env.example` e preencha somente
`VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Scripts

| Script                 | Funcao                          |
| ---------------------- | ------------------------------- |
| `npm run dev`          | servidor Vite                   |
| `npm run typecheck`    | TypeScript strict               |
| `npm run lint`         | ESLint                          |
| `npm run format:check` | Prettier                        |
| `npm test`             | Vitest sem rede                 |
| `npm run test:e2e`     | Playwright                      |
| `npm run build`        | build de producao               |
| `npm run validate`     | typecheck, lint, testes e build |

## Sincronizacao

O nucleo fica em `src/sync` e nao depende de React. A ordem e pull de musicas,
repertorios e itens, depois push na mesma ordem. A conta local e os tres
cursores ficam em `settings`. A regra e maior `revision`; em empate, vence a
versao que o servidor ja escolheu. O relogio local nao decide conflitos.

Exclusoes sao mantidas como marcas. A migracao v5 e descrita em
`src/database/MIGRATION_V5.md`. Preferencias, favoritos e posicao do modo show
nao sincronizam nesta etapa.

## Supabase

O arquivo `supabase/migrations/202611070001_v2_sync.sql` nao foi executado pelo
projeto. A aplicacao deve ser manual, primeiro em um projeto de teste, conforme
`supabase/README.md`. As tabelas antigas e o bucket de PDFs ficam intactos.

Todos os testes usam IndexedDB falso e backend em memoria; nenhum teste acessa
o Supabase real ou depende de rede.
