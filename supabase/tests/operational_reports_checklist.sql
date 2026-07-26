-- =============================================================================
-- Checklist manual — relatórios operacionais (após migration no Lovable Cloud)
-- =============================================================================

-- A. anon não acessa
-- SET ROLE anon;
-- SELECT public.admin_get_sales_summary(now()-interval '7 days', now()); -- falha

-- B/C. sacoleira vê apenas própria loja / A não vê B
-- autenticar sacoleira A: seller_get_sales_summary → só seller_store dela
-- tentar filtrar outra loja via admin RPC → falha (não admin)

-- D. admin vê global
-- SELECT public.admin_get_sales_summary(now()-interval '30 days', now());

-- E. pending não entra em faturamento
-- criar pedido status new → gross_revenue não sobe

-- F. paid entra
-- marcar paid → gross_revenue sobe

-- G. cancelled separado
-- cancelled_amount / cancelled_orders_count

-- H. refunded desconta na líquida
-- net = gross - refunded - returns

-- I. devolução parcial
-- product_return_items resolution=devolucao qty parcial → returns_amount parcial

-- J. troca não reduz receita
-- resolution=troca → financial_returned_amount não inclui

-- K. comissão cancelled não em available summary como available

-- L. comissão paid separada no summary.paid

-- M. saque pago fecha com wallet (cruzar paid_amount withdrawals vs wallet paid)

-- N. blocked_balance = pending+approved withdrawals

-- O. ticket médio com 0 pedidos = 0

-- P. comparison com previous 0 → null (frontend "—")

-- Q. timeseries preenche dias vazios com 0

-- R. timezone America/Sao_Paulo no bucket (pedido 23:30 UTC-3 não muda de dia indevido)

-- S. seller export sem cost_price

-- T. admin top products margem null se cost ausente

-- U. reserved_stock de pedidos new/confirmed; available_stock = products.stock

-- V. expired_at report separado

-- W. paginação total_count

-- X. sort_by inválido → exception

-- Y. período > 366 dias → exception

-- Z. admin_export_report rows sem payment_details/checkout_token

SELECT 'operational_reports_checklist_ready' AS status;
