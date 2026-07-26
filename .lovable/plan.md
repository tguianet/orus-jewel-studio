# Etapa 1 — Expiração de reservas (com 1 bloqueio a resolver)

## Estado verificado agora (leitura no banco)

- Arquivos das 9 migrations existem no repositório, na ordem indicada.
- `orders` **não** tem `expires_at`, `expired_at` nem `expiration_reason` → a migration 1 ainda não foi aplicada.
- Funções presentes hoje: `mark_order_paid`, `restore_stock_on_order_cancelled`, `register_physical_return`, `cancel_paid_order`.
- Seu acesso admin está intacto: `user_roles` tem 1 `admin` e 6 `sacoleira`.
- Pedidos atuais: 8 `paid`, 1 `new`. `stock_movements` está vazio (0 linhas).
- Não tenho como inspecionar o GitHub (`tguianet/orus-jewel-studio`) nem a branch a partir daqui — o sync é gerenciado pela plataforma; posso confirmar apenas o conteúdo do workspace.

## Bloqueio encontrado

A migration **`20260728120000_liquid_cancel_restore.sql` não está aplicada**:
- `cancel_order_with_stock_restore` e `protect_direct_order_cancel` não existem no banco;
- a versão atual de `restore_stock_on_order_cancelled` grava movimentos `cancel_restore`, mas **não publica** os contadores `app.cancel_restore_units / _products / _skipped / _details`.

A migration 1 (`20260729120000_order_reservation_expiry.sql`) **lê exatamente esses contadores** (linhas 213–227) para relatar unidades restauradas por pedido expirado. Aplicada sozinha, `expire_abandoned_orders` funciona no cancelamento, mas reporta sempre 0 unidades restauradas, e a proteção líquida contra double-restock (net de devoluções físicas) da 20260728 fica ausente.

## Proposta

1. Aplicar primeiro `20260728120000_liquid_cancel_restore.sql` (pré-requisito, não estava na sua lista porque presumivelmente já era considerado aplicado). Validar: trigger de restore líquido, bloqueio de cancelamento direto, restore não duplicado com devolução física prévia.
2. Parar, reportar e aguardar sua autorização.
3. Só então aplicar `20260729120000_order_reservation_expiry.sql`.

Se preferir, aplico apenas a 1 e aceito o relatório de unidades zerado — mas não recomendo.

## Validações da migration de expiração (etapa 3)

Objetos: `orders.expires_at/expired_at/expiration_reason`, índice parcial de ativos, tabela `order_reservation_settings` (RLS + grants: leitura para `authenticated`, tudo para `service_role`, `anon` revogado), `get_order_reserve_minutes`, `mark_order_paid` (reescrita), `expire_abandoned_orders`, `create_public_order` (reescrita com `expires_at`).

Testes, todos em transação com `ROLLBACK`, sem tocar em pedidos reais:
- pedido `new` vencido → cancelado + `expired_at` + restore uma única vez;
- pedido `new` dentro do prazo → permanece ativo;
- pedido `paid` → nunca expira; `mark_order_paid` em pedido vencido → rejeitado;
- pedido já `cancelled`/expirado → não expira de novo;
- `expire_abandoned_orders` executada 2× → idempotente, sem restore duplicado;
- estoque e `stock_movements` conferidos antes/depois;
- locking (`FOR UPDATE SKIP LOCKED`) verificado com duas sessões;
- `anon` sem EXECUTE em `expire_abandoned_orders`; sacoleira negada;
- assinatura de `create_public_order` conferida contra as chamadas do frontend (`StoreCheckout.tsx`) — sem overload ambíguo;
- baseline de pedidos/comissões/carteira reconferido ao final.

## Regras mantidas

Sem publicação do frontend, sem alterar código nesta etapa, uma migration por vez, nenhuma migration antiga substituída, seu papel de admin preservado. Interrupção imediata se aparecer erro em estoque, pedidos, comissões, carteira, roles, auth ou checkout.
