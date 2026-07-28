-- Checklist manual (Lovable Cloud) — NÃO aplicar via CLI.
-- Após aplicar 20260810120000_global_store_banners.sql:

-- 1) Admin cria campanha (RPC)
-- SELECT public.admin_upsert_global_store_banner('{
--   "title":"Campanha teste",
--   "image_url":"https://example.com/banner.jpg",
--   "is_active":true,
--   "position":0
-- }'::jsonb);

-- 2) Sacoleira NÃO cria / NÃO edita / NÃO exclui (deve falhar com "Apenas administradores")
-- 3) Anon NÃO escreve (sem GRANT INSERT/UPDATE/DELETE)
-- 4) SELECT público só retorna is_active + período válido
-- 5) Audit log: create/update/pause/activate/delete_global_store_banner
-- 6) Loja approved mostra; pending/blocked não (frontend + status)
-- 7) seller_stores.theme intacto

SELECT 'global_store_banners checklist — executar manualmente no Cloud' AS note;
