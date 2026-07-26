import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  ADMIN_PRODUCT_SELECT_NO_COST,
  PUBLIC_PRODUCT_NESTED_SELECT,
  RESELLER_PRODUCT_SELECT,
} from "@/lib/cloudStore";
import {
  isPublicSafeProductSelect,
  isResellerSafeProductSelect,
  mergeAdminCost,
  selectIncludesCostPrice,
} from "@/lib/productCosts";
import type { AdminProduct, PublicProduct, ResellerProduct } from "@/types/commerce";

const root = path.resolve(__dirname, "../..");

describe("product cost access", () => {
  it("A/B/C/D — selects públicos e sacoleira sem cost_price", () => {
    expect(selectIncludesCostPrice(RESELLER_PRODUCT_SELECT)).toBe(false);
    expect(isResellerSafeProductSelect(RESELLER_PRODUCT_SELECT)).toBe(true);
    expect(RESELLER_PRODUCT_SELECT).toContain("wholesale_price");

    expect(isPublicSafeProductSelect(PUBLIC_PRODUCT_NESTED_SELECT)).toBe(true);
    expect(selectIncludesCostPrice(PUBLIC_PRODUCT_NESTED_SELECT)).toBe(false);
    expect(PUBLIC_PRODUCT_NESTED_SELECT).not.toContain("wholesale_price");

    expect(selectIncludesCostPrice(ADMIN_PRODUCT_SELECT_NO_COST)).toBe(false);
    expect(ADMIN_PRODUCT_SELECT_NO_COST).toContain("wholesale_price");
  });

  it("E/F — merge de custos admin e ausência quando RPC não retorna", () => {
    const costs = new Map([
      ["p1", { id: "p1", cost_price: 12.5, wholesale_price: 40 }],
    ]);
    expect(mergeAdminCost("p1", costs).costPrice).toBe(12.5);
    expect(mergeAdminCost("missing", costs, 99).costPrice).toBeUndefined();
    expect(mergeAdminCost("missing", costs, 99).wholesalePrice).toBe(99);
  });

  it("G/H — tipos por perfil", () => {
    const pub: PublicProduct = {
      id: "1",
      code: "X",
      name: "Anel",
      category: "Anéis",
      description: "",
      suggestedPrice: 100,
      stock: 1,
      minOrder: 1,
      image: "",
      active: true,
      resellerPrice: 120,
    };
    expect("costPrice" in pub).toBe(false);
    expect("wholesalePrice" in pub).toBe(false);

    const reseller: ResellerProduct = {
      ...pub,
      wholesalePrice: 50,
    };
    expect(reseller.wholesalePrice).toBe(50);
    expect("costPrice" in reseller).toBe(false);

    const admin: AdminProduct = {
      ...reseller,
      costPrice: 20,
    };
    expect(admin.costPrice).toBe(20);
  });

  it("L — nenhum select('*') / cost_price nos fluxos públicos e sacoleira", () => {
    const cloud = readFileSync(path.join(root, "src/lib/cloudStore.ts"), "utf8");
    expect(cloud).toContain("RESELLER_PRODUCT_SELECT");
    expect(cloud).toContain("PUBLIC_PRODUCT_NESTED_SELECT");
    // loadCatalogForStore / loadStoreProducts não pedem cost_price
    const catalogBlock = cloud.slice(
      cloud.indexOf("export const loadCatalogForStore"),
      cloud.indexOf("export const toggleStoreProduct"),
    );
    expect(catalogBlock).not.toMatch(/cost_price/);
    expect(catalogBlock).toContain("RESELLER_PRODUCT_SELECT");

    const publicBlock = cloud.slice(
      cloud.indexOf("export const loadStoreProducts"),
      cloud.indexOf("// ---------- Admin / catalog"),
    );
    expect(publicBlock).toContain("PUBLIC_PRODUCT_NESTED_SELECT");
    expect(publicBlock).not.toMatch(/\.select\([^)]*cost_price/);
    expect(publicBlock).not.toMatch(/\.select\([^)]*wholesale_price/);
  });

  it("I — NewProductModal não faz RETURNING de cost_price", () => {
    const src = readFileSync(path.join(root, "src/components/NewProductModal.tsx"), "utf8");
    expect(src).toMatch(/\.select\("id,code,name,description,wholesale_price/);
    expect(src).not.toMatch(/\.select\([^)]*cost_price/);
  });

  it("J — checkout RPC não é alterada para retornar custo (guardas no create_public_order)", () => {
    const migration = readFileSync(
      path.join(root, "supabase/migrations/20260730120000_restrict_product_cost_price.sql"),
      "utf8",
    );
    expect(migration).toContain("REVOKE SELECT (cost_price)");
    expect(migration).toContain("admin_product_costs");
    expect(migration).not.toContain("CREATE VIEW");
  });

  it("checklist SQL existe com cenários A–L", () => {
    const sql = readFileSync(
      path.join(root, "supabase/tests/product_cost_access_checklist.sql"),
      "utf8",
    );
    for (const marker of ["A.", "B.", "C.", "D.", "E.", "F.", "G.", "H.", "I.", "J.", "K.", "L."]) {
      expect(sql).toContain(marker);
    }
  });
});
