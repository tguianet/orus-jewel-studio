# Auditoria final do sistema — Amada Amante

Data: 2026-07-26 · Ambiente: desenvolvimento local (pré-Cloud)

## Readiness score: **82 / 100**

## Recomendação: **GO condicional**

GO para aplicação das migrations no Lovable Cloud **na ordem documentada**, com smoke tests após o bloco LGPD e **somente então** publicar o frontend.  
NO-GO se: snapshot/backup indisponível, ou Cloud ainda não tiver migrations base (stock/comissões/cancel/returns).

---

## Módulos revisados

| # | Módulo | Status |
|---|--------|--------|
| 1–7 | Pedidos, estoque, expiração, pagamento, cancel, reembolso, devoluções/trocas | OK — cadeia de migrations coerente |
| 8–11 | Comissões, carteira, saques | OK — hold/release/paid; view `blocked` |
| 12 | LGPD | OK — `p_consents` atômico no checkout |
| 13–16 | Auth, recovery, roles, cost_price | OK |
| 17–18 | Observabilidade, relatórios | OK após correções |
| 19–20 | PWA, lazy loading | OK — sem recharts |

## Dependências críticas

```
stock + checkout_token
  → expiry (expires_at + expire_abandoned_orders)
  → cost_price revoke
  → withdrawals (+ wallet view blocked)
  → legal_consents (create_public_order final + seeds)
  → operational_error_logs
  → operational_reports
```

## Conflitos encontrados e correções

| Achado | Severidade | Correção |
|--------|------------|----------|
| Relatórios usavam `expire_restore` inexistente | Alta | Removido; usa `cancel_restore` |
| Summary comissões somava `cancelled` e `reversed` iguais | Média | `reversed=0` + alias documentado; UI unificada |
| Overload antigo `create_public_order` 6 args podia restar | Média | DROP explícito na migration LGPD |
| `select('*')` em `reseller_wallet_summary` | Baixa | Select de colunas explícitas |
| Reporter não checava `error` do RPC | Baixa | Check + anti-loop documentado |
| Relatórios sem mensagem se RPC ausente | Baixa | Mensagem amigável em `reports/api.ts` |

## Assinatura final `create_public_order`

`(p_seller_store_id, p_customer_name, p_customer_phone, p_customer_address, p_notes, p_items, p_checkout_token, p_consents)`  
Returns inclui `expires_at`. Frontend alinhado.

## Pendências (não bloqueantes de SQL)

1. Criar Job `expire_abandoned_orders` **após** migration de expiração (não nesta fase).
2. Validar `content_hash` dos seeds LGPD vs HTML das páginas no smoke (humano).
3. Warnings ESLint `exhaustive-deps` em páginas de relatório (cosmético).
4. `storePopups` / `commissionSettings` ainda usam `select('*')` em tabelas não-products (baixo risco).

## Riscos restantes

- Publicar FE **antes** da migration LGPD quebra checkout (`p_consents` obrigatório).
- Publicar FE de relatórios/saques antes do SQL → telas com erro amigável (esperado).
- Sem Job, reservas vencidas só limpam quando alguém chamar `expire_abandoned_orders`.
- Schema de comissão sem status `reversed` — relatórios tratam como alias de `cancelled`.

## GO / NO-GO

| Critério | |
|----------|--|
| Ordem migrations clara | Sim |
| Assinatura checkout única e FE alinhado | Sim |
| Bugs SQL de relatórios corrigidos | Sim |
| Isolamento cost_price / sacoleira | Sim |
| Plano rollback | Sim |
| SQL aplicado neste workspace | **Não** (correto) |

**GO condicional** para implantação no Cloud seguindo `docs/lovable-cloud-deployment-plan.md`.
