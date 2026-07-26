# Auditoria final de produção — Amada Amante

Data: 2026-07-26 · Ambiente: **Lovable Cloud (migrations 1–9 aplicadas)**

## Readiness score: **94 / 100**

## Recomendação: **GO**

GO para publicação. Restam 2 ações operacionais (não bloqueiam o deploy, mas devem
ser feitas logo após): criar o Job de expiração e conferir os hashes LGPD.

---

## 1. Estado das migrations

| # | Migration | Status |
|---|-----------|--------|
| 1 | `order_reservation_expiry` | Aplicada |
| 2 | `restrict_product_cost_price` | Aplicada |
| 3 | `reseller_withdrawals` | Aplicada |
| 4 | `legal_consents` | Aplicada |
| 5 | `operational_error_logs` | Aplicada |
| 6 | `operational_reports` | Aplicada |
| 7 | `admin_management` | Aplicada |
| 8 | `multi_role_users` | Aplicada |
| 9 | `required_referral_code` | Aplicada (adaptada: cadastro via `auth.signUp` + `handle_new_user`) |

Verificação em produção: `expires_at/expired_at/expiration_reason` presentes em `orders`;
view `reseller_wallet_summary` com coluna `blocked`; RPCs de relatórios, saques, admin,
multi-role e referral presentes e refletidos nos tipos gerados.

## 2. Tipagem — `sbLoose` removido

`src/lib/supabaseLoose.ts` foi **excluído**. Todo o app usa o client tipado:

- `src/lib/reports/api.ts` → `supabase.rpc()` com união fechada de nomes de RPC.
- `src/lib/cloudStore.ts` → `reseller_wallet_summary` lida com select de colunas explícitas.

## 3. PWA

### Instalação
- `src/lib/pwaInstall.ts` — detecção de plataforma (`android-chromium`, `ios-safari`, `desktop`),
  `isStandalone`, resolução de área por rota e passos manuais para iOS.
- `PwaInstallProvider` + `usePwaInstall` capturam `beforeinstallprompt`.
- `PwaInstallFab` (botão flutuante) aparece só quando faz sentido instalar; some quando
  o app já está em modo standalone/instalado e em `/escolher-area`.
- Rótulo por área: Painel Admin / Área da Sacoleira / esta loja.

### Atualização
- `isCriticalOperationPath` bloqueia atualização silenciosa em `/checkout`, `/carrinho`,
  `/pagamento`, `/saques`, `/withdrawals`, `/devolucoes`, `/trocas`.
- Guard anti-loop de reload mantido (`PWA_RELOAD_GUARD_KEY`).

Cobertura: `src/test/pwaInstall.test.ts` (15) + `src/test/pwaUpdate.test.ts` (8).

## 4. Prévia de link compartilhado (WhatsApp)

Crawlers não executam JS, então metadados por loja exigem HTML servido pelo servidor.

- **Edge Function `og-loja`** (`supabase/functions/og-loja/index.ts`), já publicada.
  - Crawler → HTML com OG por loja (nome real + banner da loja; fallback para o banner padrão).
  - Humano → `302` para `https://amadaamante.app/loja/{slug}`.
  - Sem slug → `400`. Slug inexistente → OG genérico da marca.
  - Prefere `bannerUrl` (proporção boa) sobre `logoUrl` (quadrada).
  - `og:image:type/width/height` só são declarados para o banner padrão conhecido.
- `api/og-loja.ts` e `middleware.ts` são específicos de Vercel e **não** rodam no Lovable.
  O link `amadaamante.app/loja/{slug}` continua usando o OG estático do `index.html`
  (marca Amada Amante). Para prévia por loja, compartilhar a URL da função.

## 5. Qualidade

| Verificação | Resultado |
|-------------|-----------|
| `tsc --noEmit` | 0 erros |
| ESLint | 0 erros, 20 warnings (`exhaustive-deps`, cosmético) |
| Vitest | **247 testes / 42 arquivos — todos passando** |
| Build de produção | OK · SW gerado (146 entradas de precache) |

## 6. Pendências operacionais

1. **Job de expiração** — criar em Cloud → Jobs:
   - Nome: `Expire abandoned orders` · A cada 5 minutos (`*/5 * * * *`)
   - SQL (obrigatório o `set_config`: a função e os triggers exigem
     `service_role` + admin no claim JWT; sem isso o Job falha com
     "Somente service_role ou admin podem expirar pedidos abandonados"):
     ```sql
     SELECT set_config(
       'request.jwt.claims',
       '{"role":"service_role","sub":"4fc3feca-1da4-4004-b3f3-d2dfdca3d187"}',
       true
     );
     SELECT * FROM public.expire_abandoned_orders(100);
     ```
   - Validação 2026-07-26 (teste em transação revertida): 1 pedido expirado,
     2 unidades restauradas, 2ª execução `0/0`, estoque 10 → 8 → 10 (sem duplo
     restock), 1 único movimento `cancel_restore`, pedido `paid` intacto.
   - Hoje: `0` pedidos vencidos pendentes, `0` já expirados — sem passivo acumulado.
2. **LGPD** — conferir manualmente `content_hash` dos seeds vs. HTML das páginas legais.

## 7. Riscos residuais aceitos

- Sem o Job, reservas vencidas só liberam estoque em chamada manual da RPC.
- Comissões não têm status `reversed` no schema; relatórios tratam como alias de `cancelled`.
- Prévia por loja depende da URL da Edge Function; a URL curta mostra o OG da marca.
- Warnings de `exhaustive-deps` nas páginas de relatório (sem impacto funcional).

## 8. GO / NO-GO

| Critério | |
|----------|--|
| Migrations 1–9 aplicadas e verificadas | Sim |
| Tipos gerados alinhados / `sbLoose` removido | Sim |
| Isolamento admin × sacoleira × anon | Sim |
| PWA instalável e atualização segura | Sim |
| Prévia de link por loja disponível | Sim (via Edge Function) |
| Testes, lint, build | Sim |
| Job de expiração criado | **Não — ação manual** |

**GO** para produção.
