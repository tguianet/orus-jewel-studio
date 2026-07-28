-- =============================================================================
-- Checklist manual (Lovable Cloud) — MLM por tipo de joia + comissão por item
-- NÃO executar via CLI; colar no SQL Editor do Cloud após aplicar a migration.
-- =============================================================================

-- 1) Schema
-- SELECT enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'jewelry_material';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'jewelry_material';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'commissions' AND column_name IN ('jewelry_material','product_id','base_amount','percentage_applied','order_item_id');
-- SELECT * FROM mlm_commission_rates ORDER BY jewelry_material, level;  -- 9 linhas

-- 2) Produtos pendentes
-- SELECT public.admin_count_products_pending_jewelry_material();
-- SELECT id, code, name, status, jewelry_material FROM products WHERE jewelry_material IS NULL AND seller_store_id IS NULL LIMIT 50;

-- 3) Bloqueio: ativar sem material deve falhar
-- UPDATE products SET status = 'active', jewelry_material = NULL WHERE id = '<uuid>';  -- EXPECT EXCEPTION

-- 4) Classificar e vender
-- UPDATE products SET jewelry_material = 'gold' WHERE id = '<uuid>';
-- (criar pedido paid com 2 itens: gold + plated)
-- SELECT jewelry_material, total FROM order_items WHERE order_id = '<order>';
-- SELECT order_item_id, level, jewelry_material, base_amount, rate, amount, percentage_applied
--   FROM commissions WHERE order_id = '<order>' ORDER BY order_item_id, level;
-- Esperado: 1 linha por (order_item_id, reseller_id, level); base = order_items.total

-- 5) Idempotência
-- SELECT public.create_mlm_commissions_for_order('<order>');
-- SELECT public.create_mlm_commissions_for_order('<order>');  -- sem duplicar
-- SELECT COUNT(*) FROM commissions WHERE order_id = '<order>';
-- SELECT COUNT(*) FROM wallet_transactions WHERE commission_id IN (SELECT id FROM commissions WHERE order_id = '<order>');

-- 6) Estorno (todas as linhas do pedido)
-- SELECT * FROM public.reverse_mlm_commissions_for_order('<order>', 'test_refund');
-- SELECT * FROM public.reverse_mlm_commissions_for_order('<order>', 'test_refund');  -- already_reversed

-- 7) Histórico preservado
-- SELECT COUNT(*) FILTER (WHERE order_item_id IS NULL) AS legacy,
--        COUNT(*) FILTER (WHERE order_item_id IS NOT NULL) AS per_item
-- FROM commissions;

-- 8) Relatório
-- SELECT public.admin_get_commission_report(now() - interval '30 days', now(), NULL, NULL, NULL, 'gold', 1, 25);

-- 9) Matriz admin
-- SELECT public.get_mlm_commission_rates();
-- SELECT public.update_mlm_commission_rates('[
--   {"jewelry_material":"gold","level":1,"percentage":0.25},
--   {"jewelry_material":"gold","level":2,"percentage":0.03},
--   {"jewelry_material":"gold","level":3,"percentage":0.02},
--   {"jewelry_material":"silver","level":1,"percentage":0.20},
--   {"jewelry_material":"silver","level":2,"percentage":0.03},
--   {"jewelry_material":"silver","level":3,"percentage":0.02},
--   {"jewelry_material":"plated","level":1,"percentage":0.10},
--   {"jewelry_material":"plated","level":2,"percentage":0.02},
--   {"jewelry_material":"plated","level":3,"percentage":0.01}
-- ]'::jsonb);
