# Relatórios operacionais — Amada Amante

## Arquitetura

- **Autoridade dos números:** PostgreSQL (RPCs `SECURITY DEFINER`).
- **Frontend:** consulta, formatação pt-BR, CSV, impressão, gráficos SVG leves.
- **Não** cria saldos paralelos, Jobs nem materialized views com refresh.
- Timezone de negócio no banco: `America/Sao_Paulo`.

Migration: `supabase/migrations/20260803120000_operational_reports.sql` (**não aplicada** nesta fase).

## Definições (resumo)

| Indicador | Definição |
|-----------|-----------|
| Faturamento bruto | Soma de `orders.total` com status `paid/separated/shipped/delivered` no período (`created_at`) |
| Valor cancelado | Soma/contagem `cancelled` |
| Valor reembolsado | Soma `refunded` |
| Receita líquida operacional | bruto − reembolsos − devoluções financeiras (`resolution=devolucao`) |
| Ticket médio | líquida ÷ pedidos pagos (base documentada) |
| Comissão gerada | créditos criados no período (pending/available/paid) |
| Margem estimada | só admin; exige `cost_price`; frete/impostos podem faltar |

Pending (`new`/`confirmed`) **não** conta como venda confirmada. Troca **não** desconta receita automaticamente.

## Fontes

- Pedidos/itens: `orders`, `order_items` (+ `seller_stores` para reseller)
- Comissões/carteira: `commissions`, `wallet_transactions`, `reseller_wallet_summary`
- Saques: `withdrawal_requests` (se migration aplicada)
- Devoluções: `product_returns`, `product_return_items`
- Estoque: `products` + reservas em pedidos pendentes ativos

## Segurança

- Anon sem acesso.
- Admin: RPCs `admin_*`.
- Sacoleira: `seller_*` escopo `current_reseller_id()`.
- Sem `cost_price`/margem para sacoleira.
- Exportação sem tokens, payment_details, PII desnecessária.
- Ordenação por allowlist; período máx. 366 dias; page_size ≤ 100 (export ≤ 10k).

## Performance

- Agregação no banco; lazy routes; debounce busca; retry só leitura (`withRetry` + `isIdempotentRead`).
- Dashboard carrega **resumo** via RPC, não todos os relatórios.

## Observabilidade

Operations: `reports.sales.summary`, `reports.resellers.list`, `reports.inventory.list`, `reports.export.csv`, etc. via `normalizeError` / `showAppError`.

## Limitações

- Sem histórico de “pago depois cancelado” além do status atual.
- “Reversed” de comissão mapeia ao status `cancelled` do schema atual.
- Reserva de estoque estimada por pedidos pendentes ativos (stock já debitado no checkout).

## Checklist Lovable Cloud

1. Aplicar migrations pendentes na ordem (saques → LGPD → logs → **relatórios**).
2. Validar `supabase/tests/operational_reports_checklist.sql`.
3. Publicar frontend depois.
4. Não criar Job de refresh.
