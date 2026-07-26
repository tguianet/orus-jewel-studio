import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isPathAllowedForRole } from "@/lib/safeRedirect";

describe("multi-role navigation", () => {
  it("ProtectedRoute aceita allowedRoles array", () => {
    const src = readFileSync(join(process.cwd(), "src/components/ProtectedRoute.tsx"), "utf8");
    expect(src).toContain("allowedRoles");
    expect(src).toContain("required.some((r) => userRoles.includes(r))");
    const app = readFileSync(join(process.cwd(), "src/App.tsx"), "utf8");
    expect(app).toContain('allowedRoles={["admin"]}');
    expect(app).toContain('allowedRoles={["sacoleira"]}');
  });

  it("menus condicionais de troca sem logout", () => {
    const admin = readFileSync(join(process.cwd(), "src/layouts/AdminLayout.tsx"), "utf8");
    const seller = readFileSync(join(process.cwd(), "src/layouts/SellerLayout.tsx"), "utf8");
    expect(admin).toContain("Área da Sacoleira");
    expect(admin).toContain("isReseller");
    expect(seller).toContain("Voltar ao Admin");
    expect(seller).toContain("isAdmin");
    expect(admin).not.toContain("signOut()");
    expect(seller).not.toMatch(/Voltar ao Admin[\s\S]*signOut/);
  });

  it("área seller usa escopo próprio (não cost_price / não admin RPC de custos)", () => {
    const sellerDir = join(process.cwd(), "src/pages/seller");
    const files = [
      "SellerCatalog.tsx",
      "SellerProducts.tsx",
      "SellerDashboard.tsx",
      "SellerOrders.tsx",
    ];
    for (const f of files) {
      const src = readFileSync(join(sellerDir, f), "utf8");
      expect(src).not.toContain("cost_price");
      expect(src).not.toContain("admin_product_costs");
    }
  });

  it("admin+sacoleira pode navegar entre painéis; preferência ≠ permissão", () => {
    const dual = ["admin", "sacoleira"] as const;
    expect(isPathAllowedForRole("/admin/financeiro", [...dual])).toBe(true);
    expect(isPathAllowedForRole("/sacoleira/saques", [...dual])).toBe(true);
    expect(isPathAllowedForRole("/admin/financeiro", ["sacoleira"])).toBe(false);
  });

  it("AreaProvider sincroniza área pela rota", () => {
    const src = readFileSync(join(process.cwd(), "src/contexts/AreaContext.tsx"), "utf8");
    expect(src).toContain("areaFromPath");
    expect(src).toContain("writeAreaPreference");
    expect(src).toContain("canSwitchAreas");
    expect(src).toContain('isResellerArea: effective === "reseller"');
  });
});
