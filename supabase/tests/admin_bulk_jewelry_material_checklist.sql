-- Checklist manual Lovable Cloud — classificação em massa jewelry_material
-- Aplicar antes: 20260809120000_mlm_jewelry_material_commissions.sql
--               20260809130000_admin_bulk_set_jewelry_material.sql

-- 1) Resumo
-- SELECT public.admin_get_jewelry_material_summary();

-- 2) Não admin deve falhar (sessão sacoleira)
-- SELECT public.admin_bulk_set_jewelry_material(ARRAY['...']::uuid[], 'gold');

-- 3) Material inválido
-- SELECT public.admin_bulk_set_jewelry_material(ARRAY['...']::uuid[], 'bronze');
-- EXPECT: exception

-- 4) Lote > 100
-- SELECT public.admin_bulk_set_jewelry_material(
--   (SELECT array_agg(id) FROM (SELECT id FROM products WHERE seller_store_id IS NULL LIMIT 101) t),
--   'gold'
-- );
-- EXPECT: exception

-- 5) Classificar amostra e verificar que SÓ jewelry_material mudou
-- WITH sample AS (
--   SELECT id, code, name, status, stock, wholesale_price, suggested_price, category_name, jewelry_material
--   FROM products WHERE seller_store_id IS NULL AND jewelry_material IS NULL LIMIT 3
-- )
-- SELECT * FROM sample;
-- SELECT public.admin_bulk_set_jewelry_material(
--   (SELECT array_agg(id) FROM products WHERE seller_store_id IS NULL AND jewelry_material IS NULL LIMIT 3),
--   'silver'
-- );
-- -- Releia os mesmos IDs: status/stock/preços iguais; jewelry_material = silver

-- 6) Audit
-- SELECT action, entity_type, metadata->>'updated_by', metadata->>'updated', new_data
-- FROM audit_logs
-- WHERE action = 'admin_bulk_set_jewelry_material'
-- ORDER BY created_at DESC LIMIT 5;

-- 7) Contador pendente
-- SELECT public.admin_count_products_pending_jewelry_material();
