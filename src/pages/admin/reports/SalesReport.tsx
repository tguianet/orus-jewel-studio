import { useEffect, useState } from "react";
import { ReportShell } from "@/components/reports/ReportShell";
import { ReportMetricCard } from "@/components/reports/ReportMetricCard";
import { ReportSkeleton } from "@/components/reports/ReportSkeleton";
import { ReportErrorState } from "@/components/reports/ReportErrorState";
import { ReportEmptyState } from "@/components/reports/ReportEmptyState";
import { SimpleBarChart, SimpleLineChart } from "@/components/reports/SimpleCharts";
import { ExportCsvButton } from "@/components/reports/ExportCsvButton";
import { useReportRange } from "@/hooks/useReportRange";
import { formatBRL } from "@/lib/format";
import {
  exportAdminReport,
  fetchAdminOrderStatus,
  fetchAdminSalesSummary,
  fetchAdminSalesTimeseries,
} from "@/lib/reports/api";
import { normalizeError, showAppError } from "@/lib/errors";
import { withRetry } from "@/lib/errors/retryPolicy";
import type { OrderStatusSummary, SalesSummary, SalesTimeseriesPoint, ReportExportRow } from "@/types/reports";

const SalesReport = () => {
  const { range, setRange, key } = useReportRange("current_month");
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [series, setSeries] = useState<SalesTimeseriesPoint[]>([]);
  const [statuses, setStatuses] = useState<OrderStatusSummary[]>([]);
  const [exportRows, setExportRows] = useState<ReportExportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; correlationId?: string } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, ts, st] = await withRetry(
        "reports.sales.summary",
        async () => Promise.all([
          fetchAdminSalesSummary({ start: range.start, end: range.end }),
          fetchAdminSalesTimeseries({ start: range.start, end: range.end, granularity: "day" }),
          fetchAdminOrderStatus({ start: range.start, end: range.end }),
        ]),
        { maxAttempts: 3, isIdempotentRead: true },
      );
      setSummary(s);
      setSeries(ts);
      setStatuses(st);
      const rows = await exportAdminReport("sales_orders", { start: range.start, end: range.end });
      setExportRows(rows);
    } catch (e) {
      const err = normalizeError(e, { operation: "reports.sales.summary" });
      setError({ message: err.userMessage, correlationId: err.correlationId });
      showAppError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <ReportShell
      title="Vendas"
      description="Faturamento bruto, receita líquida operacional e status — agregados no banco."
      range={range}
      onRangeChange={setRange}
      actions={<ExportCsvButton slug="vendas" rows={exportRows} />}
    >
      {loading && <ReportSkeleton />}
      {error && !loading && (
        <ReportErrorState message={error.message} correlationId={error.correlationId} onRetry={() => void load()} />
      )}
      {!loading && !error && summary && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ReportMetricCard
              label="Faturamento bruto"
              value={formatBRL(summary.gross_revenue)}
              hint="pedidos paid/separated/shipped/delivered"
              comparison={summary.comparison_percentages?.gross_revenue}
            />
            <ReportMetricCard
              label="Receita líquida"
              value={formatBRL(summary.net_revenue)}
              hint="bruto − reembolsos − devoluções financeiras"
              comparison={summary.comparison_percentages?.net_revenue}
            />
            <ReportMetricCard
              label="Pedidos pagos"
              value={String(summary.paid_orders_count)}
              comparison={summary.comparison_percentages?.paid_orders_count}
            />
            <ReportMetricCard
              label="Ticket médio"
              value={formatBRL(summary.average_ticket)}
              hint="base: receita líquida ÷ pedidos pagos"
              comparison={summary.comparison_percentages?.average_ticket}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ReportMetricCard label="Pendentes" value={String(summary.pending_orders_count)} hint="não entram no faturamento" />
            <ReportMetricCard label="Cancelados" value={String(summary.cancelled_orders_count ?? 0)} hint={formatBRL(summary.cancelled_amount ?? 0)} />
            <ReportMetricCard label="Reembolsados" value={String(summary.refunded_orders_count ?? 0)} hint={formatBRL(summary.refunded_amount ?? 0)} />
            <ReportMetricCard label="Devoluções (R$)" value={formatBRL(summary.returns_amount ?? 0)} hint="somente resolution=devolucao" />
          </div>

          {series.every((p) => p.gross_revenue === 0) ? (
            <ReportEmptyState />
          ) : (
            <SimpleLineChart
              title="Vendas no período"
              points={series.map((p) => ({ label: p.label, value: Number(p.gross_revenue) }))}
            />
          )}
          <SimpleBarChart
            title="Valores por status"
            points={statuses.map((s) => ({ label: s.status, value: Number(s.amount) }))}
          />
        </div>
      )}
    </ReportShell>
  );
};

export default SalesReport;
