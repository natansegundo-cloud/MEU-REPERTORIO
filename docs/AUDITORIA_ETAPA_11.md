# Auditoria funcional e de experiência — Meu Repertório V2

**Etapa:** 11
**Data:** 08/11/2026
**Escopo:** diagnóstico do checkout `v2`, sem alteração de banco, migration ou versão antiga.

## 1. Resumo executivo

O aplicativo está funcional como PWA local offline-first. Biblioteca, importação TXT, importação PDF textual, edição estruturada, transposição, diagramas, favoritos, repertórios, modo show, IndexedDB, PWA e os fluxos offline principais estão implementados e passaram pelas validações automatizadas disponíveis.

O maior risco de produto não está no uso local, mas na proteção e continuidade dos dados entre aparelhos: a sincronização Supabase depende de configuração externa, aplicação manual da migration e validação real de autenticação/duas sessões. Além disso, não existe backup/exportação e restauração para uma segunda camada de segurança. Esses pontos devem ser tratados antes de considerar a proteção de dados entre dispositivos concluída.

Não foi possível confirmar neste ambiente a operação do Supabase real, a aplicação da migration em um projeto remoto, o recebimento de magic link ou a instalação em aparelho físico. Os testes de nuvem usam backend em memória e a configuração local disponível usa nomes `NEXT_PUBLIC_*`, enquanto o código da V2 lê `VITE_*`.

## 2. Como a auditoria foi executada

### Evidência testada

- `npm run validate`: passou; typecheck, lint, 25 arquivos de teste Vitest, 126 testes e build de produção.
- `npm run format:check`: passou.
- `npm run test:e2e`: passou; 30 testes em Chromium desktop e mobile-chrome.
- `npm audit --omit=dev`: 0 vulnerabilidades de produção.
- Smoke manual em preview de produção: importação de TXT, pesquisa, edição, favorito, repertório, modo show, offline e diagramas.
- Smoke manual complementar: confirmação/cancelamento de exclusão em Favoritos e Repertório; diagramas desligados por padrão; viewport de 768 px sem overflow horizontal; manifest e Service Worker registrados.
- Smoke manual de PDF: arquivo PDF textual sintético carregado pelo seletor real do navegador, texto extraído, conteúdo revisado e música salva.

### Apenas inspecionado ou não reproduzível neste ambiente

- Supabase real, magic link, RLS remoto, aplicação da migration e sincronização entre dois aparelhos.
- Instalação efetiva em Android/iOS/desktop e comportamento de atualização de uma instalação já existente.
- PDF escaneado/imagem e documentos protegidos/corrompidos em variedade real de arquivos.
- Teste de recuperação de falha física do IndexedDB, quota excedida ou limpeza automática do armazenamento pelo sistema.
- Compatibilidade em navegador Safari/iOS e aparelhos físicos.

## 3. Estado atual do aplicativo

Stack identificada: React 19, TypeScript strict, Vite, Dexie/IndexedDB, Vitest, Testing Library, Playwright, pdfjs-dist e vite-plugin-pwa. A aplicação funciona sem `.env` para os recursos locais; a área de nuvem aparece como indisponível quando não há as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.

O banco local está no schema 5, com migrações incrementais, tombstones para músicas/repertórios/itens e campos de pendência de sincronização. A navegação principal é controlada por estado React; somente o modo show possui rota hash persistida.

## 4. Funcionalidades concluídas e operacionais

### Biblioteca e pesquisa

- Lista reativa de músicas ativas, ordenada por título/artista.
- Pesquisa instantânea por título, artista e tom.
- Filtro de favoritas.
- Estados vazio, carregamento e erro de leitura local.
- Exclusão lógica com confirmação na Biblioteca e nos Favoritos.

### Importação TXT

- Colagem direta de conteúdo e carregamento de arquivo TXT.
- Decodificação UTF-8 com fallback ISO-8859-1.
- Parser independente da interface, com diagnóstico de erros e avisos.
- Metadados editáveis antes da gravação.
- Entrada inválida não é salva.

### Importação PDF

- Extração de texto com PDF.js, limite de 20 MB e mensagem para PDF sem camada textual.
- Reconstrução de linhas, colunas, cabeçalho, tom e metadados básicos.
- PDF textual foi testado manualmente pelo fluxo real de arquivo.
- A implementação não faz OCR; PDF escaneado é informado como sem texto.

### Visualização, editor e motor musical

- Visualização estruturada de letra e cifras.
- Transposição por semitons, preservando acordes complexos conforme os testes do motor.
- Tom original, tom preferido, capo e informações musicais.
- Editor estruturado de metadados, linhas, cifras e posição das cifras.
- Validação antes de salvar e detecção de conflito de revisão.
- Diagramas de acordes disponíveis sob demanda e ocultos por padrão; preferência local é persistida.

