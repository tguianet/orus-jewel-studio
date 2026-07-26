import { useEffect, useState } from "react";
import { ReportShell } from "@/components/reports/ReportShell";
import { ReportMetricCard } from "@/components/reports/ReportMetricCard";
import { ReportSkeleton } from "@/components/reports/ReportSkeleton";
import { ReportErrorState } from "@/components/reports/ReportErrorState";
import { useReportRange } from "@/hooks/useReportRange";
import { formatBRL } from "@/lib/format";
import { fetchAdminExpiredOrders } from "@/lib/reports/api";
import { normalizeError, showAppError } from "@/lib/errors";
import type { ExpiredOrdersSummary } from "@/types/reports";

const ExpiredOrdersReport = () => {
  const { range, setRange, key } = useReportRange();
  const [data, setData] = useState<ExpiredOrdersSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; correlationId?: string } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchAdminExpiredOrders({ start: range.start, end: range.end }));
    } catch (e) {
      const err = normalizeError(e, { operation: "reports.expired.summary" });
      setError({ message: err.userMessage, correlationId: err.correlationId });
      showAppError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [key]);

  return (
    <ReportShell
      title="Pedidos expirados"
      description="Abandonos de checkout/reserva. Separados de cancelamentos manuais."
      range={range}
      onRangeChange={setRange}
    >
      {loading && <ReportSkeleton />}
      {error && !loading && <ReportErrorState message={error.message} correlationId={error.correlationId} onRetry={() => void load()} />}
      {!loading && !error && data && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ReportMetricCard label="Expirados" value={String(data.expired_count)} />
          <ReportMetricCard label="Valor abandonado" value={formatBRL(data.abandoned_amount)} />
          <ReportMetricCard
            label="Tempo médio até expirar"
            value={`${Number(data.avg_hours_to_expiry).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`}
          />
          <ReportMetricCard label="Unidades liberadas" value={String(data.units_released)} />
          <ReportMetricCard
            label="Taxa abandono checkout"
            value={data.abandonment_rate_pct == null ? "—" : `${data.abandonment_rate_pct}%`}
            hint={data.checkout_orders_base ? `base ${data.checkout_orders_base} pedidos loja_online` : "base insuficiente"}
          />
        </div>
      )}
    </ReportShell>
  );
};

export default ExpiredOrdersReport;
