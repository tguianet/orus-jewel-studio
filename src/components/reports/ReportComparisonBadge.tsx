import { formatPercentChange } from "@/lib/reports/metrics";
import { cn } from "@/lib/utils";

export function ReportComparisonBadge({ value }: { value: number | null | undefined }) {
  const label = formatPercentChange(value);
  const tone =
    value == null ? "text-muted-foreground"
    : value > 0 ? "text-success"
    : value < 0 ? "text-destructive"
    : "text-muted-foreground";

  return (
    <span
      className={cn("text-xs font-medium tabular-nums", tone)}
      title="vs período anterior equivalente"
      aria-label={`Variação ${label} em relação ao período anterior`}
    >
      {label}
    </span>
  );
}
