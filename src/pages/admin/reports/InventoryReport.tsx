import { useEffect, useState } from "react";
import { ReportShell } from "@/components/reports/ReportShell";
import { ReportSkeleton } from "@/components/reports/ReportSkeleton";
import { ReportErrorState } from "@/components/reports/ReportErrorState";
import { ReportTable } from "@/components/reports/ReportTable";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { ReportEmptyState } from "@/components/reports/ReportEmptyState";
import { ListPagination } from "@/components/system/ListPagination";
import { useReportRange } from "@/hooks/useReportRange";
import { formatBRL } from "@/lib/format";
import { fetchAdminInventoryReport } from "@/lib/reports/api";
import { staleRecommendation, stockStatusLabel } from "@/lib/reports/metrics";
import { normalizeError, showAppError } from "@/lib/errors";
import type { InventoryReportItem } from "@/types/reports";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { Label } from "@/components/ui/label";

const InventoryReport = () => {
  const { range, setRange } = useReportRange();
  const [items, setItems] = useState<InventoryReportItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [staleDays, setStaleDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; correlationId?: string } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminInventoryReport({
        page,
        staleDays,
        status: status || null,
      });
      setItems(res.items);
      setTotal(res.totalCount);
    } catch (e) {
      const err = normalizeError(e, { operation: "reports.inventory.list" });
      setError({ message: err.userMessage, correlationId: err.correlationId });
      showAppError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [page, status, staleDays]);

  return (
    <ReportShell
      title="Estoque"
      description="Disponível = stock atual (reserva já debita). Custo e valor imobilizado só no admin."
      range={range}
      onRangeChange={setRange}
    >
      <div className="mb-4 flex flex-wrap gap-3 items-end">
        <ReportFilters
          status={status}
          onStatusChange={(v) => { setPage(1); setStatus(v); }}
          statusOptions={[
            { value: "normal", label: "Normal" },
            { value: "baixo", label: "Baixo" },
            { value: "critico", label: "Crítico" },
            { value: "sem_estoque", label: "Sem estoque" },
            { value: "parado", label: "Parado" },
          ]}
          extra={
            <div className="space-y-1.5">
              <Label htmlFor="stale">Parado após (dias)</Label>
              <select
                id="stale"
                className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={staleDays}
                onChange={(e) => { setPage(1); setStaleDays(Number(e.target.value)); }}
              >
                <option value={30}>30</option>
                <option value={60}>60</option>
                <option value={90}>90</option>
              </select>
            </div>
          }
        />
      </div>
      {loading && <ReportSkeleton />}
      {error && !loading && <ReportErrorState message={error.message} correlationId={error.correlationId} onRetry={() => void load()} />}
      {!loading && !error && items.length === 0 && <ReportEmptyState />}
      {!loading && !error && items.length > 0 && (
        <>
          <ReportTable
            rows={items}
            rowKey={(r) => r.product_id}
            columns={[
              { key: "code", header: "Código", render: (r) => r.code },
              { key: "name", header: "Produto", render: (r) => r.name },
              { key: "stock", header: "Estoque", render: (r) => r.stock },
              { key: "reserved", header: "Reservado", render: (r) => r.reserved_stock },
              { key: "cost", header: "Custo", render: (r) => (r.cost_informed ? formatBRL(Number(r.cost_price)) : "custo não informado") },
              { key: "imm", header: "Imobilizado", render: (r) => (r.immobilized_value == null ? "—" : formatBRL(r.immobilized_value)) },
              { key: "days", header: "Dias parado", render: (r) => (r.days_without_sale >= 99999 ? "nunca" : r.days_without_sale) },
              { key: "st", header: "Status", render: (r) => stockStatusLabel(r.stock_status) },
              { key: "rec", header: "Recomendação", render: (r) => staleRecommendation(r.days_without_sale >= 99999 ? 999 : r.days_without_sale, r.stock) },
            ]}
          />
          <div className="mt-4">
            <ListPagination page={page} total={total} pageSize={DEFAULT_PAGE_SIZE} onPageChange={setPage} />
          </div>
        </>
      )}
    </ReportShell>
  );
};

export default InventoryReport;
