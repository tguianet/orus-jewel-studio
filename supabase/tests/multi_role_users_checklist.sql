-- =============================================================================
-- Checklist — usuários multi-role (admin + sacoleira)
-- Pré-requisito: 20260805120000_multi_role_users.sql aplicada no Lovable Cloud
-- =============================================================================

-- A. usuário admin recebe role sacoleira
-- SELECT public.admin_grant_reseller_role(:admin_user_id, 'Nome', 'Loja X', 'loja-x', null, 'teste');
-- Esperado: ok=true; has_sacoleira=true

-- B. mantém role admin
-- SELECT public.is_admin(:admin_user_id); -- true
-- SELECT public.has_role(:admin_user_id, 'admin'); -- true

-- C. não duplica role sacoleira
-- SELECT count(*) FROM public.user_roles WHERE user_id = :admin_user_id AND role = 'sacoleira';
-- SELECT public.admin_grant_reseller_role(...mesmo...);
-- Esperado: count=1; already_linked=true

-- D. reseller é criado/vinculado
-- SELECT id FROM public.resellers WHERE user_id = :admin_user_id;

-- E. loja é criada
-- SELECT store_slug FROM public.seller_stores WHERE owner_user_id = :admin_user_id;

-- F. slug duplicado falha
-- SELECT public.admin_grant_reseller_role(:outro_user, 'Y', 'Loja Y', 'loja-x', null, 'x');
-- Esperado: EXCEPTION 'Slug já em uso'

-- G. current_reseller_id funciona para admin+sacoleira
-- SET request.jwt.claim.sub = :admin_user_id;
-- SELECT public.current_reseller_id(); -- = reseller do próprio user

-- H. admin+sacoleira vê própria loja na área seller (RLS owns_reseller / owner_user_id)

-- I. não vê outra loja na área seller (owns_store / owns_reseller)

-- J. continua vendo painel admin (is_admin true)

-- K. remoção da role sacoleira não remove admin
-- SELECT public.admin_revoke_reseller_role(:admin_user_id, 'revogar seller');
-- SELECT public.is_admin(:admin_user_id); -- true
-- SELECT public.has_role(:admin_user_id, 'sacoleira'); -- false

-- L. histórico financeiro não é apagado
-- SELECT count(*) FROM public.wallet_transactions WHERE reseller_id = :reseller_id; -- inalterado
-- SELECT count(*) FROM public.commissions WHERE reseller_id = :reseller_id;
-- SELECT id FROM public.seller_stores WHERE owner_user_id = :admin_user_id; -- ainda existe (blocked)

-- M. sacoleira comum não concede roles
-- (auth sacoleira) SELECT public.admin_grant_reseller_role(...); -- Acesso negado

-- N. anon não acessa RPCs
SELECT has_function_privilege('anon', 'public.admin_grant_reseller_role(uuid,text,text,text,uuid,text)', 'EXECUTE') AS anon_grant;
SELECT has_function_privilege('anon', 'public.admin_revoke_reseller_role(uuid,text)', 'EXECUTE') AS anon_revoke;
-- Esperado: false

-- O. auditoria registra a alteração
-- SELECT action FROM public.admin_role_audit_log
--  WHERE target_user_id = :admin_user_id
--  ORDER BY created_at DESC LIMIT 5;
-- Esperado: reseller_granted / reseller_revoked

-- Schema: UNIQUE (user_id, role)
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.user_roles'::regclass AND contype = 'u';
-- Esperado: UNIQUE (user_id, role)
