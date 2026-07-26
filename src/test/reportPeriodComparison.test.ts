import { describe, expect, it } from "vitest";
import { formatPercentChange, percentChange } from "@/lib/reports/metrics";
import { previousEquivalentRange, resolveReportRange } from "@/lib/reports/periods";

describe("reportPeriodComparison", () => {
  it("período anterior equivalente tem mesma duração", () => {
    const range = resolveReportRange("last_7_days");
    const prev = previousEquivalentRange(range);
    expect(prev.end.getTime()).toBe(range.start.getTime());
    expect(prev.end.getTime() - prev.start.getTime()).toBe(range.end.getTime() - range.start.getTime());
  });

  it("comparação com zero anterior não mostra infinito", () => {
    expect(formatPercentChange(percentChange(50, 0))).toBe("—");
    expect(formatPercentChange(percentChange(-10, 100))).toContain("-");
  });

  it("presets principais resolvem intervalo half-open", () => {
    const month = resolveReportRange("current_month");
    expect(month.end.getTime()).toBeGreaterThan(month.start.getTime());
  });
});
