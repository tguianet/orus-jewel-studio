import { ReportComparisonBadge } from "./ReportComparisonBadge";

type Props = {
  label: string;
  value: string;
  hint?: string;
  comparison?: number | null;
};

export function ReportMetricCard({ label, value, hint, comparison }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
        {comparison !== undefined && <ReportComparisonBadge value={comparison} />}
      </div>
      <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