### Favoritos

- Marcação/desmarcação na biblioteca e na tela da música.
- Tela dedicada com estado vazio.
- Exclusão de música favorita pede confirmação.
- O favorito é local e não faz parte da sincronização Supabase nesta versão.

### Repertórios

- Criação, pesquisa, renomeação, duplicação e exclusão com confirmação.
- Adição e remoção de músicas.
- Ordem por botões, teclado, drag-and-drop desktop e gesto de toque.
- Tom próprio por item.
- Preservação do item quando a música original foi removida.

### Modo show

- Abertura de repertório, música anterior/próxima e lista de faixas.
- Navegação por teclado e gesto horizontal.
- Transposição por item, tamanho da letra, velocidade de rolagem e auto-scroll.
- Diagramas sob demanda, wake lock quando suportado e saída com confirmação visual.
- Posição atual persistida localmente e retomada após recarregar/offline.

### IndexedDB, offline e PWA

- Dexie com migrações incrementais até o schema 5.
- Biblioteca, editor, repertórios, transposição e modo show operam localmente.
- Service Worker gerado pelo Workbox, manifest de instalação e atualização com confirmação.
- Solicitação de armazenamento persistente quando o navegador oferece a API.
- Build de produção gerado corretamente e Service Worker registrado no preview.

## 5. Funcionalidades incompletas ou condicionais

1. **Sincronização real entre aparelhos:** o núcleo, outbox, cursores, revisões, tombstones, retry e backend Supabase estão implementados, mas a operação contra um projeto Supabase real não foi validada.
2. **Setup Supabase:** a migration é manual e o README declara que ela não foi executada pelo projeto. Sem esse passo, a nuvem não está operacional.
3. **Backup/exportação/restauração:** esta lacuna da auditoria original foi tratada na Etapa 12 com backup JSON versionado, validação de integridade, prévia de conflitos, restauração transacional e exportação TXT individual.
4. **Preferências entre aparelhos:** favoritos, preferências de leitura e posição do modo show ficam somente no dispositivo atual.
5. **Configurações:** a tela Ajustes informa versão, persistência do armazenamento e backup local; tema e preferências gerais centralizadas continuam fora do escopo.
6. **Instalação PWA:** manifest e registro foram confirmados; instalação efetiva, prompt e atualização de uma instalação existente ainda dependem de teste em navegador/dispositivo real.
7. **PDF:** o fluxo textual funciona; OCR e PDFs escaneados não são suportados.

## 6. Bugs encontrados e correções realizadas

### Corrigidos nesta etapa

- Exclusão pela tela de Favoritos não tinha confirmação e engolia erro de persistência. Foi adicionada confirmação e mensagem de erro.
- Exclusão de música pela Biblioteca engolia erro de persistência sem feedback. Foi adicionada mensagem de erro visível.
- Remoção de música dentro do editor de repertório não tinha confirmação. Foi adicionada confirmação antes da operação.
- Quatro telas usavam `--color-background`, variável inexistente nos tokens atuais. O fundo desses campos/painéis foi ajustado para `--color-surface-raised`.
- `AGENTS.md` era incluído no `format:check` apesar de ser documentação de instruções, causando falha de formatação fora do código. Foi incluído no `.prettierignore`.

### Problemas observados, sem correção estrutural nesta etapa

- O ambiente `.env` local contém nomes `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, mas a V2 procura `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. O resultado local é nuvem indisponível. Não alterei o `.env` nem seus valores.
- A tela de edição de repertório apresenta a ação “Revisar versão atual” após conflito, mas o handler apenas limpa a mensagem; não existe um recarregamento explícito da tela nessa ação. O live query pode atualizar os dados, mas o nome do controle promete mais do que o código garante.
- A navegação de Biblioteca, edição e telas internas não é recuperada por URL após recarregar; o modo show é a exceção com hash. Isso pode causar retorno inesperado à lista após um refresh.

## 7. Problemas de UX e interface

### Desktop

- Hierarquia e navegação são claras, com sidebar persistente e estados vazios úteis.
- A tela de música concentra controles de tom, repertório, favorito, edição e leitura; em músicas longas o bloco de ações pode ficar denso.
- O modo show tem foco adequado para execução, mas a configuração fica escondida atrás de um único controle e exige uma ação extra para alterar tamanho, rolagem ou diagramas.

### Tablet

