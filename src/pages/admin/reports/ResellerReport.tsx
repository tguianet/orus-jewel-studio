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
import { fetchAdminResellerPerformance } from "@/lib/reports/api";
import { normalizeError, showAppError } from "@/lib/errors";
import type { ResellerPerformance } from "@/types/reports";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";

const ResellerReport = () => {
  const { range, setRange, key } = useReportRange();
  const [items, setItems] = useState<ResellerPerformance[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; correlationId?: string } | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminResellerPerformance({
        start: range.start,
        end: range.end,
        page,
        pageSize: DEFAULT_PAGE_SIZE,
        search: debounced,
      });
      setItems(res.items);
      setTotal(res.totalCount);
    } catch (e) {
      const err = normalizeError(e, { operation: "reports.resellers.list" });
      setError({ message: err.userMessage, correlationId: err.correlationId });
      showAppError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, page, debounced]);

  return (
    <ReportShell
      title="Sacoleiras"
      description="Performance por loja — sem dados bancários ou PII desnecessária."
      range={range}
      onRangeChange={(r) => { setPage(1); setRange(r); }}
    >
      <div className="mb-4">
        <ReportFilters search={search} onSearchChange={(v) => { setPage(1); setSearch(v); }} />
      </div>
      {loading && <ReportSkeleton cards={2} />}
      {error && !loading && <ReportErrorState message={error.message} correlationId={error.correlationId} onRetry={() => void load()} />}
      {!loading && !error && items.length === 0 && <ReportEmptyState />}
      {!loading && !error && items.length > 0 && (
        <>
          <ReportTable
            rows={items}
            rowKey={(r) => r.reseller_id}
            columns={[
              { key: "rank", header: "#", render: (r) => r.ranking ?? "—" },
              { key: "store", header: "Loja", render: (r) => r.store_name },
              { key: "name", header: "Sacoleira", render: (r) => r.reseller_name },
              { key: "paid", header: "Pedidos pagos", render: (r) => r.paid_orders },
              { key: "gross", header: "Bruto", render: (r) => formatBRL(r.gross_revenue) },
              { key: "net", header: "Líquido", render: (r) => formatBRL(r.net_revenue) },
              { key: "ticket", header: "Ticket", render: (r) => formatBRL(r.average_ticket) },
              { key: "comm", header: "Comissão gerada", render: (r) => formatBRL(r.commission_generated) },
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

export default ResellerReport;
