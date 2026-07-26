import type { ReportDateRange, ReportPreset } from "@/types/reports";

/** Timezone de negócio documentado — cortes no frontend alinham ao início do dia local do browser;
 * agregações no banco usam America/Sao_Paulo. */
export const BUSINESS_TIMEZONE = "America/Sao_Paulo";

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function resolveReportRange(preset: ReportPreset, custom?: { start: Date; end: Date }): ReportDateRange {
  const now = new Date();
  const today = startOfLocalDay(now);

  switch (preset) {
    case "today":
      return { preset, start: today, end: addDays(today, 1) };
    case "yesterday": {
      const y = addDays(today, -1);
      return { preset, start: y, end: today };
    }
    case "last_7_days":
      return { preset, start: addDays(today, -6), end: addDays(today, 1) };
    case "last_30_days":
      return { preset, start: addDays(today, -29), end: addDays(today, 1) };
    case "current_month": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { preset, start, end: addDays(today, 1) };
    }
    case "previous_month": {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 1);
      return { preset, start, end };
    }
    case "current_quarter": {
      const q = Math.floor(today.getMonth() / 3);
      const start = new Date(today.getFullYear(), q * 3, 1);
      return { preset, start, end: addDays(today, 1) };
    }
    case "current_year": {
      const start = new Date(today.getFullYear(), 0, 1);
      return { preset, start, end: addDays(today, 1) };
    }
    case "custom": {
      if (!custom?.start || !custom?.end) {
        return resolveReportRange("last_30_days");
      }
      const start = startOfLocalDay(custom.start);
      const end = addDays(startOfLocalDay(custom.end), 1);
      return { preset, start, end };
    }
    default:
      return resolveReportRange("last_30_days");
  }
}

export function previousEquivalentRange(range: ReportDateRange): { start: Date; end: Date } {
  const ms = range.end.getTime() - range.start.getTime();
  return {
    start: new Date(range.start.getTime() - ms),
    end: new Date(range.start.getTime()),
  };
}

export const REPORT_PRESET_LABELS: Record<ReportPreset, string> = {
  today: "Hoje",
  yesterday: "Ontem",
  last_7_days: "Últimos 7 dias",
  last_30_days: "Últimos 30 dias",
  current_month: "Mês atual",
  previous_month: "Mês anterior",
  current_quarter: "Trimestre atual",
  current_year: "Ano atual",
  custom: "Personalizado",
};
