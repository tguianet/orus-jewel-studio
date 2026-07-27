-- Checklist pós-migration 20260807120000_harden_legal_crypto_grants.sql
-- Somente leitura.

SELECT
  'anon._legal_pepper' AS check_id,
  has_function_privilege('anon', 'public._legal_pepper()', 'execute') AS can_execute
UNION ALL
SELECT 'anon._legal_hash',
  has_function_privilege('anon', 'public._legal_hash(text)', 'execute')
UNION ALL
SELECT 'authenticated._legal_pepper',
  has_function_privilege('authenticated', 'public._legal_pepper()', 'execute')
UNION ALL
SELECT 'authenticated._legal_hash',
  has_function_privilege('authenticated', 'public._legal_hash(text)', 'execute')
UNION ALL
SELECT 'service_role._legal_pepper',
  has_function_privilege('service_role', 'public._legal_pepper()', 'execute')
UNION ALL
SELECT 'service_role._legal_hash',
  has_function_privilege('service_role', 'public._legal_hash(text)', 'execute');

SELECT c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'legal_privacy_config';

SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'legal_privacy_config';
