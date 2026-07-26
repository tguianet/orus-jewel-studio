-- =============================================================================
-- Checklist manual — operational_error_logs (após aplicar migration no Lovable Cloud)
-- Não executa automaticamente; use como roteiro de validação.
-- =============================================================================

-- A. anon não lista logs
-- SET ROLE anon;
-- SELECT public.admin_list_operational_errors(); -- deve falhar

-- B. sacoleira não lista logs
-- autenticar como sacoleira e chamar admin_list_operational_errors() — deve falhar

-- C. admin lista logs
-- autenticar como admin:
-- SELECT public.admin_list_operational_errors(NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 20);

-- D. contexto sensível é removido
-- SELECT public._sanitize_op_context('{"password":"x","pix_key":"y","order_id":"11111111-1111-1111-1111-111111111111"}'::jsonb);
-- esperado: sem password/pix_key; com order_id

-- E. payload grande é truncado (strings > 200)
-- SELECT public._sanitize_op_context(jsonb_build_object('operation', repeat('a', 500)));

-- F. severity inválida falha
-- SELECT public.report_operational_error('op_20260802_test0001','X','checkout','invalid', NULL, NULL, NULL, NULL, '{}'::jsonb);

-- G. código vazio falha
-- SELECT public.report_operational_error('op_20260802_test0001','','checkout','error', NULL, NULL, NULL, NULL, '{}'::jsonb);

-- H. rate limit impede spam
-- Em loop >20 report_operational_error no mesmo minuto — deve falhar

-- I. correlation_id é indexado
SELECT indexname
FROM pg_indexes
WHERE tablename = 'operational_error_logs'
  AND indexname = 'idx_op_errors_correlation';

-- J. admin resolve erro
-- SELECT public.admin_resolve_operational_error('<uuid>', 'investigado');

-- K. resolução não apaga histórico
-- SELECT id, resolved_at, resolution_notes FROM operational_error_logs WHERE id = '<uuid>';
-- registro deve permanecer

-- L. RLS bloqueia insert direto
-- INSERT INTO public.operational_error_logs (correlation_id, error_code, category, severity)
-- VALUES ('op_20260802_test0002','X','checkout','error'); -- deve falhar para anon/authenticated sem policy de insert

-- M. report RPC aceita erro permitido (anon/checkout)
-- SELECT public.report_operational_error(
--   'op_20260802_test0003','CHECKOUT_FAILED','checkout','error','create_public_order','/loja/x/checkout',NULL,NULL,'{"order_id":"11111111-1111-1111-1111-111111111111"}'::jsonb
-- );

-- N. hashes não expõem valor original
-- user_agent_hash deve ser hex sha256 ou null — nunca raw UA completo

-- O. retenção futura
-- Documentar job futuro: DELETE WHERE occurred_at < now() - interval '90 days' AND resolved_at IS NOT NULL;
-- (não criar Job nesta fase)
