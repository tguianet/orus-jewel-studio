import { describe, expect, it } from "vitest";
import { pageAfterFilterChange, normalizePageSize } from "@/lib/pagination";
import { REPORT_PRESET_LABELS, resolveReportRange } from "@/lib/reports/periods";

describe("reportFilters", () => {
  it("page size máximo de tela é 100", () => {
    expect(normalizePageSize(500)).toBe(100);
  });

  it("mudança de filtro volta para página 1", () => {
    expect(pageAfterFilterChange(true, 4)).toBe(1);
    expect(pageAfterFilterChange(false, 4)).toBe(4);
  });

  it("presets têm labels pt-BR", () => {
    expect(REPORT_PRESET_LABELS.last_30_days).toMatch(/30/);
    const custom = resolveReportRange("custom", {
      start: new Date("2026-01-01T00:00:00"),
      end: new Date("2026-01-10T00:00:00"),
    });
    expect(custom.preset).toBe("custom");
  });
});
