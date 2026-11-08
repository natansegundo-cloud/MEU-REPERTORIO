# Configuração do Supabase — Meu Repertório V2

Este documento descreve a configuração necessária para habilitar a camada opcional de nuvem. O aplicativo continua funcionando com IndexedDB sem Supabase, login ou internet.

## Variáveis do frontend

Crie ou preencha o `.env` local da V2, que não deve ser versionado:

```dotenv
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-ou-anon-key>
```

Use somente a chave publishable/anon. Nunca coloque `service_role`, chave secreta ou token administrativo no frontend. O arquivo `.env.example` contém somente os nomes das variáveis.

Depois de alterar o `.env`, reinicie o Vite ou gere novamente o build, porque variáveis `VITE_*` são incorporadas durante a compilação.

## Migration e banco remoto

Em um projeto Supabase de teste separado:

1. Abra o SQL Editor.
2. Revise `supabase/migrations/202611070001_v2_sync.sql`.
3. Execute o arquivo inteiro manualmente.
4. Confira as tabelas `v2_songs`, `v2_repertories` e `v2_repertory_items`.
5. Confira índices, trigger de `updated_at`, RLS, políticas e RPCs `v2_upsert_*`.

O aplicativo não executa migrations automaticamente. Não aplicar este SQL em produção sem confirmar o projeto, o backup e o escopo das tabelas.

## Auth, Google OAuth, OTP e Magic Link

No painel Supabase, em Authentication:

- habilite o provedor Email;
- mantenha confirmação por e-mail conforme a política do projeto;
- configure o Site URL com a URL HTTPS publicada;
- adicione a URL local de desenvolvimento às Redirect URLs, normalmente `http://localhost:5173`;
- adicione também a origem HTTPS exata da publicação e, se necessário, a origem do preview autorizado.

O frontend envia `emailRedirectTo: window.location.origin` para o Magic Link e `redirectTo: window.location.origin` para o Google. Portanto, a origem usada para abrir o aplicativo precisa estar permitida nas Redirect URLs. O cliente usa PKCE, `persistSession`, `autoRefreshToken` e `detectSessionInUrl`; a troca do callback é feita pelo Supabase Client, sem armazenamento manual de tokens.

### Google OAuth

O fluxo usa a mesma instância do Supabase Client e redireciona o navegador para o Google. Nenhum segredo do Google vai para o frontend.

1. No Google Cloud Console, configure a tela de consentimento OAuth e, durante o teste, adicione somente contas de teste autorizadas.
2. Crie uma credencial OAuth de aplicativo Web.
3. Em **Authorized JavaScript origins**, adicione as origens que realmente serão usadas, por exemplo `http://localhost:5173` e a origem HTTPS publicada.
4. Em **Authorized redirect URIs**, adicione o callback do projeto Supabase: `https://<project-ref>.supabase.co/auth/v1/callback`.
5. No Supabase, abra **Authentication > Providers > Google**, habilite o provider e informe o Client ID e o Client Secret somente no painel do Supabase.
6. Em **Authentication > URL Configuration**, confira o Site URL e as Redirect URLs da aplicação.

O retorno para a origem da aplicação permite que o `detectSessionInUrl` conclua o callback no contexto que iniciou o login. No iOS, isso precisa ser confirmado no Safari e na PWA instalada: o WebKit pode abrir o provedor em outro contexto e não compartilha automaticamente o armazenamento entre Safari e Web.app.

### OTP por e-mail

O fluxo de OTP é separado do Magic Link:

1. o usuário informa o e-mail;
2. a aplicação chama `signInWithOtp`;
3. o usuário digita os seis dígitos recebidos;
4. a aplicação chama `verifyOtp` com `type: 'email'`;
5. o evento de sessão recuperado pelo Supabase inicia a sincronização.

Para receber um código numérico, o template de e-mail do provider precisa exibir `{{ .Token }}`. O template e a política de expiração/limite de tentativas são configurações do Supabase; o frontend não armazena o token e bloqueia o reenvio por 30 segundos. O Magic Link continua disponível como alternativa.

## Verificação segura

Antes de usar dados pessoais:

1. use uma conta de teste e uma caixa de entrada descartável/autorizada;
2. autentique em dois perfis de navegador independentes;
3. crie uma música de teste no perfil A e sincronize;
4. abra o perfil B com a mesma conta e confirme o pull;
5. use uma segunda conta para confirmar que não lê os dados da primeira;
6. teste edição, exclusão lógica, conflito e reconexão offline;
7. remova os dados de teste somente no projeto de teste, depois de registrar os resultados.

Não envie e-mails de teste para contas pessoais sem autorização e não cole chaves ou tokens no chat.

## Estado verificado em 08/11/2026

Neste checkout, as duas variáveis `VITE_*` estão configuradas localmente. Uma sondagem sem login retornou HTTP 200 para as configurações de Auth, informou o provedor de e-mail habilitado, confirmação automática desabilitada e HTTP 401 para leitura anônima de `v2_songs`.

Esses resultados confirmam conectividade e que a leitura anônima não foi autorizada; não confirmam que a migration foi aplicada no projeto correto, nem substituem o teste de Magic Link, RLS autenticado ou sincronização entre duas contas.
