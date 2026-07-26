# Gerenciamento de administradores

## Fonte oficial de role

- Tabela: `public.user_roles` (`role public.app_role`: `admin` | `sacoleira`)
- Helpers: `has_role()`, `is_admin()`
- Frontend lê roles via `AuthContext` → `user_roles` (somente SELECT)
- **Não** usar `localStorage`, metadata de `auth.users` nem `profiles` como fonte de verdade de role

## Fluxo seguro

1. Admin autenticado chama RPCs `SECURITY DEFINER` com `SET search_path = public`
2. Cada RPC valida `is_admin(auth.uid())` no corpo
3. Escrita em `user_roles` só nas RPCs (INSERT/UPDATE/DELETE revogados para `authenticated`)
4. Auditoria em `admin_role_audit_log` (SELECT admin; sem escrita direta)

## RPCs

| Função | Uso |
|--------|-----|
| `admin_list_administrators()` | Lista admins |
| `admin_search_users(query, limit)` | Busca por e-mail/nome (mín. 3 chars) |
| `admin_grant_role(user_id, reason?)` | Promove (idempotente) |
| `admin_revoke_role(user_id, reason)` | Remove (protege último admin) |
| `admin_get_role_audit(page, page_size)` | Histórico |

## UI

- Rota: `/admin/configuracoes/administradores`
- Menu: Configurações → Administradores
- Após grant/revoke: `refreshUserRole()`; self-revoke redireciona para `/login-admin`

## Checklist SQL

Ver `supabase/tests/admin_management_checklist.sql`.
