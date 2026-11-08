# Homologação PWA — iPhone e iPad

**Etapa:** 14 — foco iOS/iPadOS
**Data:** 08/11/2026
**Checkout:** `v2`
**Status:** implementação e validação automatizada concluídas; homologação física pendente.

## 1. Escopo e conclusão

O Meu Repertório V2 continua sendo uma aplicação web offline-first. Não foi criado
aplicativo nativo, não há dependência da App Store e nenhuma alteração foi feita no
Supabase, nas migrations, no parser, no motor musical ou na versão antiga.

O fluxo alvo para iPhone e iPad é:

1. acessar a aplicação por HTTPS no Safari;
2. tocar em **Compartilhar**;
3. escolher **Adicionar à Tela de Início**;
4. confirmar a adição;
5. abrir o ícone em modo de aplicação web.

O checkout agora possui os metadados Apple necessários, orientação discreta de
instalação em **Ajustes**, detecção de modo instalado quando o navegador oferece essa
informação e recuos adicionais para áreas seguras. A instalação e o uso em aparelho
Apple real ainda não foram executados por falta de um iPhone/iPad disponível neste
ambiente.

## 2. Configuração encontrada

### Manifest

O `vite-plugin-pwa` gera `dist/manifest.webmanifest` no build de produção com:

- `id: "/"` para identidade estável da aplicação;
- `name: "Meu Repertório"` e `short_name: "Repertório"`;
- `lang: "pt-BR"`;
- `start_url` e `scope` em `/`;
- `display: "standalone"`;
- `orientation: "any"`;
- cores de fundo e tema para a inicialização;
- ícones PNG de 192 e 512 pixels, além de ícone `maskable` de 512 pixels.

O HTML também declara `apple-touch-icon` apontando para o PNG de 192 pixels. O
WebKit dá preferência ao `apple-touch-icon` quando ele está presente, por isso o
arquivo foi mantido explicitamente no `head`.

### Metadados Apple e viewport

`index.html` contém:

- `viewport-fit=cover`;
- `apple-mobile-web-app-capable=yes`;
- `apple-mobile-web-app-title=Meu Repertório`;
- `apple-mobile-web-app-status-bar-style=default`;
- `apple-touch-icon`.

O valor `default` foi escolhido para preservar uma barra de status compatível com o
tema claro padrão. A aparência exata da barra pode variar entre versões do iOS e
deve ser confirmada no aparelho, especialmente no modo escuro.

### Ajuda de instalação

`src/components/system/InstallHelp.tsx` foi adicionado à tela de Ajustes. A seção é
recolhida por padrão e explica o fluxo do Safari. Não existe botão que prometa
disparar um prompt nativo, porque o iOS confirma a adição pelo menu Compartilhar.

Quando disponível, a aplicação considera instalada a combinação de:

- `matchMedia('(display-mode: standalone)')`;
- `navigator.standalone`, usado pelo Safari legado de iOS.

Essa detecção só informa o estado; ela não bloqueia o uso em uma aba normal.

## 3. Service Worker e cache

O build usa `vite-plugin-pwa` em modo `generateSW`, com registro em modo `prompt`.
O Service Worker gerado:

- precacheia o shell da aplicação, JavaScript, CSS, fontes, ícones e manifest;
- usa `navigateFallback: /index.html` para as navegações da SPA;
- preserva a exceção para caminhos `/api/`;
- usa `CacheFirst` apenas para chunks do PDF.js, com no máximo quatro entradas e
  validade de 30 dias;
- remove caches antigos do Workbox;
- só executa `skipWaiting` depois da confirmação explícita do usuário.

No build validado foram geradas **22 entradas precache**, totalizando aproximadamente
**816,41 KiB**. Os chunks pesados do PDF.js não entram no precache inicial e são
carregados somente quando a importação de PDF é usada.

