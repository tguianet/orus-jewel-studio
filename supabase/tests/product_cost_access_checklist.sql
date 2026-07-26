-- Checklist: restrição de cost_price (aplicar após migration 20260730120000)
-- Executar no Lovable Cloud SQL editor com roles apropriados.
-- Não automatizado no CI local.

-- A. anon SELECT cost_price → negado
-- SET ROLE anon;  -- ou JWT anon
-- SELECT cost_price FROM public.products LIMIT 1;
-- Esperado: permission denied / column privilege

-- B. anon SELECT wholesale_price → negado
-- SELECT wholesale_price FROM public.products LIMIT 1;
-- Esperado: permission denied

-- C. sacoleira SELECT cost_price → negado
-- (JWT authenticated sem is_admin)
-- SELECT cost_price FROM public.products LIMIT 1;
-- Esperado: permission denied

-- D. sacoleira SELECT wholesale_price → permitido
-- SELECT id, wholesale_price, suggested_price FROM public.products
-- WHERE status = 'active' AND seller_store_id IS NULL LIMIT 5;
-- Esperado: linhas OK

-- E. admin admin_product_costs → permitido
-- SELECT * FROM public.admin_product_costs() LIMIT 5;
-- Esperado: id, cost_price, wholesale_price

-- F. sacoleira admin_product_costs → negado
-- SELECT * FROM public.admin_product_costs();
-- Esperado: exception 'Somente administradores...'

-- G. loja pública (nested select sem cost/wholesale)
-- Como anon, via store_products + products(suggested_price,...):
-- SELECT sp.resale_price, p.suggested_price
-- FROM store_products sp
-- JOIN products p ON p.id = sp.product_id
-- LIMIT 1;
-- Não selecionar cost_price/wholesale_price.

-- H. catálogo sacoleira: wholesale ok, cost não
-- SELECT id, wholesale_price FROM products WHERE ...;
-- SELECT cost_price FROM products ... → falha

-- I. cadastro/edição admin
-- INSERT/UPDATE products com cost_price no payload → OK
-- RETURNING sem cost_price → OK; custos via admin_product_costs()

-- J. checkout create_public_order
-- Retorno sem cost; unit_price server-side; payload com cost_price rejeitado

-- K. pedidos de outra sacoleira
-- SELECT * FROM orders WHERE seller_store_id = '<loja_alheia>';
-- Esperado: 0 linhas (RLS can_access_store)

-- L. sem select('*') em products nos fluxos públicos/sacoleira (código FE)
-- Verificar cloudStore RESELLER_PRODUCT_SELECT / PUBLIC_PRODUCT_NESTED_SELECT
