-- Checklist: hardening dos grants de cripto LGPD (migration 20260807120000)
-- Somente leitura. Não altera dados.

-- 1-7. Grants nas funções internas
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS args,
       has_function_privilege('anon',          p.oid, 'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute,
       has_function_privilege('service_role',  p.oid, 'EXECUTE') AS service_role_execute,
       p.proacl::text AS acl
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('_legal_pepper', '_legal_hash');

-- 8-9. Acesso à tabela de configuração de privacidade
SELECT c.relname,
       has_table_privilege('anon',          c.oid, 'SELECT') AS anon_select,
       has_table_privilege('authenticated', c.oid, 'SELECT') AS authenticated_select,
       has_table_privilege('service_role',  c.oid, 'SELECT') AS service_role_select,
       c.relacl::text AS acl
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'legal_privacy_config';

-- 10-11. Nenhuma policy criada + RLS ativa
SELECT c.relrowsecurity AS rls_enabled,
       (SELECT count(*) FROM pg_policies pol
         WHERE pol.schemaname = 'public' AND pol.tablename = 'legal_privacy_config') AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'legal_privacy_config';

-- 12-13. Checkout e consentimentos intactos
SELECT (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'create_public_order') AS create_public_order_overloads,
       (SELECT count(*) FROM public.legal_consents) AS consents_total,
       (SELECT count(*) FROM public.orders) AS orders_total;

-- 14. Acesso do usuário admin + sacoleira preservado
SELECT user_id, role FROM public.user_roles ORDER BY user_id, role;
