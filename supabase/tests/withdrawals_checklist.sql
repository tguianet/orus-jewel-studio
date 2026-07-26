-- =============================================================================
-- Checklist manual / QA — saques (aplicar migration 20260731120000 antes)
-- Não executar automaticamente em CI. Use no SQL editor do Lovable Cloud.
-- Cenários A–T
-- =============================================================================

-- Pré-requisitos:
--   * migration 20260731120000_reseller_withdrawals.sql aplicada
--   * duas sacoleiras A/B com wallet available conhecido
--   * um admin autenticado (ou service_role para setup)

-- A. sacoleira cria saque com saldo suficiente
-- SELECT public.request_withdrawal(50, 'pix', '{"pix_key_type":"email","pix_key":"a@a.com","account_holder_name":"A","account_holder_document":"123"}'::jsonb, 'idem-a-1');
-- Esperado: ok=true, status=pending; wallet available reduzido; hold criado

-- B. valor abaixo do mínimo rejeitado
-- SELECT public.request_withdrawal(10, 'pix', '{...}'::jsonb, 'idem-b');
-- Esperado: EXCEPTION valor abaixo do mínimo

-- C. saldo insuficiente rejeitado
-- SELECT public.request_withdrawal(999999, 'pix', '{...}'::jsonb, 'idem-c');
-- Esperado: EXCEPTION Saldo insuficiente

-- D. duas solicitações concorrentes não ultrapassam saldo
-- Em duas sessões com available=100: request 80 e request 80
-- Esperado: uma ok, outra Saldo insuficiente (lock em resellers)

-- E. sacoleira A não vê saque de B
-- Autenticada como A: SELECT * FROM withdrawal_requests WHERE reseller_id = B;
-- Esperado: 0 linhas (RLS)

-- F. anon não acessa
-- SET ROLE anon; SELECT * FROM withdrawal_requests;
-- Esperado: falha ou 0 / sem grant

-- G. sacoleira não aprova
-- Como sacoleira: SELECT public.approve_withdrawal('<id>');
-- Esperado: EXCEPTION Somente administradores

-- H. admin aprova
-- SELECT public.approve_withdrawal('<pending_id>');
-- Esperado: status=approved; sem novo movimento de saldo

-- I. admin rejeita e saldo volta uma vez
-- SELECT public.reject_withdrawal('<id>', 'Dados incorretos');
-- SELECT public.reject_withdrawal('<id>', 'Dados incorretos'); -- idempotente
-- Esperado: uma withdrawal_release; available restaurado; segunda chamada idempotent

-- J. cancelamento devolve saldo uma vez
-- Como dona, status pending: SELECT public.cancel_withdrawal('<id>', 'desisti');
-- Esperado: cancelled + uma release

-- K. approved → paid funciona
-- SELECT public.mark_withdrawal_paid('<approved_id>', 'TED-1', 'https://example.com/r.pdf', 'pay-k-1');
-- Esperado: status=paid

-- L. pending → paid falha
-- SELECT public.mark_withdrawal_paid('<pending_id>', 'x', null, 'pay-l');
-- Esperado: EXCEPTION Transição inválida

-- M. paid não muda mais
-- SELECT public.approve_withdrawal('<paid_id>'); -- falha
-- SELECT public.reject_withdrawal('<paid_id>', 'x'); -- falha

-- N. pagamento duplicado não duplica débito
-- mark_withdrawal_paid duas vezes com keys diferentes no mesmo id após paid
-- Esperado: segunda retorna idempotent ou falha sem novo hold

-- O. idempotency key repetida retorna resultado consistente
-- request_withdrawal(..., 'same-key') duas vezes → mesmo withdrawal_id

-- P. auditoria registra cada transição
-- SELECT * FROM withdrawal_audit_log WHERE withdrawal_id = '...';
-- Esperado: request / approve / pay (ou reject/cancel)

-- Q. RLS bloqueia update direto
-- UPDATE withdrawal_requests SET status='paid' WHERE id='...';
-- Esperado: 0 rows affected (sem policy UPDATE)

-- R. dados bancários não vazam para outra sacoleira
-- get_withdrawal_details de saque alheio → Acesso negado

-- S. wallet hold/release/paid fecha corretamente
-- Contar wallet_transactions por withdrawal_id:
--   hold (-amount available), release (+amount) OU paid (0 paid) sem release

-- T. saldo nunca inconsistente
-- available (view) = sum(wallet available)
-- blocked = sum(withdrawal_requests pending+approved)
-- Após ciclos request→cancel / request→reject / request→approve→pay, disponível bate com comissões - holds abertos - holds pagos sem release

SELECT 'withdrawals_checklist loaded — execute cenários A–T manualmente' AS info;
