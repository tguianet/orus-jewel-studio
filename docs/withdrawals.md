# Saques das sacoleiras — Amada Amante

## Fluxo completo

1. Sacoleira consulta `get_my_withdrawal_summary` (disponível, bloqueado, mínimo).
2. Solicita via `request_withdrawal` com método PIX ou transferência + `idempotency_key`.
3. O banco valida mínimo, saldo e dados; cria `withdrawal_requests` (`pending`) e lança `withdrawal_hold` (amount negativo, status `available`) na carteira oficial.
4. Admin lista em `/admin/saques`, aprova (`approve_withdrawal` — sem novo movimento de saldo) ou rejeita (`reject_withdrawal` — libera hold uma vez).
5. Sacoleira pode cancelar só em `pending` (`cancel_withdrawal` — libera hold uma vez).
6. Admin marca pago (`mark_withdrawal_paid`) somente a partir de `approved`, com chave de idempotência, referência e URL de comprovante.

## Estados e transições

| De | Para |
|---|---|
| pending | approved, rejected, cancelled |
| approved | paid, rejected (se ainda não pago) |
| rejected / paid / cancelled | finais |

Proibido: `pending → paid`, `paid → *`, `rejected → approved`, `cancelled → approved`.

## Impacto na carteira

Fonte oficial: `wallet_transactions` + view `reseller_wallet_summary`.

| Evento | Tipo ledger | Efeito |
|---|---|---|
| Solicitar | `withdrawal_hold` (−valor, `available`) | reduz `available`; `blocked` sobe via soma dos saques `pending`/`approved` |
| Cancelar / Rejeitar | `withdrawal_release` (+valor, `available`) | devolve disponível; flag `balance_released` impede duplicidade |
| Pagar | `withdrawal_paid` (0, `paid`) + status paid | hold permanece consumindo o disponível; bloqueio do pedido zera |

Não há carteira paralela. Comissões/estornos existentes não foram alterados.

## Idempotência

- `request_idempotency_key` única por sacoleira.
- `payment_idempotency_key` única globalmente.
- Rejeitar/cancelar/pagar repetidos retornam payload idempotente sem segundo crédito/débito.
- Unique `(withdrawal_id, type)` em holds/releases/paid.

## Segurança

- RLS: SELECT próprio ou admin; sem UPDATE/INSERT direto de status.
- Operações só via RPC `SECURITY DEFINER` + `search_path = public`.
- Lock `FOR UPDATE` em `resellers` nas mutações financeiras.
- Anon sem acesso.
- Dados bancários mascarados na UI; revelação admin explícita.
- `receipt_url` só `http(s)`.

## Operação admin

Tela `/admin/saques`: filtros, cards, detalhes, auditoria, aprovar / rejeitar (motivo) / pagar (confirmação final).

## Cancelamento / rejeição / pagamento

- Cancelamento: dona + `pending` + release único.
- Rejeição: admin + motivo + release único.
- Pagamento: admin + `approved` + chave idempotente + comprovante/referência opcionais.

## Checklist de aplicação no Lovable Cloud

1. Revisar `supabase/migrations/20260731120000_reseller_withdrawals.sql`.
2. Aplicar a migration no Cloud (não usar `supabase db push` externo se o fluxo do projeto for o painel Lovable).
3. Rodar `supabase/tests/withdrawals_checklist.sql` (cenários A–T) com usuários de teste.
4. Publicar frontend com rotas `/sacoleira/saques` e `/admin/saques`.
5. Validar mínimo em `withdrawal_settings` (padrão R$ 50).
6. Smoke test: request → cancel; request → approve → pay; request → reject.
7. Confirmar que carteira em `/sacoleira/clientes` continua coerente.

## Arquivos principais

- Migration: `supabase/migrations/20260731120000_reseller_withdrawals.sql`
- Lib: `src/lib/withdrawals.ts`, `withdrawalMasking.ts`, `withdrawalStatus.ts`
- Telas: `SellerWithdrawals.tsx`, `AdminWithdrawals.tsx`
- Testes: `src/test/withdrawals*.test.ts`, `supabase/tests/withdrawals_checklist.sql`