- Foi verificado manualmente em 768 px sem overflow horizontal em Repertórios, Favoritos e Ajustes.
- O layout depende de vários pontos de quebra CSS; ainda não houve matriz completa em tablets físicos, orientação paisagem e teclado virtual.

### Mobile

- E2E passou em Pixel 7 e houve verificação de viewport estreita, offline e gesto no show mode.
- Bottom navigation é adequada para os quatro módulos principais.
- Formulários de importação e edição são longos; em telas pequenas o usuário precisa percorrer muitos campos antes da ação principal.
- Controles compactos de ícone têm rótulos acessíveis, mas precisam de validação visual em aparelhos com densidade e zoom diferentes.

### Estados e acessibilidade

- Há estados vazios, loading, sucesso e erro nas áreas principais.
- A aplicação possui skip link, foco visível, labels e `aria` em controles relevantes.
- Algumas falhas de operação ainda são percebidas apenas como estado reativo ou mensagem genérica, especialmente em operações assíncronas não cobertas por E2E.
- Não há confirmação de auditoria com leitor de tela, navegação completa somente por teclado em todos os fluxos ou contraste medido por ferramenta especializada.

## 8. Problemas técnicos e manutenção

- `ShowModePage.tsx` concentra carregamento, posição, preferências, transposição, auto-scroll, wake lock, gestos e renderização; é o componente de maior risco de manutenção.
- `ImportSongPage.tsx` reúne leitura de arquivo, metadados, diagnóstico, parser e persistência. Funciona, mas mistura responsabilidades de fluxo e apresentação.
- A suíte automatizada usa IndexedDB falso e backend Supabase em memória; isso é adequado para determinismo, mas não substitui smoke test remoto.
- Os testes Vitest são executados serialmente por configuração, e o ambiente jsdom é recriado por arquivo. A suíte passou, mas é lenta para manutenção contínua.
- O build separa PDF.js em chunks grandes e carrega o PDF sob demanda; isso preserva o carregamento inicial, mas a primeira importação de PDF é mais pesada.
- Não foram encontrados segredos `service_role` no código. O backend espera somente URL e chave publishable, com RLS definido na migration.
- A migration e as funções RPC possuem RLS e comparação por `revision`; a segurança remota permanece não comprovada até aplicação e teste em um projeto Supabase real.

## 9. Riscos para os dados

### Risco alto

- **Perda ou não transferência entre dispositivos:** sem Supabase configurado/aplicado e sem uma cópia de backup manual guardada, a biblioteca continua dependente do IndexedDB do dispositivo.
- **Falsa sensação de sincronização:** um ambiente com variáveis erradas ou migration não aplicada pode manter o usuário localmente funcional, mas sem cópia na nuvem.

### Risco moderado

- Limpeza/quota do armazenamento pelo navegador ou sistema pode afetar dados locais, embora o app solicite persistência quando suportado.
- Falha durante atualização do Service Worker não foi validada em uma instalação real.
- Favoritos, preferências e posição do show não acompanham o usuário para outro aparelho.

### Mitigações presentes

- IndexedDB local, tombstones e revisões.
- Migrações incrementais sem remoção automática de registros.
- Pendências e erros de sincronização ficam visíveis na área de Nuvem quando o backend está habilitado.
- Atualização do PWA pede confirmação e não executa limpeza do banco local.
- Backup local versionado, com validação e restauração transacional, oferece uma segunda camada independente da nuvem.

## 10. Recursos importantes ainda ausentes

- Smoke test automatizado contra ambiente Supabase de homologação.
- Teste de dois dispositivos com magic link, edição concorrente, exclusão offline e reconexão.
- Sincronização ou estratégia explícita para favoritos e preferências entre dispositivos.
- OCR opcional para PDF escaneado, caso isso faça parte do produto desejado.
- Auditoria real de instalação/atualização em Android, iOS, Chrome desktop e Safari.

## 11. Recomendações priorizadas

### P0 — crítico

Nenhum P0 reproduzido no checkout durante esta auditoria.

### P1 — importante antes de confiar nos dados entre aparelhos

1. **Validar e documentar o Supabase real em homologação.** Aplicar a migration em projeto de teste, corrigir o ambiente para `VITE_*`, validar magic link, RLS, pull/push, retry, conflito, exclusão e duas sessões. Benefício: comprova que a cópia entre aparelhos existe de fato e evita perda silenciosa.
2. **Definir a política de dados locais e quota.** Mostrar capacidade/estado quando possível, orientar backup e testar falhas de quota. Benefício: reduz o risco de o usuário descobrir tarde demais que o navegador removeu ou não conseguiu gravar dados.

### P2 — melhoria relevante

