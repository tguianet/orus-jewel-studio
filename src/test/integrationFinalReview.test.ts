import { readFileSync, readdirSync, existsSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { isPathAllowedForRole } from "@/lib/safeRedirect";
import { isNonRetryableOperation } from "@/lib/errors/retryPolicy";

const root = process.cwd();
const migrationsDir = path.join(root, "supabase/migrations");

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

function migrationFiles(): string[] {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

describe("integrationFinalReview", () => {
  it("A — assinatura frontend create_public_order = migration final LGPD", () => {
    const checkout = read("src/pages/store/StoreCheckout.tsx");
    const types = read("src/integrations/supabase/types.ts");
    const legal = read("supabase/migrations/20260801120000_legal_consents.sql");

    expect(checkout).toContain("p_consents");
    expect(checkout).toContain("p_checkout_token");
    expect(types).toContain("p_consents");
    expect(legal).toContain("p_consents jsonb");
    expect(legal).toContain("expires_at timestamptz");
    expect(legal).toContain("DROP FUNCTION IF EXISTS public.create_public_order(uuid, text, text, text, text, jsonb, uuid)");
    expect(legal).toContain("DROP FUNCTION IF EXISTS public.create_public_order(uuid, text, text, text, text, jsonb)");
  });

  it("B/C — checkout exige consentimentos na mesma transação", () => {
    const legal = read("supabase/migrations/20260801120000_legal_consents.sql");
    expect(legal).toContain("Consentimentos legais são obrigatórios no checkout");
    expect(legal).toContain("validate_checkout_consents");
    expect(legal).toContain("_record_checkout_consents_internal");
    expect(legal).toMatch(/Validação LGPD antes de reservar estoque/);
  });

  it("D/E — pedido pago não expira; restore idempotente", () => {
    const expiry = read("supabase/migrations/20260729120000_order_reservation_expiry.sql");
    expect(expiry).toContain("expire_abandoned_orders");
    expect(expiry).toContain("status IN ('new'::public.order_status, 'confirmed'::public.order_status)");
    expect(expiry).toContain("expires_at");
    expect(expiry).toContain("expired_at");
    // mark_order_paid rejeita expirado
    expect(expiry).toMatch(/expires_at <= now\(\)/);
  });

  it("F/G — cancel/devolução usam restore líquido sem double-restock", () => {
    const cancel = read("supabase/migrations/20260728120000_liquid_cancel_restore.sql");
    const returns = read("supabase/migrations/20260727120000_physical_returns.sql");
    expect(cancel).toContain("cancel_restore");
    expect(returns).toContain("return_restore");
    expect(returns).toContain("resolution");
  });

  it("H/I — comissão/saque: hold/release/paid e sem retry auto financeiro", () => {
    const withdrawals = read("supabase/migrations/20260731120000_reseller_withdrawals.sql");
    expect(withdrawals).toContain("withdrawal_hold");
    expect(withdrawals).toContain("withdrawal_release");
    expect(withdrawals).toContain("withdrawal_paid");
    expect(withdrawals).toContain("request_idempotency_key");
    expect(isNonRetryableOperation("request_withdrawal")).toBe(true);
    expect(isNonRetryableOperation("create_public_order")).toBe(true);
  });

  it("J/K/L — cost_price protegido; seller report sem custo; admin margem protegida", () => {
    const costMig = read("supabase/migrations/20260730120000_restrict_product_cost_price.sql");
    const sellerReport = read("src/pages/seller/SellerReports.tsx");
    const productsReport = read("src/pages/admin/reports/ProductsReport.tsx");
    const cloud = read("src/lib/cloudStore.ts");

    expect(costMig).toContain("REVOKE SELECT (cost_price)");
    expect(costMig).toContain("admin_product_costs");
    expect(sellerReport).not.toMatch(/\bcost_price\b/);
    expect(productsReport).toMatch(/custo não informado|Margem est/);
    expect(cloud).toContain("admin_product_costs");
    expect(cloud).not.toMatch(/reseller_wallet_summary"\)\.select\("\*"\)/);
  });

  it("M — reporter não gera loop ao falhar persistência", () => {
    const reporter = read("src/lib/errors/errorReporter.ts");
    expect(reporter).toContain("persist skipped");
    expect(reporter).toContain("anti-loop");
    const persistFn = reporter.slice(
      reporter.indexOf("async function persistToCloud"),
      reporter.indexOf("export async function reportError"),
    );
    expect(persistFn).not.toContain("reportError(");
    expect(persistFn).not.toContain("reportCritical(");
  });

  it("N/O — rotas e menus novos existem", () => {
    const app = read("src/App.tsx");
    const adminNav = read("src/layouts/AdminLayout.tsx");
    const sellerNav = read("src/layouts/SellerLayout.tsx");

    const routes = [
      "/erro",
      "/admin/erros-operacionais",
      "/admin/relatorios/vendas",
      "/admin/saques",
      "/admin/consentimentos",
      "/sacoleira/relatorios",
      "/sacoleira/saques",
      "/sacoleira/consentimentos",
      "/politica-de-saques",
    ];
    for (const r of routes) {
      expect(app).toContain(r);
    }
    expect(adminNav).toContain("/admin/relatorios");
    expect(adminNav).toContain("/admin/erros-operacionais");
    expect(sellerNav).toContain("/sacoleira/relatorios");
    expect(existsSync(path.join(root, "src/pages/admin/reports/SalesReport.tsx"))).toBe(true);
    expect(existsSync(path.join(root, "src/pages/seller/SellerReports.tsx"))).toBe(true);
  });

  it("P — safeRedirect cobre novas rotas por prefixo", () => {
    expect(isPathAllowedForRole("/admin/relatorios/vendas", ["admin"])).toBe(true);
    expect(isPathAllowedForRole("/admin/erros-operacionais", ["admin"])).toBe(true);
    expect(isPathAllowedForRole("/sacoleira/relatorios", ["sacoleira"])).toBe(true);
    expect(isPathAllowedForRole("/admin/relatorios", ["sacoleira"])).toBe(false);
    expect(isPathAllowedForRole("/erro", ["admin"])).toBe(false); // rota pública, não área role
  });

  it("Q — RPCs do frontend existem nas migrations", () => {
    const api = read("src/lib/reports/api.ts");
    const reportsMig = read("supabase/migrations/20260803120000_operational_reports.sql");
    const withdrawMig = read("supabase/migrations/20260731120000_reseller_withdrawals.sql");
    const logsMig = read("supabase/migrations/20260802120000_operational_error_logs.sql");

    for (const rpc of [
      "admin_get_sales_summary",
      "seller_get_sales_summary",
      "admin_get_expired_orders_report",
      "admin_export_report",
    ]) {
      expect(api).toContain(rpc);
      expect(reportsMig).toContain(`FUNCTION public.${rpc}`);
    }
    expect(withdrawMig).toContain("request_withdrawal");
    expect(logsMig).toContain("report_operational_error");
  });

  it("R/S — migrations em ordem cronológica; pendentes após dependências", () => {
    const files = migrationFiles();
    const pending = [
      "20260729120000_order_reservation_expiry.sql",
      "20260730120000_restrict_product_cost_price.sql",
      "20260731120000_reseller_withdrawals.sql",
      "20260801120000_legal_consents.sql",
      "20260802120000_operational_error_logs.sql",
      "20260803120000_operational_reports.sql",
    ];
    for (const f of pending) {
      expect(files).toContain(f);
    }
    const idxs = pending.map((f) => files.indexOf(f));
    for (let i = 1; i < idxs.length; i += 1) {
      expect(idxs[i]).toBeGreaterThan(idxs[i - 1]);
    }
    // Relatórios depois de saques e LGPD
    expect(files.indexOf("20260803120000_operational_reports.sql"))
      .toBeGreaterThan(files.indexOf("20260731120000_reseller_withdrawals.sql"));
    expect(files.indexOf("20260801120000_legal_consents.sql"))
      .toBeGreaterThan(files.indexOf("20260729120000_order_reservation_expiry.sql"));
  });

  it("T — fluxos sensíveis sem select('*') em products/orders", () => {
    const checkout = read("src/pages/store/StoreCheckout.tsx");
    const cloud = read("src/lib/cloudStore.ts");
    expect(checkout).not.toMatch(/\.select\(\s*["']\*["']\s*\)/);
    expect(cloud).not.toMatch(/from\("products"\)[\s\S]{0,80}\.select\(\s*["']\*["']\s*\)/);
    expect(cloud).toContain('select("reseller_id,pending,available,paid,total_balance,blocked")');
  });

  it("reports não usam movement_type inexistente de expiração", () => {
    const reports = read("supabase/migrations/20260803120000_operational_reports.sql");
    expect(reports).toContain("movement_type = 'cancel_restore'");
    expect(reports).not.toMatch(/movement_type IN \([^)]*expire/);
    expect(reports).toContain("reversed_alias_of");
  });

  it("App usa lazy + ErrorBoundary + fallback", () => {
    const app = read("src/App.tsx");
    expect(app).toContain("lazy(");
    expect(app).toContain("AppErrorBoundary");
    expect(app).toContain("RouteFallback");
    expect(app).toContain("LazyRouteErrorBoundary");
  });

  it("recharts não está no package.json", () => {
    const pkg = read("package.json");
    expect(pkg).not.toContain("recharts");
  });
});
