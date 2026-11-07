# Meu Repertorio V2

Aplicativo pessoal para organizar, estudar e executar repertorios musicais no
violao. A V2 e uma PWA React/Vite offline-first; a versao antiga que ficava na
pasta pai foi removida no fechamento da Etapa 10.

Versao de lancamento: **2.0.0**.

## Estado atual

Etapas 1 a 9 implementadas na V2:

- React 19, TypeScript strict, Vite, Dexie, Vitest, Testing Library e Playwright;
- motor musical, parser, biblioteca, editor, repertorios e modo show;
- IndexedDB com migracoes incrementais ate o schema 5;
- sincronizacao opcional de musicas, repertorios e itens via Supabase;
- pull incremental por `updated_at`, outbox por registro (`syncPending`),
  tombstones, revisoes e fila de sincronizacoes;
- area de Nuvem com magic link, estados offline/erro/sincronizado e protecao
  contra mistura de contas;
- backup JSON local com restauracao por mesclagem ou substituicao protegida,
  migracao somente-leitura da V1, importacao TXT/PDF e favoritos locais;
- importacao PDF sob demanda, com limite de 20 MB, extracao por coordenadas e
  cache de runtime sem precache do PDF.js;
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

## Lançamento 2.0.0

- A V1 foi removida da pasta pai por decisão explícita do usuário. A V2 é o
  único aplicativo mantido neste workspace.
- O aplicativo solicita persistência do armazenamento quando o navegador
  oferece essa API e exibe o estado em Ajustes > Dados.
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

## Backup e migracao

Os detalhes do formato do backup e da migracao da V1 estao em
[`docs/MIGRACAO_V1.md`](docs/MIGRACAO_V1.md). A restauracao valida o arquivo
antes de escrever, executa uma unica transacao Dexie e nunca importa tokens,
sessoes, e-mails, chaves, cursores ou fila de sincronizacao.
