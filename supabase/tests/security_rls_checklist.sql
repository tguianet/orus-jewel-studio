-- =============================================================================
-- Checklist de segurança RLS — executar no SQL Editor do Supabase (após migration)
-- Substitua os UUIDs de exemplo pelos IDs reais do seu ambiente.
-- =============================================================================

-- Pré-requisitos (ajuste):
--   :store_a   = loja da Sacoleira A (approved)
--   :store_b   = loja da Sacoleira B (approved)
--   :order_b   = pedido da loja B
--   :user_a    = auth.users.id da Sacoleira A

-- 1) Sacoleira A NÃO vê pedidos da B
--    (autenticar como A no client e rodar, ou usar set_config com JWT de teste)
-- SELECT * FROM orders WHERE seller_store_id = '<store_b>';
-- Esperado: 0 linhas

-- 2) Sacoleira A NÃO edita loja da B
-- UPDATE seller_stores SET store_name = 'hack' WHERE id = '<store_b>';
-- Esperado: 0 rows / erro RLS

-- 3) Sacoleira NÃO insere role admin
-- INSERT INTO user_roles (user_id, role) VALUES (auth.uid(), 'admin');
-- Esperado: erro (policy/trigger)

-- 4) Anon NÃO lista pedidos
-- SET ROLE anon;
-- SELECT * FROM orders;
-- Esperado: 0 linhas / permission denied by RLS

-- 5) Anon NÃO altera status
-- UPDATE orders SET status = 'paid' WHERE id = '<order_id>';
-- Esperado: falha

-- 6) Anon NÃO altera total
-- UPDATE orders SET total = 0.01 WHERE id = '<order_id>';
-- Esperado: falha

-- 7) Sacoleira A NÃO vê "clientes" da B (via pedidos)
-- SELECT customer_name, customer_phone FROM orders WHERE seller_store_id = '<store_b>';
-- Esperado: 0 linhas

-- 8) Admin vê todas as lojas
-- SELECT count(*) FROM seller_stores;  -- autenticado como admin
-- Esperado: > 0 todas

-- 9) Admin vê todos os pedidos
-- SELECT count(*) FROM orders;

-- 10) Público vê produtos ativos da loja aprovada
-- SELECT sp.*, p.name FROM store_products sp
-- JOIN products p ON p.id = sp.product_id
-- WHERE sp.seller_store_id = '<store_a>' AND sp.active AND p.status = 'active';

-- 11) mark_order_paid sem admin falha
-- SELECT mark_order_paid('<order_id>'); -- como sacoleira/anon
-- Esperado: exception

-- 12) Signup com role=admin no metadata NÃO cria admin
-- (testar via Auth API) depois:
-- SELECT role FROM user_roles WHERE user_id = '<novo_user>';
-- Esperado: somente 'sacoleira'

-- Helpers
SELECT public.is_admin();
SELECT public.current_reseller_id();
SELECT public.current_store_id();
