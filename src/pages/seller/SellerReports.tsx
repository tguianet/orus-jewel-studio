import { useEffect, useState } from "react";
import { SellerLayout } from "@/layouts/SellerLayout";
import { PageHeader } from "@/components/PageHeader";
import { ReportDateRangePicker } from "@/components/reports/ReportDateRangePicker";
import { ReportMetricCard } from "@/components/reports/ReportMetricCard";
import { ReportSkeleton } from "@/components/reports/ReportSkeleton";
import { ReportErrorState } from "@/components/reports/ReportErrorState";
import { SimpleLineChart } from "@/components/reports/SimpleCharts";
import { ExportCsvButton } from "@/components/reports/ExportCsvButton";
import { ReportPrintButton } from "@/components/reports/ReportPrintButton";
import { useReportRange } from "@/hooks/useReportRange";
import { formatBRL } from "@/lib/format";
import {
  exportSellerReport,
  fetchSellerCommissionSummary,
  fetchSellerSalesSummary,
  fetchSellerTimeseries,
} from "@/lib/reports/api";
import { normalizeError, showAppError } from "@/lib/errors";
import type { SalesSummary, SalesTimeseriesPoint, SellerCommissionSummary, ReportExportRow } from "@/types/reports";

const SellerReports = () => {
  const { range, setRange, key } = useReportRange("last_30_days");
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [commission, setCommission] = useState<SellerCommissionSummary | null>(null);
  const [series, setSeries] = useState<SalesTimeseriesPoint[]>([]);
  const [exportRows, setExportRows] = useState<ReportExportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; correlationId?: string } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, c, ts, rows] = await Promise.all([
        fetchSellerSalesSummary(range.start, range.end),
        fetchSellerCommissionSummary(range.start, range.end),
        fetchSellerTimeseries(range.start, range.end),
        exportSellerReport("sales_orders", { start: range.start, end: range.end }),
      ]);
      setSummary(s);
      setCommission(c);
      setSeries(ts);
      setExportRows(rows);
    } catch (e) {
      const err = normalizeError(e, { operation: "reports.seller.summary" });
      setError({ message: err.userMessage, correlationId: err.correlationId });
      showAppError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [key]);

  return (
    <SellerLayout>
      <div className="print:hidden">
        <PageHeader
          eyebrow="Relatórios"
          title="Meus resultados"
          description="Somente dados da sua loja. Sem custos nem margens da empresa."
          actions={
            <div className="flex gap-2">
              <ExportCsvButton slug="sacoleira-vendas" rows={exportRows} />
              <ReportPrintButton />
            </div>
          }
        />
        <div className="mb-6">
          <ReportDateRangePicker value={range} onChange={setRange} />
        </div>
      </div>

      {loading && <ReportSkeleton />}
      {error && !loading && (
        <ReportErrorState message={error.message} correlationId={error.correlationId} onRetry={() => void load()} />
      )}
      {!loading && !error && summary && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ReportMetricCard label="Vendas (bruto)" value={formatBRL(summary.gross_revenue)} />
            <ReportMetricCard label="Receita líquida" value={formatBRL(summary.net_revenue)} />
            <ReportMetricCard label="Pedidos pagos" value={String(summary.paid_orders_count)} />
            <ReportMetricCard label="Ticket médio" value={formatBRL(summary.average_ticket)} hint="líquido ÷ pagos" />
          </div>
          {commission && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ReportMetricCard label="Comissão gerada" value={formatBRL(commission.generated)} />
              <ReportMetricCard label="Disponível" value={formatBRL(commission.available)} />
              <ReportMetricCard label="Paga" value={formatBRL(commission.paid)} />
              <ReportMetricCard label="Bloqueada (saques)" value={formatBRL(commission.blocked)} />
            </div>
          )}
          <SimpleLineChart
            title="Vendas da minha loja"
            points={series.map((p) => ({ label: p.label, value: Number(p.gross_revenue) }))}
          />
          <p className="text-xs text-muted-foreground">
            Este painel não exibe custo de produto, margem da empresa nem dados de outras sacoleiras.
          </p>
        </div>
      )}
    </SellerLayout>
  );
};

export default SellerReports;
