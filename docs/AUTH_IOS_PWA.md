# Autenticação no iOS/PWA — Google OAuth, OTP e Magic Link

**Etapa:** 18 — autenticação para PWA iOS  
**Checkout:** `v2`  
**Status:** implementação local concluída; configuração externa e homologação física pendentes.

## 1. Diagnóstico da arquitetura encontrada

O aplicativo usa uma única instância de `@supabase/supabase-js`, criada por
`src/sync/supabase-backend.ts` somente quando `VITE_SUPABASE_URL` e
`VITE_SUPABASE_PUBLISHABLE_KEY` estão disponíveis. O Supabase Client está configurado com:

- `persistSession: true`;
- `autoRefreshToken: true`;
- `detectSessionInUrl: true`;
- `flowType: 'pkce'`;
- armazenamento padrão do ambiente do navegador, isolado pelo contexto da PWA.

`CloudSyncController` registra `onAuthStateChange`, recupera a sessão inicial com
`getSession` e cria o `SyncCoordinator` somente depois que o Supabase informa um usuário
autenticado. O logout chama a API oficial e não remove músicas, repertórios ou preferências
do IndexedDB.

O callback OAuth/Magic Link retorna para a origem da aplicação. Não há rota de callback
duplicada: o `detectSessionInUrl` do cliente processa o retorno e o evento de sessão
atualiza a sincronização.

## 2. Fluxos implementados

### Google OAuth

O botão principal da área **Ajustes > Nuvem** chama `signInWithOAuth` com provider
`google` e `redirectTo: window.location.origin`. O fluxo é redirecionado, não usa popup,
não depende de cookies ou sessão prévia no Safari e não copia access token/refresh token
para o código da aplicação.

O Client Secret do Google fica somente no provider Google do Supabase. O frontend recebe
apenas a chave publishable/anon, que não concede acesso administrativo.

### OTP por e-mail

O usuário informa o e-mail, solicita o código, digita seis dígitos e confirma. O backend
chama `signInWithOtp` para envio e `verifyOtp` com `type: 'email'` para validação. O token
não é persistido pela aplicação.

O reenvio fica bloqueado por 30 segundos e a interface informa o tempo restante. Código
com quantidade diferente de seis dígitos é rejeitado antes da requisição. Erros do
Supabase, inclusive código inválido ou expirado, mantêm os dados locais e permitem nova
tentativa quando o provider aceitar o envio.

Magic Link continua disponível para preservar o comportamento anterior.

## 3. iOS, Safari e PWA instalada

Uma PWA instalada na Tela de Início pode ter `localStorage`, IndexedDB e cookies separados
da aba do Safari. Por isso, a implementação não tenta compartilhar sessão manualmente nem
assume que um login feito no Safari autenticará a PWA.

O login deve ser iniciado dentro do contexto que será usado:

1. abra a PWA instalada;
2. entre em **Ajustes > Nuvem**;
3. inicie Google ou OTP nessa própria PWA;
4. conclua o retorno no contexto indicado pelo iOS;
5. feche e reabra a PWA para confirmar a recuperação da sessão.

O redirecionamento para a origem não garante, sozinho, que o iOS reabrirá o Web.app em
vez do Safari. Esse comportamento depende da versão do iOS e do fluxo externo do provedor
e precisa de teste físico. Se o retorno terminar no Safari, o usuário deve repetir o login
com a PWA aberta e registrar o comportamento observado; não se deve considerar a sessão
compartilhada automaticamente.

## 4. Configuração externa necessária

O frontend está preparado, mas os fluxos reais dependem de:

- provider Google habilitado no Supabase;
- Client ID e Client Secret do Google configurados somente no painel Supabase;
- callback `https://<project-ref>.supabase.co/auth/v1/callback` autorizado no Google Cloud;
- Site URL e Redirect URLs do Supabase contendo as origens local e publicada;
- template de e-mail do OTP exibindo `{{ .Token }}`;
- inbox de teste para receber OTP/Magic Link;
- conta Google de teste autorizada no projeto OAuth enquanto o consentimento estiver em modo teste.

Os passos completos, sem valores secretos, estão em [`SUPABASE_CONFIGURACAO.md`](SUPABASE_CONFIGURACAO.md).

## 5. Testes automatizados executados

Foram adicionados testes para:

- chamada do Google OAuth e redirect da origem;
- envio de OTP;
- validação de OTP com `type: 'email'`;
- erro de código inválido/expirado;
- entrada de código com seis dígitos;
- bloqueio do reenvio dentro de 30 segundos;
- preservação do Magic Link, logout e estados da tela Nuvem.

Os testes unitários são simulados e não substituem autenticação real no Google,
recebimento real de e-mail ou homologação em iPhone/iPad.

## 6. Roteiro de homologação real

Registrar data, modelo, versão do sistema e resultado para cada cenário:

1. login Google no desktop;
2. login Google no Android;
3. login Google no Safari do iPhone;
4. login Google na PWA instalada do iPhone;
5. OTP no desktop;
6. OTP no Android;
7. OTP no Safari do iPhone;
8. OTP na PWA instalada do iPhone;
9. encerrar completamente a PWA e reabrir;
10. confirmar a sessão persistida;
11. criar/editar música e repertório e confirmar sincronização;
12. ativar modo offline e confirmar que a biblioteca local continua acessível;
13. confirmar que logout não remove os dados locais;
14. fazer novo login e confirmar que a sincronização retoma.

Até que esse roteiro seja executado com contas de teste e dispositivos reais, o Google
OAuth e o OTP devem ser considerados implementados no código, mas não homologados em
produção.

## 7. Limitações conhecidas

- Safari e a PWA instalada podem manter sessões independentes.
- O iOS pode suspender ou encerrar a PWA em segundo plano.
- O retorno de um provedor OAuth externo pode abrir o Safari em vez do Web.app.
- A validade, expiração e limite de tentativas do OTP dependem da configuração do Supabase.
- Sem variáveis `VITE_SUPABASE_*`, Google, OTP, Magic Link e sincronização ficam indisponíveis,
  mas a biblioteca offline continua funcionando.
- Nenhuma homologação física de iPhone, iPad ou Android foi declarada nesta etapa.
