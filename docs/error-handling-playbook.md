# Playbook operacional — erros Amada Amante

Use o **código de suporte** (`correlationId`, formato `op_YYYYMMDD_…`) como chave de busca.

## Checkout falhou

1. Confirmar se o usuário está online.
2. Buscar log por correlationId / operation `create_public_order`.
3. Se `CHECKOUT_TERMS_UPDATED`: pedir para reler e aceitar termos.
4. Se `INVENTORY_INSUFFICIENT`: orientar atualizar carrinho.
5. Se `ORDER_ALREADY_PROCESSED` / conflito: verificar se o pedido já existe antes de reenviar.
6. **Não** orientar “clique várias vezes” — pode haver token de checkout; orientar uma nova tentativa consciente.

## Pagamento falhou

1. Operation `mark_order_paid`.
2. Verificar status atual do pedido antes de repetir.
3. Retry automático **proibido**; só retry manual após diagnóstico.
4. Escalar se houver comissão parcial ou saldo inconsistente.

## Saldo inconsistente

1. Códigos `DATABASE_CONCURRENCY` / `WALLET_OPERATION_FAILED`.
2. Pedir reload da carteira; não repetir saque/pagamento.
3. Comparar com auditoria financeira (não com log operacional).
4. Escalar técnico se débito/crédito não bater com pedido.

## Saque falhou

1. Operations `request_withdrawal`, `mark_withdrawal_paid`, `cancel_withdrawal`.
2. Confirmar se já existe saque com a mesma `idempotency_key`.
3. Nunca gerar nova chave e reenviar às cegas.
4. Verificar consentimento da política de saques.

## Devolução falhou

1. Operation `register_physical_return`.
2. Conferir elegibilidade do pedido/itens.
3. Não repetir automaticamente; validar se a devolução já foi parcialmente registrada.

## Sessão expirou

1. Código `AUTH_SESSION_EXPIRED`.
2. Logout manual **não** é erro — não abrir chamado.
3. Orientar login novamente; se loop, limpar storage do site e tentar de novo.

## Erro de consentimento

1. Códigos `CONSENT_FAILED` / `CHECKOUT_TERMS_UPDATED`.
2. Pedir aceite novamente dos documentos vigentes.
3. Não registrar payload de consentimento em tickets.

## PWA desatualizada

1. Código `PWA_UPDATE_FAILED` / categoria `pwa`.
2. Não forçar update durante checkout.
3. Atualizar em tela segura; se falhar, hard refresh uma vez.

## Como buscar pelo correlationId

1. Admin → **Erros** (`/admin/erros-operacionais`).
2. Filtrar por código, rota, operação ou período.
3. Abrir detalhes (contexto já sanitizado).
4. Marcar resolvido com notas.

## Quando **não** repetir uma operação

- Qualquer escrita financeira sem chave idempotente confirmada.
- Checkout, pagamento, saque, reembolso, devolução, criação de comissão.
- Offline (bloquear e esperar conexão + retry **manual**).

## Quando escalar para análise técnica

- Severity `critical` recorrente.
- Conflito de carteira/comissão após pagamento/cancelamento.
- Rate limit ou spam de reports.
- Mensagem interna de banco ainda vazando para UI (bug de normalização).
- Suspeita de PII em `sanitized_context` (bug de sanitização).
