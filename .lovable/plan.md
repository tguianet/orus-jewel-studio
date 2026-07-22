## Correção do fluxo de redefinição de senha

Arquivo único: `src/pages/ResetPasswordPage.tsx`

### Problema
A página fica presa em "Aguardando validação..." porque o link do Supabase moderno chega com `?code=...` na URL e nunca é trocado por sessão — o `onAuthStateChange` não dispara sozinho.

### Mudanças

1. No `useEffect` inicial:
   - Ler `code` de `new URLSearchParams(window.location.search)`.
   - Se existir, chamar `await supabase.auth.exchangeCodeForSession(code)`.
     - Sucesso → `setReady(true)` e limpar `code` da URL (`window.history.replaceState`).
     - Erro → `setError(mensagem amigável)` (link expirado / inválido).
   - Se não houver `code`, checar `supabase.auth.getSession()`; se já houver sessão, `ready = true`.
   - Manter listener `onAuthStateChange` para `PASSWORD_RECOVERY` e `SIGNED_IN`.
   - Timeout de segurança (ex. 8s): se nem `ready` nem `error` foram definidos, setar erro "Não foi possível validar o link".

2. Novo estado `error: string | null`.

3. Render:
   - Se `error`: mostrar mensagem clara + botão **"Solicitar novo link"** que navega para `/login-sacoleira` (onde já existe o fluxo de esqueci minha senha). Ocultar o formulário.
   - Se `!ready && !error`: manter texto atual de aguardando.
   - Se `ready`: mostrar formulário normalmente.

4. `handleSubmit` mantém: `updateUser({ password })` → toast sucesso → `signOut()` → `nav("/login-sacoleira")`.

5. Preservar layout, classes, cores, fontes, logo, textos existentes.

### Validação
- `bun run build`
- `tsgo` (typecheck)
- Mostrar diff do arquivo antes de concluir.

### Escopo
Sem alterar migrations, banco, RLS ou outras páginas.
