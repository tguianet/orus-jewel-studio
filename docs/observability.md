# Observabilidade e erros — Amada Amante

## Arquitetura

Camada central em `src/lib/errors/`:

| Arquivo | Função |
|--------|--------|
| `AppError.ts` | Erro tipado com código, severidade, mensagens e correlationId |
| `errorCodes.ts` | Códigos estáveis + categoria/severidade |
| `errorMessages.ts` | Mensagens amigáveis PT-BR |
| `normalizeError.ts` | Converte erros brutos (Supabase, fetch, PG, string) em `AppError` |
| `correlationId.ts` | Identificador `op_YYYYMMDD_xxxxxxxx` |
| `sanitizeErrorContext.ts` | Remove/mascara PII e segredos |
| `errorReporter.ts` | Relato desacoplado (console / RPC / adapter futuro) |
| `retryPolicy.ts` | Retry seguro apenas para leituras |
| `showAppError.ts` | Toast + dedupe + código de suporte |

UI: `AppErrorBoundary`, `RouteErrorBoundary`, `ErrorFallback`, página `/erro`, painel `/admin/erros-operacionais`.

## AppError

Campos: `code`, `category`, `severity`, `userMessage`, `technicalMessage`, `correlationId`, `retryable`, `operation`, `entityType`, `entityId`, `originalError`, `metadata` (sanitizada), `timestamp`.

- `userMessage` é sempre segura para UI.
- `technicalMessage` só para logs autorizados / dev.
- `originalError` e stack **não** vão para o payload de UI em produção (`toUserPayload(false)`).

## correlationId

Formato: `op_20260801_ab12cd34`.

- Gerado com `crypto.randomUUID` quando disponível.
- Um por operação / falha crítica.
- Exibido em toast (erros/críticos), tela de erro e painel admin.
- Usuário informa o código ao suporte.

## Categorias e severidades

Categorias: authentication, authorization, validation, network, timeout, database, rpc, checkout, inventory, commission, wallet, withdrawal, return, consent, pwa, unknown.

Severidades: info, warning, error, critical.

## Sanitização

Removidos/mascarados: password, tokens, authorization, apiKey, pix_key, document/cpf/cnpj, phone, email (quando presente), address, customer_*, payment_details, consent payload, cookies.

Permitidos: order_id, withdrawal_id, return_id, reseller_id, store_id, rpc_name, route, operation, status, http_status, error_code, correlation_id.

## Retry

Pode repetir: GET/listagens/catálogo/resumo, timeout de leitura, 502/503/504 em leitura.

**Não** repetir automaticamente: `create_public_order`, pagamento, saques, cancelamento, reembolso, devolução, comissão, senha, consentimento.

Com `idempotency_key`: só reutilizar a mesma chave (`reuseIdempotencyKey`).

## Integração por fluxo

| Fluxo | operation | category típica | retry auto |
|-------|-----------|-----------------|------------|
| Login / reset | sign_in / reset_password | authentication | não |
| Sessão expirada | session_expired | authentication | não |
| Checkout | create_public_order | checkout | não |
| Pagamento | mark_order_paid | checkout/commission | não |
| Cancel/refund | cancel_paid_order / refund_paid_order | commission/wallet | não |
| Devolução | register_physical_return | return | não |
| Saques | request_withdrawal / cancel_withdrawal | withdrawal | não |
| Consentimento | record_authenticated_consent | consent | não |
| PWA update | pwa_update | pwa | não |
| Listagens | load_* / list_* | network/rpc | sim (seguro) |

## Logs locais e no banco

- **Dev:** `console.info("[app-error]", payload)` via adapter.
- **Prod (error/critical):** RPC `report_operational_error` → tabela `operational_error_logs`.
- Adapter preparado para Sentry/LogRocket (`setErrorReporterAdapter`).

## Painel admin

Rota `/admin/erros-operacionais` — filtros, paginação, detalhes sanitizados, marcar resolvido.

## Privacidade e retenção

- Sem stack completa em produção por padrão.
- Sem payload bruto de checkout/consentimento.
- `technical_summary` ≤ 500 chars.
- Retenção sugerida futura: 90 dias para resolvidos (sem Job nesta fase).

## Integração futura com Sentry

```ts
setErrorReporterAdapter({
  send(payload) {
    // Sentry.captureException(..., { tags: { correlationId: payload.correlationId } })
  },
});
```

## Checklist Lovable Cloud

1. Aplicar migrations pendentes na ordem (saques → LGPD → logs operacionais).
2. Validar RPCs com `supabase/tests/operational_errors_checklist.sql`.
3. Publicar frontend **depois** da migration de logs (senão o report em prod falha silenciosamente).
4. Não usar logs operacionais como auditoria financeira.

## Suporte

1. Pedir o **código de suporte** (`correlationId`) ao usuário.
2. Buscar em Admin → Erros ou filtrar por `correlation_id`.
3. Usar `entity_id` / `operation` / `route` — nunca pedir senha/PIX novamente pelo chat.
