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

const CommissionReport = () => {
  const { range, setRange, key } = useReportRange();
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; correlationId?: string } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminCommissionReport({ start: range.start, end: range.end });
      setSummary(res.summary);
    } catch (e) {
      const err = normalizeError(e, { operation: "reports.commissions.summary" });
      setError({ message: err.userMessage, correlationId: err.correlationId });
      showAppError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [key]);

  return (
    <ReportShell
      title="Comissões"
      description="Separação por status. Canceladas/estornadas não entram como disponíveis."
      range={range}
      onRangeChange={setRange}
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
        </div>
      )}
    </ReportShell>
  );
};

export default CommissionReport;
