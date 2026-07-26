import { useEffect, useState } from "react";
import { ReportShell } from "@/components/reports/ReportShell";
import { ReportMetricCard } from "@/components/reports/ReportMetricCard";
import { ReportSkeleton } from "@/components/reports/ReportSkeleton";
import { ReportErrorState } from "@/components/reports/ReportErrorState";
import { useReportRange } from "@/hooks/useReportRange";
import { formatBRL } from "@/lib/format";
import { fetchAdminReturnsReport } from "@/lib/reports/api";
import { normalizeError, showAppError } from "@/lib/errors";
import type { ReturnsReportSummary } from "@/types/reports";

const ReturnsReport = () => {
  const { range, setRange, key } = useReportRange();
  const [data, setData] = useState<ReturnsReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; correlationId?: string } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchAdminReturnsReport({ start: range.start, end: range.end }));
    } catch (e) {
      const err = normalizeError(e, { operation: "reports.returns.summary" });
      setError({ message: err.userMessage, correlationId: err.correlationId });
      showAppError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [key]);

  return (
    <ReportShell
      title="Devoluções"
      description="Troca sem reembolso não reduz receita automaticamente. Valor financeiro só em resolution=devolucao."
      range={range}
      onRangeChange={setRange}
    >
      {loading && <ReportSkeleton />}
      {error && !loading && <ReportErrorState message={error.message} correlationId={error.correlationId} onRetry={() => void load()} />}
      {!loading && !error && data && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ReportMetricCard label="Devoluções" value={String(data.returns_count)} hint={`${data.items_count} itens`} />
          <ReportMetricCard label="Itens devolução" value={String(data.return_items)} />
          <ReportMetricCard label="Itens troca" value={String(data.exchange_items)} hint="não descontam receita" />
          <ReportMetricCard label="Valor financeiro" value={formatBRL(data.financial_returned_amount)} />
          <ReportMetricCard label="Retorno estoque" value={String(data.stock_restored_qty)} />
          <ReportMetricCard label="Não retorno" value={String(data.stock_discarded_qty)} />
        </div>
      )}
    </ReportShell>
  );
};

export default ReturnsReport;