O deploy Vercel também envia `Cache-Control: no-cache` para `/sw.js` e
`/manifest.webmanifest`, reduzindo o risco de uma versão antiga do Service Worker ou
do manifest ficar presa em cache HTTP.

## 4. Atualizações seguras

O registro do PWA usa `registerType: 'prompt'`. Quando uma nova versão é encontrada,
`main.tsx` emite um evento interno e a interface mostra **Nova versão disponível —
atualizar**.

- a troca só ocorre após toque no botão **Atualizar**;
- o botão dispara a ativação do Service Worker aguardando;
- o modo show não exibe o aviso enquanto está ativo, evitando interromper uma
  apresentação;
- o IndexedDB não é limpo, recriado ou migrado pelo fluxo de atualização;
- o fallback de erro orienta recarregar sem afirmar que os dados locais foram
  apagados.

Ainda é necessário confirmar em aparelho real a atualização de uma instalação já
existente e o retorno ao modo show depois da atualização.

## 5. Safe areas e modo show

Foram ajustados:

- topo do `Topbar` global;
- topo, laterais e rodapé do modo show;
- navegação fixa anterior/próxima;
- painel inferior de músicas;
- aviso de atualização;
- navegação inferior mobile já existente.

Os estilos usam `env(safe-area-inset-top/right/bottom/left)` junto com
`viewport-fit=cover`. Assim, a câmera, o sensor, as bordas arredondadas e a barra
inferior não devem encobrir controles quando o dispositivo estiver em orientação
vertical ou horizontal.

No modo show:

- os controles têm altura mínima de toque de aproximadamente 44 pixels;
- a cifra permanece em fluxo de rolagem vertical;
- a navegação entre músicas funciona por botões, teclado quando disponível e gesto
  horizontal;
- a posição e preferências são persistidas localmente;
- o Wake Lock é solicitado somente quando a API está disponível;
- quando a API não existe, a interface informa que a tela acesa não é suportada.

Não há promessa de tela sempre ligada. O iOS pode suspender a aplicação ao ir para
segundo plano ou sob pressão de memória; ao retornar, o estado persistido deve ser
recarregado, mas isso precisa ser verificado em aparelho físico.

## 6. Funcionamento offline

Depois do primeiro carregamento online, a combinação Service Worker + IndexedDB
permite usar localmente:

- biblioteca e pesquisa;
- músicas, letras e cifras;
- favoritos;
- repertórios e seus itens;
- edição;
- transposição;
- modo show e posição local;
- backup e restauração locais.

Supabase continua opcional. A falha de conexão não impede a biblioteca local; apenas
deixa a sincronização indisponível ou pendente. PDF.js é um recurso carregado sob
demanda e precisa ter sido carregado/cacheado antes para ser usado sem rede.

No iOS, uma aba do Safari e uma aplicação aberta pela Tela de Início podem possuir
armazenamentos separados. O teste offline deve ser feito no mesmo contexto que será
usado em apresentação; um dado criado na aba não deve ser considerado automaticamente
presente no app instalado.

## 7. Compatibilidade iOS/iPadOS

O WebKit documenta o uso de manifest com `display: standalone` e de
`apple-mobile-web-app-capable` para o comportamento de aplicação web na Tela de
Início. Também documenta `apple-touch-icon` como forma explícita de fornecer o ícone.
Referências:

