import { useEffect, useState } from "react";
import { ReportShell } from "@/components/reports/ReportShell";
import { ReportSkeleton } from "@/components/reports/ReportSkeleton";
import { ReportErrorState } from "@/components/reports/ReportErrorState";
import { ReportTable } from "@/components/reports/ReportTable";
import { ReportEmptyState } from "@/components/reports/ReportEmptyState";
import { SimpleBarChart } from "@/components/reports/SimpleCharts";
import { useReportRange } from "@/hooks/useReportRange";
import { formatBRL } from "@/lib/format";
import { fetchAdminTopProducts } from "@/lib/reports/api";
import { normalizeError, showAppError } from "@/lib/errors";
import type { ProductPerformance } from "@/types/reports";
import { Label } from "@/components/ui/label";

const ProductsReport = () => {
  const { range, setRange, key } = useReportRange();
  const [items, setItems] = useState<ProductPerformance[]>([]);
  const [metric, setMetric] = useState("quantity");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; correlationId?: string } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchAdminTopProducts({ start: range.start, end: range.end, metric }));
    } catch (e) {
      const err = normalizeError(e, { operation: "reports.products.top" });
      setError({ message: err.userMessage, correlationId: err.correlationId });
      showAppError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [key, metric]);

  return (
    <ReportShell
      title="Produtos"
      description="Ranking e margem estimada (admin). Frete/impostos podem não estar incluídos."
      range={range}
      onRangeChange={setRange}
    >
      <div className="mb-4 space-y-1.5 w-56">
        <Label htmlFor="metric">Métrica</Label>
        <select
          id="metric"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
        >
          <option value="quantity">Quantidade vendida</option>
          <option value="revenue">Faturamento</option>
          <option value="net_revenue">Receita líquida</option>
          <option value="returns">Devoluções</option>
          <option value="estimated_margin">Margem estimada</option>
          <option value="turnover">Giro</option>
        </select>
      </div>
      {loading && <ReportSkeleton />}
      {error && !loading && <ReportErrorState message={error.message} correlationId={error.correlationId} onRetry={() => void load()} />}
      {!loading && !error && items.length === 0 && <ReportEmptyState />}
      {!loading && !error && items.length > 0 && (
        <div className="space-y-6">
          <SimpleBarChart
            title="Top produtos"
            points={items.slice(0, 10).map((p) => ({
              label: p.product_name?.slice(0, 18) || p.product_id.slice(0, 8),
              value: metric === "quantity" ? p.quantity_sold : Number(p.gross_revenue),
            }))}
          />
          <ReportTable
            rows={items}
            rowKey={(r) => r.product_id}
            columns={[
              { key: "name", header: "Produto", render: (r) => r.product_name },
              { key: "qty", header: "Qtd", render: (r) => r.quantity_sold },
              { key: "gross", header: "Bruto", render: (r) => formatBRL(r.gross_revenue) },
              { key: "net", header: "Líquido", render: (r) => formatBRL(r.net_revenue) },
              {
                key: "margin",
                header: "Margem est.",
                render: (r) => (r.estimated_margin == null ? "custo não informado" : formatBRL(r.estimated_margin)),
              },
              {
                key: "pct",
                header: "%",
                render: (r) => (r.estimated_margin_pct == null ? "—" : `${r.estimated_margin_pct}%`),
              },
            ]}
          />
          <p className="text-xs text-muted-foreground">
            Margem estimada = receita líquida − (quantidade × cost_price). Não inclui frete, impostos nem despesas operacionais.
          </p>
        </div>
      )}
    </ReportShell>
  );
};

export default ProductsReport;
