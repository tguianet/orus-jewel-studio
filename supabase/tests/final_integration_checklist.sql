-- =============================================================================
-- Checklist consolidado — implantação Amada Amante no Lovable Cloud
-- Executar por etapa após cada bloco de migrations. Não automatizar apply.
-- =============================================================================

-- 0) Pré-check
-- SELECT extname FROM pg_extension WHERE extname = 'pgcrypto';
-- SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace
--   AND proname IN ('is_admin','current_reseller_id','create_public_order');

-- 1) Após 20260729120000 (expiração)
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name='orders' AND column_name IN ('expires_at','expired_at','expiration_reason');
-- SELECT public.expire_abandoned_orders(1);
-- Pedido paid NÃO deve ser selecionado para expiração.
-- Pedido já cancelled/expired: segunda chamada não restaura de novo (idempotente).

-- 2) Após 20260730120000 (cost_price)
-- SET ROLE authenticated; -- como sacoleira
-- SELECT cost_price FROM products LIMIT 1; -- deve falhar / coluna revogada
-- SELECT * FROM public.admin_product_costs(); -- só admin

-- 3) Após 20260731120000 (saques)
-- SELECT to_regclass('public.withdrawal_requests');
-- SELECT * FROM public.reseller_wallet_summary LIMIT 1; -- inclui blocked
-- SELECT public.get_my_withdrawal_summary(); -- sacoleira
-- SELECT public.admin_list_withdrawals(); -- admin; sacoleira falha

-- 4) Após 20260801120000 (LGPD)
-- SELECT COUNT(*) FROM legal_documents WHERE is_current;
-- Overloads create_public_order:
-- SELECT pg_get_function_identity_arguments(oid)
-- FROM pg_proc WHERE proname='create_public_order';
-- Esperado: apenas (uuid, text, text, text, text, jsonb, uuid, jsonb)
-- Checkout sem p_consents falha; com consents cria pedido + consent + stock reserve atômicos.

-- 5) Após 20260802120000 (logs)
-- SELECT to_regclass('public.operational_error_logs');
-- anon: SELECT public.admin_list_operational_errors(); -- falha
-- SELECT public.report_operational_error('op_test_12345678','TEST','checkout','error',NULL,NULL,NULL,NULL,'{}'::jsonb);

-- 6) Após 20260803120000 (relatórios)
-- SELECT public.admin_get_sales_summary(now()-interval '7 days', now());
-- SELECT public.seller_get_sales_summary(now()-interval '7 days', now()); -- só própria loja
-- Período > 366 dias falha.
-- sort_by inválido falha.
-- units_released usa cancel_restore (não expire_restore).
-- commission summary: cancelled > 0 e reversed = 0 (alias).

-- 7) Isolamento
-- Sacoleira A não lista saques/relatórios/consentimentos de B.
-- Anon sem SELECT em operational_error_logs / withdrawal_requests / legal_consents.

-- 8) Grants críticos
-- SELECT has_function_privilege('anon','public.create_public_order(uuid,text,text,text,text,jsonb,uuid,jsonb)','execute');
-- SELECT has_function_privilege('anon','public.admin_get_sales_summary(timestamptz,timestamptz,uuid,uuid)','execute'); -- false

SELECT 'final_integration_checklist_ready' AS status;
