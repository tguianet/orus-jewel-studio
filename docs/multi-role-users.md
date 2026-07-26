# Usuários com múltiplas roles (admin + sacoleira)

## Schema

`public.user_roles` já usa **`UNIQUE (user_id, role)`** — um usuário pode ter `admin` e `sacoleira` ao mesmo tempo.

Fonte oficial de role: **somente `user_roles`**.

## Login

| Roles | Destino |
|-------|---------|
| só admin | `/admin` |
| só sacoleira | `/sacoleira` |
| ambas | `/escolher-area` |
| nenhuma | `/acesso-pendente` |

Preferência de área fica em `sessionStorage` (`amada-area-preference`) — **não concede permissão**.

## Área atual (UI)

`AreaContext`: `admin` | `reseller`

- Em `/sacoleira/*` → área reseller: RPCs/dados próprios via `current_reseller_id()` / `owns_reseller`
- Em `/admin/*` → área admin: visão global
- Troca de menu **sem logout**

## RPCs

- `admin_grant_reseller_role(...)` — adiciona sacoleira + reseller + loja; **não remove admin**
- `admin_revoke_reseller_role(...)` — remove role sacoleira e bloqueia loja; preserva admin e histórico financeiro

## Migration

`supabase/migrations/20260805120000_multi_role_users.sql` (não aplicada automaticamente)
