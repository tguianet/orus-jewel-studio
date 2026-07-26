import { useEffect, useState } from "react";
import { ReportShell } from "@/components/reports/ReportShell";
import { ReportSkeleton } from "@/components/reports/ReportSkeleton";
import { ReportErrorState } from "@/components/reports/ReportErrorState";
import { ReportEmptyState } from "@/components/reports/ReportEmptyState";
import { ReportTable } from "@/components/reports/ReportTable";
import { useReportRange } from "@/hooks/useReportRange";
import { formatBRL } from "@/lib/format";
import { fetchAdminWalletReport } from "@/lib/reports/api";
import { normalizeError, showAppError } from "@/lib/errors";
import type { WalletReportItem } from "@/types/reports";

const WalletReport = () => {
  const { range, setRange, key } = useReportRange();
  const [items, setItems] = useState<WalletReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; correlationId?: string } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminWalletReport({ start: range.start, end: range.end });
      setItems((res.items ?? []) as WalletReportItem[]);
    } catch (e) {
      const err = normalizeError(e, { operation: "reports.wallet.list" });
      setError({ message: err.userMessage, correlationId: err.correlationId });
      showAppError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [key]);

  return (
    <ReportShell
      title="Carteira"
      description="Movimentações da carteira. Não é fonte paralela de saldo — consulta wallet_transactions."
      range={range}
      onRangeChange={setRange}
    >
      {loading && <ReportSkeleton />}
      {error && !loading && <ReportErrorState message={error.message} correlationId={error.correlationId} onRetry={() => void load()} />}
      {!loading && !error && items.length === 0 && <ReportEmptyState />}
      {!loading && !error && items.length > 0 && (
        <ReportTable
          rows={items}
          rowKey={(r) => r.id}
          columns={[
            { key: "date", header: "Data", render: (r) => new Date(r.created_at).toLocaleString("pt-BR") },
            { key: "type", header: "Tipo", render: (r) => r.type },
            { key: "status", header: "Status", render: (r) => r.status },
            { key: "amount", header: "Valor", render: (r) => formatBRL(r.amount) },
            { key: "reseller", header: "Reseller", render: (r) => r.reseller_id.slice(0, 8) },
          ]}
        />
      )}
    </ReportShell>
  );
};

export default WalletReport;
