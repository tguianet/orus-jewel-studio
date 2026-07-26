import { useMemo, useState } from "react";
import type { ReportDateRange } from "@/types/reports";
import { resolveReportRange } from "@/lib/reports/periods";

export function useReportRange(initial: ReportDateRange["preset"] = "last_30_days") {
  const [range, setRange] = useState<ReportDateRange>(() => resolveReportRange(initial));
  const key = useMemo(
    () => `${range.preset}:${range.start.toISOString()}:${range.end.toISOString()}`,
    [range],
  );
  return { range, setRange, key };
}
