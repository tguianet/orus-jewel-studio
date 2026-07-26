import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { isNonRetryableOperation } from "@/lib/errors/retryPolicy";

const root = process.cwd();

describe("reportPermissions", () => {
  it("rotas admin/sacoleira de relatórios existem e são protegidas", () => {
    const app = readFileSync(path.join(root, "src/App.tsx"), "utf8");
    expect(app).toContain('/admin/relatorios');
    expect(app).toContain('/sacoleira/relatorios');
    expect(app).toMatch(/Admin><AdminSalesReport/);
    expect(app).toMatch(/Seller><SellerReports/);
  });

  it("sacoleira não vê cost_price nas telas de relatório", () => {
    const seller = readFileSync(path.join(root, "src/pages/seller/SellerReports.tsx"), "utf8");
    expect(seller).not.toMatch(/\bcost_price\b/);
    expect(seller).toMatch(/Sem custos nem margens/);
    expect(seller).toMatch(/não exibe custo de produto/);
  });

  it("admin produtos menciona margem estimada e custo", () => {
    const products = readFileSync(path.join(root, "src/pages/admin/reports/ProductsReport.tsx"), "utf8");
    expect(products).toMatch(/Margem est/);
    expect(products).toMatch(/custo não informado/);
  });

  it("leituras de relatório podem retry; export não é operação financeira crítica", () => {
    expect(isNonRetryableOperation("create_public_order")).toBe(true);
    expect(isNonRetryableOperation("reports.sales.summary")).toBe(false);
  });
});
