# Dicionário de dados — Relatórios Amada Amante

| Indicador | Definição | Fórmula | Fonte | Inclui | Exclui | Unidade | Arredondamento | Público |
|-----------|-----------|---------|-------|--------|--------|---------|----------------|---------|
| gross_revenue | Faturamento bruto confirmado | `SUM(total)` | orders | paid, separated, shipped, delivered | new, confirmed, cancelled, refunded | BRL | numeric DB / 2 casas UI | admin, seller (própria) |
| net_revenue | Receita líquida operacional | gross − refunded − returns_fin | orders + return_items | — | comissão, frete, impostos | BRL | 2 casas | admin, seller |
| refunded_amount | Valor reembolsado | `SUM(total)` status refunded | orders | refunded | — | BRL | 2 | admin, seller |
| cancelled_amount | Valor cancelado | `SUM(total)` cancelled | orders | cancelled | — | BRL | 2 | admin |
| returns_amount | Devolução financeira | `SUM(qty*unit_price_original)` resolution=devolucao | product_return_items | devolucao | troca | BRL | 2 | admin, seller |
| paid_orders_count | Pedidos venda confirmada | COUNT | orders | paid…delivered | pending | un | inteiro | admin, seller |
| pending_orders_count | Pedidos não pagos | COUNT | orders | new, confirmed | — | un | inteiro | admin, seller |
| average_ticket | Ticket médio | net_revenue / paid_orders_count | derivado | — | div/0 → 0 | BRL | 2 | admin, seller |
| commission_generated | Comissão gerada | SUM(amount) status∈pending,available,paid | commissions | créditos válidos | cancelled | BRL | 2 | admin, seller |
| commission_available | Disponível carteira | reseller_wallet_summary.available | view | — | — | BRL | 2 | admin, seller própria |
| commission_paid | Paga | wallet summary.paid | view | — | — | BRL | 2 | admin, seller |
| commission_cancelled | Estornada/cancelada | SUM cancelled | commissions | cancelled | — | BRL | 2 | admin, seller |
| blocked_balance | Bloqueado saques | SUM pending+approved | withdrawal_requests | pending, approved | paid, rejected, cancelled | BRL | 2 | admin |
| estimated_margin | Margem bruta estimada | net − qty*cost_price | order_items+products | cost informado | cost null | BRL | 2 | **admin only** |
| immobilized_value | Estoque × custo | stock*cost_price | products | cost informado | cost null | BRL | 2 | **admin only** |
| reserved_stock | Em pedidos pendentes ativos | SUM qty new/confirmed não expirados | order_items+orders | — | — | un | inteiro | admin |
| available_stock | Estoque atual | products.stock | products | — | — | un | inteiro | admin |
| expired_count | Pedidos expirados | COUNT expired_at no período | orders | expired_at not null | — | un | inteiro | admin |
| abandonment_rate_pct | Taxa abandono | expired / checkout_base | orders origin loja_online | base>0 | base 0 → null | % | 2 | admin |

**Notas**

- Intervalos de data: `[start, end)` (fim exclusivo).
- Comparação: período anterior de mesma duração; % indefinido se anterior = 0 e atual > 0.
- CSV: UTF-8 BOM, `;`, sanitização injection.
