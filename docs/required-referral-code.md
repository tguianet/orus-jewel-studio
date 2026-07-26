# Código de indicação obrigatório

## Modelo oficial

| Conceito | Onde |
|----------|------|
| Patrocinadora (vínculo) | `resellers.parent_id` |
| Código compartilhável | `resellers.referral_code` (UPPER, único) |
| Legado | UUID de `resellers.id` ainda válido na validação |
| Histórico | `referral_code_history` (códigos regenerados ficam inválidos) |

Não há `invite_code` / `referral_tokens` / `sponsor_reseller_id` como coluna.

## Fluxo de cadastro

1. Frontend valida com `validate_referral_code`.
2. Cadastro via `register_reseller_with_referral` (revalida no servidor).
3. Trigger `handle_new_user` exige indicação (exceto metadata `allow_root_without_sponsor` só para fluxos admin controlados).
4. Contas antigas sem `parent_id` usam `ReferralGate` + `set_my_reseller_parent_by_code`.

## Admin

- Ver/copiar código; regenerar com confirmação.
- Corrigir patrocinadora com motivo + anti-ciclo (`admin_set_reseller_sponsor`).
- Usuário raiz: `admin_create_root_reseller`.

## Migration

`supabase/migrations/20260806120000_required_referral_code.sql` — **não aplicar automaticamente**.

## Aplicação (migration 9)

Aplicada **sem** `register_reseller_with_referral`: a versão original fazia `INSERT`
direto em `auth.users` / `auth.identities`, incompatível e inseguro no Lovable Cloud.

Fluxo oficial de cadastro:

1. `validate_referral_code` (anon) no frontend;
2. `supabase.auth.signUp` com `options.data.referral_code`;
3. trigger `handle_new_user` revalida o código no servidor e grava
   `parent_id`, profile, role `sacoleira`, reseller e loja;
4. código inválido → cadastro falha; sem código → conta criada sem
   patrocinadora e bloqueada pelo `ReferralGate` até informar o código.
