import type { ReportDateRange, ReportPreset } from "@/types/reports";
import { REPORT_PRESET_LABELS, resolveReportRange } from "@/lib/reports/periods";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const PRESETS: ReportPreset[] = [
  "today",
  "yesterday",
  "last_7_days",
  "last_30_days",
  "current_month",
  "previous_month",
  "current_quarter",
  "current_year",
  "custom",
];

type Props = {
  value: ReportDateRange;
  onChange: (next: ReportDateRange) => void;
};

export function ReportDateRangePicker({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="space-y-1.5">
        <Label htmlFor="report-preset">Período</Label>
        <select
          id="report-preset"
          className="flex h-10 w-full min-w-[180px] rounded-md border border-input bg-background px-3 text-sm"
          value={value.preset}
          onChange={(e) => onChange(resolveReportRange(e.target.value as ReportPreset))}
        >
          {PRESETS.map((p) => (
            <option key={p} value={p}>{REPORT_PRESET_LABELS[p]}</option>
          ))}
        </select>
      </div>
      {value.preset === "custom" && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="report-start">De</Label>
            <Input
              id="report-start"
              type="date"
              value={toInputDate(value.start)}
              onChange={(e) => {
                const start = new Date(`${e.target.value}T00:00:00`);
                onChange(resolveReportRange("custom", { start, end: value.end }));
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-end">Até</Label>
            <Input
              id="report-end"
              type="date"
              value={toInputDate(new Date(value.end.getTime() - 1))}
              onChange={(e) => {
                const end = new Date(`${e.target.value}T00:00:00`);
                onChange(resolveReportRange("custom", { start: value.start, end }));
              }}
            />
          </div>
        </>
      )}
      <p className="text-xs text-muted-foreground sm:pb-2">
        Intervalo: {value.start.toLocaleDateString("pt-BR")} →{" "}
        {new Date(value.end.getTime() - 1).toLocaleDateString("pt-BR")}
        {" · "}fuso negócio America/Sao_Paulo no banco
      </p>
    </div>
  );
}

function toInputDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
