-- =============================================================================
-- Checklist manual — gerenciamento de administradores
-- Pré-requisito: aplicar 20260804120000_admin_management.sql no Lovable Cloud
-- Substitua :admin_jwt, :sacoleira_jwt, :user_jwt, :target_user_id
-- =============================================================================

-- A. anon não lista admins
-- SET request.jwt.claim.sub = ''; -- sem auth
-- SELECT public.admin_list_administrators();
-- Esperado: EXCEPTION 'Acesso negado'

-- B. sacoleira não lista admins
-- (autenticar como sacoleira)
-- SELECT public.admin_list_administrators();
-- Esperado: EXCEPTION 'Acesso negado'

-- C. admin lista admins
-- SELECT public.admin_list_administrators();
-- Esperado: jsonb com items[].user_id, nome, email, status, created_at, granted_at, granted_by

-- D. admin busca usuário
-- SELECT public.admin_search_users('tes', 20);
-- Esperado: items com user_id/nome/email/is_admin (sem senha/tokens)

-- E. busca curta é rejeitada
-- SELECT public.admin_search_users('ab', 20);
-- Esperado: EXCEPTION 'Consulta muito curta'

-- F. admin promove usuário
-- SELECT public.admin_grant_role(:target_user_id, 'teste checklist');
-- Esperado: ok=true, already_admin=false
-- SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = :target_user_id AND role = 'admin');

-- G. promoção duplicada não duplica auditoria
-- SELECT count(*) FROM public.admin_role_audit_log
--   WHERE target_user_id = :target_user_id AND action = 'admin_granted';
-- SELECT public.admin_grant_role(:target_user_id, 'duplicado');
-- SELECT count(*) FROM public.admin_role_audit_log
--   WHERE target_user_id = :target_user_id AND action = 'admin_granted';
-- Esperado: contagem inalterada; already_admin=true

-- H. sacoleira não promove
-- (auth sacoleira) SELECT public.admin_grant_role(:target_user_id, 'x');
-- Esperado: EXCEPTION 'Acesso negado'

-- I. usuário comum não promove
-- (auth sem role admin) SELECT public.admin_grant_role(:target_user_id, 'x');
-- Esperado: EXCEPTION 'Acesso negado'

-- J. admin remove outro admin (com >=2 admins)
-- SELECT public.admin_revoke_role(:target_user_id, 'revogação checklist');
-- Esperado: ok=true; role admin removida de user_roles

-- K. não remove último admin
-- (deixar apenas 1 admin) SELECT public.admin_revoke_role(:last_admin_id, 'tentativa');
-- Esperado: EXCEPTION 'Não é possível remover o último admin'

-- L. auditoria registra grant
-- SELECT * FROM public.admin_role_audit_log WHERE action = 'admin_granted' ORDER BY created_at DESC LIMIT 5;
-- Esperado: performed_by = admin ator; target_user_id correto

-- M. auditoria registra revoke
-- SELECT * FROM public.admin_role_audit_log WHERE action = 'admin_revoked' ORDER BY created_at DESC LIMIT 5;
-- Esperado: reason preenchido; performed_by = admin ator

-- N. frontend não altera role direto
-- (como authenticated admin via PostgREST)
-- INSERT INTO public.user_roles (user_id, role) VALUES (:target_user_id, 'admin');
-- Esperado: permission denied / RLS bloqueia INSERT

-- O. RPCs não têm EXECUTE para PUBLIC
SELECT p.proname, has_function_privilege('public', p.oid, 'EXECUTE') AS public_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'admin_list_administrators',
    'admin_search_users',
    'admin_grant_role',
    'admin_revoke_role',
    'admin_get_role_audit'
  );
-- Esperado: public_execute = false

-- P. search_path está fixo
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args, p.proconfig
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'admin_list_administrators',
    'admin_search_users',
    'admin_grant_role',
    'admin_revoke_role',
    'admin_get_role_audit',
    '_admin_active_count'
  );
-- Esperado: proconfig contém search_path=public

-- Q. usuário promovido entra em /admin após refresh
-- Manual UI: promover → logout/login ou refreshUserRole → ProtectedRoute admin libera.

-- R. usuário removido perde acesso
-- Manual UI: revogar → refreshUserRole → /admin redireciona para login/acesso negado.

-- S. dados sensíveis não são retornados
-- SELECT public.admin_list_administrators();
-- SELECT public.admin_search_users('email@dominio.com', 20);
-- Esperado: sem password, raw_user_meta_data, refresh_token, payment_details, etc.

-- RLS audit log
SELECT polname, polcmd, polroles::regrole[]
FROM pg_policy
WHERE polrelid = 'public.admin_role_audit_log'::regclass;
-- Esperado: apenas SELECT para authenticated + is_admin()
