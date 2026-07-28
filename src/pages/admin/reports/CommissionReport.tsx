import { useEffect, useState } from "react";
import { ReportShell } from "@/components/reports/ReportShell";
import { ReportMetricCard } from "@/components/reports/ReportMetricCard";
import { ReportSkeleton } from "@/components/reports/ReportSkeleton";
import { ReportErrorState } from "@/components/reports/ReportErrorState";
import { SimpleBarChart } from "@/components/reports/SimpleCharts";
import { useReportRange } from "@/hooks/useReportRange";
import { formatBRL } from "@/lib/format";
import { fetchAdminCommissionReport } from "@/lib/reports/api";
import { normalizeError, showAppError } from "@/lib/errors";
import { formatRateAsPercent } from "@/lib/commissionSettings";
import {
  JEWELRY_MATERIAL_OPTIONS,
  jewelryMaterialLabel,
  type JewelryMaterial,
} from "@/lib/jewelryMaterial";
import type { CommissionReportItem } from "@/types/reports";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CommissionReport = () => {
  const { range, setRange, key } = useReportRange();
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [items, setItems] = useState<CommissionReportItem[]>([]);
  const [materialFilter, setMaterialFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; correlationId?: string } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminCommissionReport({
        start: range.start,
        end: range.end,
        jewelryMaterial: materialFilter === "all" ? null : materialFilter,
      });
      setSummary(res.summary);
      setItems((res.items ?? []) as CommissionReportItem[]);
    } catch (e) {
      const err = normalizeError(e, { operation: "reports.commissions.summary" });
      setError({ message: err.userMessage, correlationId: err.correlationId });
      showAppError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [key, materialFilter]);

  return (
    <ReportShell
      title="Comissões"
      description="Linhas por item (novas) e por pedido (legado). Canceladas/estornadas não entram como disponíveis."
      range={range}
      onRangeChange={setRange}
      actions={(
        <Select value={materialFilter} onValueChange={setMaterialFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Tipo da joia" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {JEWELRY_MATERIAL_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    >
      {loading && <ReportSkeleton />}
      {error && !loading && <ReportErrorState message={error.message} correlationId={error.correlationId} onRetry={() => void load()} />}
      {!loading && !error && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ReportMetricCard label="Pending" value={formatBRL(summary.pending ?? 0)} />
            <ReportMetricCard label="Available" value={formatBRL(summary.available ?? 0)} />
            <ReportMetricCard label="Paid" value={formatBRL(summary.paid ?? 0)} />
            <ReportMetricCard
              label="Cancelled / estornada"
              value={formatBRL(summary.cancelled ?? 0)}
              hint="schema atual não tem status reversed — estornos = cancelled"
            />
          </div>
          <SimpleBarChart
            title="Comissões por status"
            points={["pending", "available", "paid", "cancelled"].map((k) => ({
              label: k,
              value: Number(summary[k] ?? 0),
            }))}
          />

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Modo</th>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 font-medium">Nível</th>
                  <th className="px-3 py-2 font-medium">Taxa</th>
                  <th className="px-3 py-2 font-medium">Base</th>
                  <th className="px-3 py-2 font-medium">Valor</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                      Nenhuma comissão no período.
                    </td>
                  </tr>
                ) : (
                  items.map((row) => {
                    const rate = Number(row.percentage_applied ?? row.rate ?? 0);
                    return (
                      <tr key={row.id} className="border-b border-border/60">
                        <td className="px-3 py-2">
                          {row.commission_mode === "per_item" || row.order_item_id
                            ? "Por item"
                            : "Legado (pedido)"}
                        </td>
                        <td className="px-3 py-2">
                          {jewelryMaterialLabel(row.jewelry_material as JewelryMaterial | null)}
                        </td>
                        <td className="px-3 py-2">{row.level}</td>
                        <td className="px-3 py-2">{formatRateAsPercent(rate)}</td>
                        <td className="px-3 py-2">
                          {row.base_amount != null ? formatBRL(Number(row.base_amount)) : "—"}
                        </td>
                        <td className="px-3 py-2">{formatBRL(Number(row.amount ?? 0))}</td>
                        <td className="px-3 py-2">{row.status}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ReportShell>
  );
};

export default CommissionReport;
