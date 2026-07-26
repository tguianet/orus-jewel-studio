-- Checklist SQL pós-migration 20260726230000_commission_wallet_reversal.sql
-- Regras: pending/available → saldo 0 sem reversal available; paid → paid + reversal -amount available

-- A) pending +25
-- Após cancel_paid_order:
--   wallet commission status=cancelled
--   NENHUM wallet type=commission_reversal
--   reseller_wallet_summary.available = 0 (para esse crédito)

-- B) available +25
-- Igual A: crédito cancelled, sem reversal available, saldo 0

-- C) paid +25
--   wallet commission status continua paid, amount +25
--   wallet commission_reversal amount -25 status available
--   available = -25; paid = +25

-- D) commission available sem wallet
--   commission cancelled; sem débito

-- E) commission paid sem wallet
--   commission_reversal -amount available

-- F) segunda chamada
--   wallet_reversals_created = 0; already_reversed = true; sem duplicidade

-- G) amounts antigos 10/5/2 com settings 25/3/2
--   débitos (se paid) usam 10/5/2

-- Cancel↔refund cruzados continuam bloqueados pelas RPCs.
