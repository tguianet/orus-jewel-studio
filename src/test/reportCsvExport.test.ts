import { describe, expect, it } from "vitest";
import {
  buildReportFilename,
  rowsToCsv,
  sanitizeCsvCell,
  stripSensitiveExportFields,
} from "@/lib/reports/csvExport";

describe("reportCsvExport", () => {
  it("CSV com BOM e separador ;", () => {
    const csv = rowsToCsv([{ a: 1, b: "x" }]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain(";");
  });

  it("protege CSV injection", () => {
    expect(sanitizeCsvCell("=CMD()")).toMatch(/^'/);
    expect(sanitizeCsvCell("+1")).toMatch(/^'/);
    expect(sanitizeCsvCell("-2")).toMatch(/^'/);
    expect(sanitizeCsvCell("@x")).toMatch(/^'/);
  });

  it("remove campos sensíveis na exportação", () => {
    const rows = stripSensitiveExportFields([
      { order_id: "1", checkout_token: "tok", payment_details: "{}", total: 10 },
    ]);
    expect(rows[0].order_id).toBe("1");
    expect(rows[0].checkout_token).toBeUndefined();
    expect(rows[0].payment_details).toBeUndefined();
  });

  it("nome de arquivo padronizado", () => {
    expect(buildReportFilename("vendas", new Date("2026-08-03T12:00:00")))
      .toBe("amada-amante-relatorio-vendas-2026-08-03.csv");
  });
});