1. **Corrigir a ação “Revisar versão atual” do repertório.** Recarregar explicitamente o detalhe ou renomear o controle para refletir que ele apenas fecha a mensagem. Benefício: torna o tratamento de conflito previsível.
2. **Persistir rotas de navegação relevantes.** Permitir que música, editor e repertório possam ser reabertos após refresh quando apropriado. Benefício: evita perda de contexto durante ensaio/apresentação.
3. **Expandir testes de erro da interface.** Cobrir falha de gravação, conflito, PDF inválido, quota e erro de sync com mensagens verificadas. Benefício: garante feedback confiável quando o cenário mais importante é justamente a falha.
4. **Reduzir a concentração do modo show e da importação.** Separar hooks/serviços de preferências, sessão, auto-scroll e leitura de arquivo sem alterar comportamento. Benefício: diminui risco de regressão nas próximas etapas.
5. **Validar PWA em aparelhos físicos.** Testar instalar, fechar/abrir offline, atualizar com dados existentes e voltar de uma versão antiga. Benefício: confirma a experiência real de palco, não apenas o registro do Service Worker.
6. **Decidir o escopo de sincronização de favoritos e preferências.** Sincronizar ou comunicar de forma mais destacada que permanecem locais. Benefício: alinha expectativa entre dispositivos.

### P3 — refinamento

1. **Melhorar a organização dos controles no mobile.** Agrupar campos longos de importação/edição e manter a ação principal mais próxima do contexto. Benefício: reduz rolagem e erros durante cadastro.
2. **Medir contraste e testar leitor de tela/teclado.** Benefício: aumenta acessibilidade e confiabilidade dos controles compactos.
3. **Monitorar o custo do PDF.js.** Manter carregamento sob demanda e medir a primeira importação em aparelhos modestos. Benefício: preserva a velocidade do uso diário.

## 12. Roadmap recomendado

### Etapa 12 — backup e restauração

Concluída no checkout atual com formato JSON versionado, digest SHA-256, validação, tratamento de conflitos, restauração atômica, exportação TXT individual e cobertura unitária/E2E.

### Etapa 13 — confiança dos dados

Homologar Supabase real, corrigir configuração de ambiente, executar smoke test de duas contas/dispositivos e documentar o procedimento de publicação.

### Etapa 14 — confiabilidade de conflitos e PWA

Fechar a UX de conflito, testar quotas, atualização do Service Worker e instalação nos navegadores/dispositivos alvo.

### Etapa 15 — acessibilidade e manutenção

Separar os componentes mais complexos, adicionar testes de erro de UI, rodar auditoria de teclado/leitor de tela e revisar os fluxos mobile.

### Etapa 16 — refinamentos opcionais

Decidir sincronização de preferências/favoritos, OCR de PDF e melhorias de densidade visual somente depois de a proteção dos dados estar validada.

## 13. Alterações realizadas nesta etapa

- Adicionada confirmação e feedback de erro para exclusão em Favoritos.
- Adicionado feedback de erro para exclusão na Biblioteca.
- Adicionada confirmação para remoção de item de repertório.
- Corrigidas referências CSS para token existente de superfície.
- Excluído `AGENTS.md` da verificação de formatação.

Nenhum banco, migration, dado do usuário ou funcionalidade da versão antiga foi alterado.

## 14. Conclusão

O V2 está em condição funcional para uso local e offline, com uma base técnica consistente, backup local independente e uma suíte automatizada verde. A conclusão de “produto protegido entre aparelhos” ainda depende de validar o Supabase real. A próxima etapa recomendada é a homologação da nuvem, dos fluxos de recuperação e da instalação PWA em dispositivos reais; não é recomendado avançar para novas funcionalidades antes desse fechamento.

## 15. Atualização da Etapa 12

Implementado sem alterar Supabase, migrations, parser, motor musical ou a versão antiga:

- backup completo local em JSON v1 com SHA-256;
- validação estrutural, de versão, integridade, chaves duplicadas e relações;
- restauração em modo merge por padrão e substituição de conflitos somente com confirmação;
- transação IndexedDB cobrindo as seis tabelas, com rollback em falha;
- exportação TXT individual pela tela da música;
- testes de backup vazio/completo, arquivo inválido, versão incompatível, corrupção, conflitos, rollback e preservação;
- E2E em Chromium desktop e mobile para exportação, restauração e erro de arquivo;
- formato e procedimento documentados em `docs/BACKUP_RESTAURACAO.md`.

O backup não inclui credenciais, tokens, sessões ou chaves `sync.*`; também permanece limitado à versão suportada pelo aplicativo e ao limite de 50 MB.
