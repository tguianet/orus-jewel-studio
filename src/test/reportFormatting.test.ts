import { describe, expect, it } from "vitest";
import { formatBRL } from "@/lib/format";
import { formatCsvDate, formatCsvNumber } from "@/lib/reports/csvExport";
import { formatPercentChange } from "@/lib/reports/metrics";

describe("reportFormatting", () => {
  it("formata BRL pt-BR", () => {
    expect(formatBRL(1234.5)).toMatch(/R\$/);
    expect(formatBRL(Number.NaN)).toBe("R$ 0,00");
  });

  it("formata números e datas para CSV", () => {
    expect(formatCsvNumber(10.5)).toMatch(/10/);
    expect(formatCsvDate("2026-08-03T15:00:00.000Z")).toMatch(/\d/);
  });

  it("formata variação percentual", () => {
    expect(formatPercentChange(12.345)).toContain("%");
    expect(formatPercentChange(null)).toBe("—");
  });
});
