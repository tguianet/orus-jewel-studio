import { describe, expect, it } from "vitest";
import {
  averageTicket,
  estimatedMargin,
  netRevenue,
  percentChange,
} from "@/lib/reports/metrics";

describe("reportMetrics", () => {
  it("calcula receita líquida sem misturar comissão", () => {
    expect(netRevenue({ gross: 1000, refunded: 100, returnsFinancial: 50 })).toBe(850);
  });

  it("ticket médio evita divisão por zero", () => {
    expect(averageTicket(850, 0)).toBe(0);
    expect(averageTicket(850, 10)).toBe(85);
  });

  it("margem estimada exige custo", () => {
    expect(estimatedMargin({ netRevenue: 100, quantity: 2, costPrice: null }).label).toBe("custo não informado");
    const m = estimatedMargin({ netRevenue: 100, quantity: 2, costPrice: 20 });
    expect(m.margin).toBe(60);
    expect(m.pct).toBe(60);
  });

  it("percentChange nunca retorna infinito", () => {
    expect(percentChange(10, 0)).toBeNull();
    expect(percentChange(0, 0)).toBe(0);
    expect(percentChange(110, 100)).toBe(10);
  });
});
