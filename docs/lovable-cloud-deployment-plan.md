# Plano de implantação — Lovable Cloud (Amada Amante)

**Não executar `supabase db push` deste workspace.** Aplicar migrations pelo fluxo Lovable Cloud.

## 1. Antes de aplicar

1. Export/backup do projeto no Lovable Cloud (snapshot).
2. Anotar a última migration já aplicada no Cloud.
3. Confirmar que o frontend **ainda não publicado** depende das RPCs novas (ou publicar só após SQL).
4. Ter acesso admin de teste + sacoleira de teste.

## 2. Ordem exata das migrations pendentes

Aplicar **nesta ordem** (já cronológica no repo):

| # | Arquivo | Bloco | Validação imediata |
|---|---------|-------|--------------------|
| 1 | `20260729120000_order_reservation_expiry.sql` | Expiração | Colunas `expires_at`; `expire_abandoned_orders(1)` |
| 2 | `20260730120000_restrict_product_cost_price.sql` | Custo | Sacoleira sem `cost_price`; admin `admin_product_costs` |
| 3 | `20260731120000_reseller_withdrawals.sql` | Saques | Tabelas + `reseller_wallet_summary.blocked` |
| 4 | `20260801120000_legal_consents.sql` | LGPD + checkout | 1 overload `create_public_order` com `p_consents`; checkout real |
| 5 | `20260802120000_operational_error_logs.sql` | Observabilidade | `report_operational_error` |
| 6 | `20260803120000_operational_reports.sql` | Relatórios | `admin_get_sales_summary` |

Dependências anteriores já devem existir: stock, cancel restore, physical returns, commissions, wallet, `admin_product_costs` base, checkout token.

## 3. Quais podem ir juntas

- **Bloco A (estoque/expiração/custo):** 1+2 — baixo risco se checkout já estável.
- **Bloco B (financeiro sacoleira):** 3 — validar wallet/saques antes de seguir.
- **Bloco C (checkout legal):** 4 — **validação obrigatória imediata** (checkout quebra sem consents).
- **Bloco D (ops):** 5+6 — podem ir juntos após B/C.

Não pular a 4 se o frontend já envia `p_consents`.

## 4. Job (depois do SQL, não nesta fase de código)

Após migration 1:

- Agendar `expire_abandoned_orders(50)` a cada **5 minutos** (service role / Lovable Job).
- Confirmar idempotência com 2 runs seguidos.

## 5. Checklists SQL

Usar `supabase/tests/final_integration_checklist.sql` por etapa.

## 6. Smoke tests (pós cada bloco)

1. Login admin / sacoleira / redirect seguro.
2. Catálogo público sem custo.
3. Checkout com termos → pedido com `expires_at`.
4. Checkout sem termos → erro amigável.
5. Marcar pago → comissões; pedido não expira.
6. Cancelar unpaid → restore uma vez.
7. Saque request → hold; cancel → release.
8. Admin erros / relatórios carregam.
9. Sacoleira relatórios sem custo.

## 7. Publicação do frontend

**Somente após** migrations 1–6 aplicadas e smoke OK.

Ordem: SQL → Job expiração → publish frontend.

## 8. Rollback

| Falha em | Ação |
|----------|------|
| Migration 1–2 | Restaurar snapshot; não publicar FE |
| Migration 3 | Snapshot; saques/telas mostram erro amigável se FE já publicado |
| Migration 4 | **Crítico** — restaurar snapshot imediatamente; checkout pode falhar |
| Migration 5–6 | FE continua; reporter/relatórios degradam com mensagem |

Não há “down migration” automática — preferir restore do snapshot Cloud.

## 9. Interromper implantação se

- Checkout público falhar após LGPD.
- Double restock / saldo wallet inconsistente.
- Sacoleira enxergar `cost_price`.
- Overload ambíguo de `create_public_order` (mais de uma assinatura).
- `expire_abandoned_orders` cancelar pedidos `paid`.

## 10. Pós-publicação

- Monitorar `/admin/erros-operacionais` e saques.
- Validar Job de expiração nas primeiras horas.
- Conferir 1 pedido real ponta a ponta (checkout → pago → comissão).
