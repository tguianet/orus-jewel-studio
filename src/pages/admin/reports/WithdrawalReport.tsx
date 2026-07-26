import { useEffect, useState } from "react";
import { ReportShell } from "@/components/reports/ReportShell";
import { ReportMetricCard } from "@/components/reports/ReportMetricCard";
import { ReportSkeleton } from "@/components/reports/ReportSkeleton";
import { ReportErrorState } from "@/components/reports/ReportErrorState";
import { SimpleBarChart } from "@/components/reports/SimpleCharts";
import { useReportRange } from "@/hooks/useReportRange";
import { formatBRL } from "@/lib/format";
import { fetchAdminWithdrawalReport } from "@/lib/reports/api";
import { normalizeError, showAppError } from "@/lib/errors";
import type { WithdrawalReportSummary } from "@/types/reports";

const WithdrawalReport = () => {
  const { range, setRange, key } = useReportRange();
  const [data, setData] = useState<WithdrawalReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; correlationId?: string } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchAdminWithdrawalReport({ start: range.start, end: range.end }));
    } catch (e) {
      const err = normalizeError(e, { operation: "reports.withdrawals.summary" });
      setError({ message: err.userMessage, correlationId: err.correlationId });
      showAppError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [key]);

  return (
    <ReportShell
      title="Saques"
      description="Solicitado, aprovado, pago, rejeitado, cancelado e saldo bloqueado. Sem dados bancários."
      range={range}
      onRangeChange={setRange}
    >
      {loading && <ReportSkeleton />}
      {error && !loading && <ReportErrorState message={error.message} correlationId={error.correlationId} onRetry={() => void load()} />}
      {!loading && !error && data?.available === false && (
        <ReportErrorState message={data.message || "Módulo de saques ainda não aplicado no Cloud."} />
      )}
      {!loading && !error && data?.available !== false && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ReportMetricCard label="Solicitado" value={formatBRL(data?.requested_amount ?? 0)} hint={`${data?.requested_count ?? 0} saques`} />
            <ReportMetricCard label="Pago" value={formatBRL(data?.paid_amount ?? 0)} hint={`${data?.paid_count ?? 0} pagos`} />
            <ReportMetricCard label="Bloqueado" value={formatBRL(data?.blocked_balance ?? 0)} hint="pending + approved" />
            <ReportMetricCard
              label="Tempo médio"
              value={`${Number(data?.avg_processing_hours ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`}
              hint="até pagamento"
            />
          </div>
          <SimpleBarChart
            title="Saques por status (valor)"
            points={[
              { label: "pending", value: Number(data?.pending_amount ?? 0) },
              { label: "approved", value: Number(data?.approved_amount ?? 0) },
              { label: "paid", value: Number(data?.paid_amount ?? 0) },
              { label: "rejected", value: Number(data?.rejected_amount ?? 0) },
              { label: "cancelled", value: Number(data?.cancelled_amount ?? 0) },
            ]}
          />
        </div>
      )}
    </ReportShell>
  );
};

export default WithdrawalReport;
