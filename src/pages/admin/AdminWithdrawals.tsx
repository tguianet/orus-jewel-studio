import { useCallback, useEffect, useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { ListPagination } from "@/components/system/ListPagination";
import { WithdrawalFilters, type WithdrawalFilterState } from "@/components/withdrawals/WithdrawalFilters";
import { WithdrawalStatusBadge } from "@/components/withdrawals/WithdrawalStatusBadge";
import { AdminWithdrawalDetails } from "@/components/withdrawals/AdminWithdrawalDetails";
import { formatBRL } from "@/lib/format";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { adminListWithdrawals, friendlyWithdrawalError } from "@/lib/withdrawals";
import type { AdminWithdrawalListItem, AdminWithdrawalStats } from "@/types/withdrawals";
import { toast } from "sonner";

const emptyFilters = (): WithdrawalFilterState => ({
  status: "",
  search: "",
  dateFrom: "",
  dateTo: "",
  amountMin: "",
  amountMax: "",
});

const AdminWithdrawals = () => {
  const [filters, setFilters] = useState<WithdrawalFilterState>(emptyFilters);
  const [applied, setApplied] = useState<WithdrawalFilterState>(emptyFilters);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminWithdrawalListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<AdminWithdrawalStats>({
    pending_count: 0,
    approved_count: 0,
    paid_count_period: 0,
    pending_amount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminListWithdrawals({
      status: applied.status || undefined,
      search: applied.search || undefined,
      dateFrom: applied.dateFrom ? new Date(applied.dateFrom).toISOString() : undefined,
      dateTo: applied.dateTo ? new Date(`${applied.dateTo}T23:59:59`).toISOString() : undefined,
      amountMin: applied.amountMin ? Number(applied.amountMin) : undefined,
      amountMax: applied.amountMax ? Number(applied.amountMax) : undefined,
      page,
      pageSize: DEFAULT_PAGE_SIZE,
    })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
        setStats(res.stats);
      })
      .catch((e: unknown) => {
        toast.error("Falha ao listar saques", {
          description: friendlyWithdrawalError(e instanceof Error ? e.message : String(e)),
        });
      })
      .finally(() => setLoading(false));
  }, [applied, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AdminLayout>
      <PageHeader
        eyebrow="Financeiro"
        title="Saques"
        description="Aprove, rejeite e registre pagamentos das solicitações das sacoleiras."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Pendentes" value={String(stats.pending_count)} icon={Wallet} />
        <StatCard label="Aprovados" value={String(stats.approved_count)} icon={Wallet} />
        <StatCard label="Pagos no período" value={String(stats.paid_count_period)} icon={Wallet} />
        <StatCard label="Valor em aberto" value={formatBRL(stats.pending_amount)} icon={Wallet} />
      </div>

      <WithdrawalFilters value={filters} onChange={setFilters} />
      <div className="flex gap-2 mb-6">
        <Button
          variant="gold"
          onClick={() => {
            setPage(1);
            setApplied({ ...filters });
          }}
        >
          Aplicar filtros
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            const empty = emptyFilters();
            setFilters(empty);
            setApplied(empty);
            setPage(1);
          }}
        >
          Limpar
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="px-5 py-10 text-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin inline mr-2" />Carregando…
          </div>
        ) : items.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">Nenhum saque encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Sacoleira</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Método</th>
                  <th className="px-4 py-3">Solicitado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((w) => (
                  <tr key={w.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{w.reseller_name}</p>
                      <p className="text-xs text-muted-foreground">{w.reseller_email}</p>
                    </td>
                    <td className="px-4 py-3">{formatBRL(w.amount)}</td>
                    <td className="px-4 py-3"><WithdrawalStatusBadge status={w.status} /></td>
                    <td className="px-4 py-3">{w.payment_method === "pix" ? "PIX" : "TED"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(w.requested_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setDetailId(w.id);
                          setDetailOpen(true);
                        }}
                      >
                        Detalhes
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <ListPagination
          page={page}
          total={total}
          pageSize={DEFAULT_PAGE_SIZE}
          onPageChange={setPage}
          disabled={loading}
        />
      </div>

      <AdminWithdrawalDetails
        withdrawalId={detailId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onChanged={load}
      />
    </AdminLayout>
  );
};

export default AdminWithdrawals;
