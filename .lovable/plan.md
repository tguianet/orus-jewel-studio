# MVP Funcional — Aura Store Suite

## Premissa importante

O "banco interno do Lovable" **é** o Lovable Cloud (que internamente usa Supabase). Não existe outro banco nativo separado. Vou usar exclusivamente o cliente já presente em `src/integrations/supabase/client.ts` — você não precisa de conta nem projeto externo. Toda comunicação com você chamarei isso de "Lovable Cloud / banco interno".

## Diagnóstico do que já existe

Boa notícia: a maior parte do schema que você pediu **já está criado** no banco interno (migrations anteriores):

```text
profiles, resellers (com parent_id), seller_stores (com theme jsonb),
categories, products, store_products, orders, order_items,
commissions (level/rate/status), wallet_transactions, user_roles (admin/reseller)
```

O que **não funciona hoje**:
- Login é mockado (`AuthContext` cria usuário fake) → não há sessão real, não há proteção de rotas, RLS não consegue identificar o usuário.
- Várias páginas (Catálogo, Produtos da Loja, Comissões, Rede, Admin Sacoleiras) ainda leem de `mockData.ts`.
- Não existe geração automática de comissões MLM ao marcar pedido como pago.
- Wallet do sacoleira não tem tela real agregando `wallet_transactions`.

## O que será feito

### 1. Autenticação real (Lovable Cloud Auth)
- Substituir `AuthContext` mock por sessão real do Cloud (email + senha; Google opcional depois).
- Páginas `/login-admin` e `/login-sacoleira` passam a chamar `signInWithPassword`. Adicionar tela de cadastro para sacoleira (com campo opcional `código de indicação` → vira `parent_id` em `resellers`).
- Trigger no banco (`handle_new_user`) cria automaticamente `profiles` + `resellers` + `user_roles` (`reseller`) ao signup. Admin é promovido manualmente via SQL/seed.
- Componente `<ProtectedRoute role="admin|reseller">` envolvendo as rotas `/admin/*` e `/sacoleira/*`. `/loja/:slug` permanece pública.

### 2. Ajustes finos no schema (migration)
- Adicionar coluna `origin` em `orders` (`loja_online | whatsapp | manual`).
- Garantir enum `order_status` com `pending, paid, shipped, delivered, canceled` (mapeando os valores PT atuais).
- Função `process_order_payment(order_id)`: roda em `SECURITY DEFINER`, gera comissões nível 1/2/3 (10/5/2 %) percorrendo `parent_id` em `resellers`, insere em `commissions` e em `wallet_transactions` (status `available`). Idempotente.
- Trigger `AFTER UPDATE` em `orders` que dispara `process_order_payment` quando `status` muda para `paid`.
- View `reseller_wallet_summary` (saldo pendente / disponível / pago) por `reseller_id`.
- Revisão de RLS: cada sacoleira só lê/edita o que é dela; admin (via `has_role`) lê tudo; loja pública (`/loja/:slug`) permite leitura anônima de `seller_stores` aprovadas, `store_products` ativos e `products` ativos.

### 3. Fluxo prioritário ligado ao banco
Ordem de implementação (igual à sua lista de prioridade):

1. **Admin → Produtos**: `AdminProducts` lê/edita/exclui via `products` (modal de criação já salva — só falta listar do banco e edição).
2. **Sacoleira → Minha Loja**: `SellerCustomization` já salva tema; garantir que upsert em `seller_stores` use o `reseller_id` do usuário logado.
3. **Sacoleira → Catálogo / Produtos da Loja**: substituir mocks. Catálogo lista `products` ativos + permite togglar em `store_products` com `resale_price` definido pela sacoleira.
4. **Loja pública**: `StoreHome` / `StoreProduct` já usam `loadStoreProducts` — validar e remover fallback mock.
5. **Carrinho + Checkout**: `StoreCheckout` já cria `orders` + `order_items`. Setar `origin = 'loja_online'` e abrir WhatsApp (já faz).
6. **Admin/Sacoleira → Pedidos**: listar reais; admin pode mudar status (`pending → paid → shipped → delivered`/`canceled`).
7. **Comissão MLM**: ao virar `paid`, trigger gera registros — sem código no front.
8. **Wallet**: nova tela `/sacoleira/wallet` (ou aba em Comissões) lendo `reseller_wallet_summary` + lista de `wallet_transactions`.

### 4. MLM / Rede
- `SellerNetwork`: árvore real consultando `resellers` por `parent_id` (recursivo via CTE em RPC `get_downline`).
- `AdminNetwork`: árvore global + filtro por sacoleira.

### 5. Limpeza de mocks
- `mockData.ts` mantido só para tipos compartilhados e fallback visual quando o banco está vazio (ex.: imagens default por categoria).
- Remover `sacoleiras`, `storeOrders`, `commissions` mockados das páginas — passam a buscar do banco com `useEffect` + estados de loading.

### 6. Visual e responsividade
- Mantido 100%: paleta preto/dourado, layout atual das páginas. Apenas trocando fonte de dados.

## Estrutura técnica (resumo para devs)

```text
src/contexts/AuthContext.tsx        → reescrito (sessão real + onAuthStateChange)
src/components/ProtectedRoute.tsx   → novo
src/pages/LoginPage.tsx             → signInWithPassword + tab signup p/ sacoleira
src/lib/cloudStore.ts               → +loadAdminProducts, +loadSellerOrders,
                                      +loadResellerWallet, +loadDownline,
                                      +toggleStoreProduct, +updateOrderStatus
supabase/migrations/<new>.sql       → handle_new_user, process_order_payment,
                                      trigger on orders, view wallet_summary,
                                      RLS revisada, coluna origin
```

## Fora deste plano (próximas iterações)
- Saques reais da wallet (PIX/transferência).
- Notificações por email/WhatsApp automáticas.
- Pagamento online (Stripe/Pix) — hoje fica manual via admin marcando "pago".

## Riscos
- Você precisará criar **um usuário admin** após o deploy (faço seed SQL inserindo `user_roles` para o primeiro email que você me passar).
- Pedidos antigos mockados não terão comissões — apenas novos pedidos passados para `paid` geram MLM.

Confirma para eu começar pela **Etapa 1 (auth real + proteção de rotas)** e seguir em sequência?