- [Apple — Configuring Web Applications](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
- [WebKit — Web Push for Web Apps on iOS and iPadOS](https://webkit.org/blog/13878/)
- [Apple — Design for Safari 15: safe areas](https://developer.apple.com/videos/play/wwdc2021/10029/)
- [WebKit — Web apps em Safari 26](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)

O suporte do WebKit não equivale a homologar todos os modelos, versões do sistema,
perfis de economia de energia ou configurações de armazenamento. O teste físico é
obrigatório antes de declarar o produto homologado para apresentações.

## 8. Testes automatizados executados

### Passaram

- `npm run typecheck` — passou.
- `npm run lint` — passou.
- `npm run format:check` — passou.
- `npm test` — 29 arquivos e 146 testes aprovados.
- `npm run build` — passou; manifest e Service Worker gerados, 22 entradas precache.
- `npx vitest run src/components/system/InstallHelp.test.tsx src/services/storage.test.ts`
  — 2 arquivos e 6 testes aprovados.
- `npx playwright test e2e/pwa.spec.ts` — 8 testes aprovados em Chromium desktop,
  mobile Chromium, WebKit com iPhone simulado e WebKit com iPad simulado.

Os testes PWA cobrem manifest, identidade, `standalone`, ícones, Apple Touch Icon,
metadados Apple, instruções de instalação, registro do Service Worker e recarga do
shell sem conexão.

### Suíte E2E completa

`npm run test:e2e` executou 40 testes: **38 passaram e 2 falharam**. As duas falhas
foram o teste antigo que espera a nuvem como `Indisponível`. O `.env` deste checkout
possui as variáveis `VITE_SUPABASE_*`; portanto, o comportamento real esperado é a
tela de nuvem configurada/desconectada, não indisponível. Os testes PWA passaram nas
duas variantes Chromium durante essa execução. A falha não envolve manifest,
Service Worker, WebKit, IndexedDB ou offline.

Nenhum valor de variável, credencial ou token foi registrado.

## 9. Testes simulados versus testes físicos

### Executados pelo agente

- preview de produção servido pelo Vite;
- Chromium desktop e mobile emulado;
- WebKit do Playwright com perfil de iPhone simulado;
- WebKit do Playwright com perfil de iPad simulado;
- recarga offline após o Service Worker ficar pronto;
- verificação automatizada do manifest e do cache essencial;
- testes unitários da detecção standalone e da persistência de armazenamento.

### Pendentes em aparelho Apple real

- Safari no iPhone por HTTPS;
- Safari no iPad por HTTPS;
- adição à Tela de Início pelo menu Compartilhar;
- abertura pelo ícone sem barra do Safari;
- título e ícone na Tela de Início;
- splash/launch screen observada no modelo e versão usados;
- modo claro e escuro;
- portrait e landscape com notch/câmera;
- uso offline após fechar, reabrir e reiniciar o dispositivo;
- editor, favoritos, repertórios, transposição e modo show offline;
- suspensão em segundo plano e retorno durante o show;
- atualização da instalação sem perda de dados;
- comportamento diante de armazenamento cheio ou limpeza do sistema.

Por isso, a homologação física **não está concluída**.

## 10. Roteiro de homologação física

### A. Safari em aba normal

1. Conectar ao endereço HTTPS da publicação.
2. Abrir Biblioteca, Ajustes e a seção de instruções.
3. Alternar entre claro e escuro no sistema.
4. Repetir em iPhone portrait/landscape e iPad portrait/landscape.
5. Confirmar que não há rolagem horizontal nem controles cortados.

### B. Instalação

1. No Safari, abrir o endereço HTTPS.
2. Tocar em **Compartilhar**.
3. Escolher **Adicionar à Tela de Início**.
4. Confirmar o nome e o ícone.
5. Fechar a aba do Safari.
6. Abrir pelo ícone da Tela de Início.
7. Confirmar modo standalone, barra de status, safe areas e launch screen.

### C. Biblioteca offline

1. Online, criar ou importar uma música de teste.
2. Criar um repertório, adicionar a música e favoritar.
3. Abrir a música, editar letra/cifra e alterar o tom.
4. Abrir o modo show e navegar entre duas músicas.
5. Fechar o app instalado.
6. Ativar modo avião.
7. Abrir novamente pelo ícone.
8. Repetir biblioteca, repertório, favorito, edição, tom e modo show.
9. Confirmar que as alterações persistem depois de fechar e abrir novamente.

### D. Suspensão e modo show

1. Abrir um repertório no modo show.
2. Iniciar rolagem automática e observar a estabilidade.
3. Girar o aparelho nas duas orientações.
4. Bloquear/desbloquear ou enviar o app ao segundo plano por alguns minutos.
5. Retornar e verificar a música e posição recuperadas.
6. Registrar se a tela permaneceu acesa; não considerar isso obrigatório no iOS.

### E. Atualização

1. Com dados de teste já salvos, publicar uma nova versão do frontend.
2. Abrir o app instalado fora do modo show e aguardar a detecção.
3. Confirmar que o aviso é compreensível e que a atualização não é forçada.
4. Entrar no modo show antes de atualizar e confirmar que o aviso não interrompe a
   apresentação.
5. Atualizar em momento seguro.
6. Reabrir a biblioteca, repertório e backup e confirmar a preservação dos dados.

### F. Resiliência

1. Testar novamente após reiniciar o aparelho.
2. Se possível, testar com pouco espaço livre sem apagar dados de produção.
3. Fazer e guardar um backup JSON antes de qualquer teste destrutivo.
4. Registrar modelo, versão do iOS/iPadOS, navegador, orientação, rede e resultado.

## 11. Limitações conhecidas

- Não há evidência física de instalação ou funcionamento no Safari/iPhone/iPad neste
  checkout.
- WebKit do Playwright simula a engine, mas não reproduz totalmente Web.app, Tela de
  Início, status bar, suspensão, teclado, memória ou políticas de armazenamento do
  dispositivo.
- O iOS pode suspender ou encerrar uma PWA; o aplicativo persiste dados importantes,
  mas não promete execução contínua nem Wake Lock universal.
- A meta de status bar é estática; o resultado em modo escuro precisa ser observado
  no modelo real.
- Não foi criado splash screen raster específico por modelo. A tela de lançamento é
  deixada para o comportamento do sistema com manifest, ícone e cores declarados.
- IndexedDB e caches podem sofrer limpeza por decisão do sistema/navegador. O backup
  local continua recomendado e não é substituído pela persistência solicitada.
- A aba do Safari e o app instalado podem usar contextos de armazenamento distintos.
- Favoritos, preferências de leitura e posição do show continuam locais e não são
  sincronizados pelo Supabase atual.

## 12. Arquivos criados ou modificados nesta etapa

- `index.html`: metadados Apple e Apple Touch Icon explícitos.
- `src/components/system/InstallHelp.tsx`: orientação de instalação e detecção
  standalone.
- `src/components/system/InstallHelp.module.css`: estilo discreto da orientação.
- `src/components/system/InstallHelp.test.tsx`: cobertura da orientação e detecção.
- `src/components/layout/Topbar.module.css`: safe area superior e laterais.
- `src/features/show-mode/ShowModePage.module.css`: safe areas do show e painel
  inferior.
- `e2e/pwa.spec.ts`: manifest, Apple metadata, instalação orientada e offline.
- `playwright.config.ts`: perfis WebKit simulados de iPhone e iPad para os testes
  PWA.
- `src/services/storage.ts` e `src/services/storage.test.ts`: tratamento seguro da
  API de persistência incompleta e seus testes.
- `e2e/offline.spec.ts`: verificação explícita do cache precache antes do offline.
- `vite.config.ts`: identidade estável `manifest.id`.
- `vercel.json`: `Cache-Control: no-cache` para Service Worker e manifest.

## 13. Próximas ações recomendadas

1. Executar o roteiro físico em pelo menos um iPhone e um iPad com Safari.
2. Repetir o roteiro com o app instalado e modo avião.
3. Validar atualização após uma publicação nova, com backup guardado.
4. Ajustar apenas detalhes observados nos dispositivos reais, sem alterar o parser,
   motor musical, Supabase ou banco sem necessidade.

Esta etapa não avança automaticamente para outra etapa.
