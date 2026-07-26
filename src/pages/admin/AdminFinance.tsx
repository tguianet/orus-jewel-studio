import { useEffect, useMemo, useState } from "react";
import { DollarSign, TrendingUp, CreditCard, Clock, Loader2 } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ListPagination } from "@/components/system/ListPagination";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { statusColors } from "@/lib/orderStatus";
import { toast } from "sonner";

function toastError(e: unknown) {
  toast.error("Falha ao carregar histórico", {
    description: e instanceof Error ? e.message : "Erro desconhecido.",
  });
}

type ResellerRow = {
  id: string;
  display_name: string;
  email: string;
  tier: string;
  status: string;
  store_name: string | null;
  pending: number;
  available: number;
  paid: number;
  total: number;
  sales: number;
  referrals: number;
  ordersCount: number;
  directReferrals: number;
  networkSize: number;
};

type CommissionRow = {
  id: string;
  order_id: string;
  amount: number;
  rate: number;
  level: number;
  status: string;
  reseller_id: string;
  resellerName: string;
};

type WalletLedgerRow = {
  id: string;
  type: string;
  amount: number;
  status: string;
  description: string;
  reason: string | null;
  created_at: string;
  commission_id: string | null;
  reseller_id: string;
  resellerName: string;
  order_id: string | null;
};

type WalletSummaryRow = {
  reseller_id: string | null;
  pending: number | null;
  available: number | null;
  paid: number | null;
  total_balance: number | null;
};

type ResellerQueryRow = {
  id: string;
  display_name: string;
  email: string;
  tier: string;
  status: string;
  parent_id: string | null;
  seller_stores: { id: string; store_name: string }[] | null;
};

type CommissionQueryRow = {
  id: string;
  order_id: string;
  amount: number;
  rate: number;
  level: number;
  status: string;
  reseller_id: string;
};

type OrderQueryRow = {
  id: string;
  total: number;
  status: string;
  seller_store_id: string;
  seller_stores: { reseller_id: string | null } | null;
};

const statusLabel = (s: string) =>
  s === "available" ? "Disponível"
    : s === "pending" ? "Pendente"
      : s === "paid" ? "Pago"
        : s === "cancelled" ? "Cancelado"
          : s;

const typeLabel = (t: string) =>
  t === "commission_reversal" ? "Estorno"
    : t === "commission" ? "Comissão"
      : t === "withdrawal" ? "Saque"
        : t === "adjustment" ? "Ajuste"
          : t;

const AdminFinance = () => {
  const [loading, setLoading] = useState(true);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resellers, setResellers] = useState<ResellerRow[]>([]);
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [ledger, setLedger] = useState<WalletLedgerRow[]>([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [reversalDebitsTotal, setReversalDebitsTotal] = useState(0);
  const [totals, setTotals] = useState({ paid: 0, pending: 0, ordersPaid: 0 });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [resRes, walletRes, commAggRes, ordersRes, reversalRes] = await Promise.all([
          supabase
            .from("resellers")
            .select("id,display_name,email,tier,status,parent_id,seller_stores(id,store_name)"),
          supabase.from("reseller_wallet_summary").select("reseller_id,pending,available,paid,total_balance"),
          supabase.from("commissions").select("id,order_id,amount,level,status,reseller_id"),
          supabase.from("orders").select("total,status"),
          supabase
            .from("wallet_transactions")
            .select("amount,status")
            .eq("type", "commission_reversal")
            .eq("status", "available"),
        ]);

        if (resRes.error) throw resRes.error;
        if (walletRes.error) throw walletRes.error;
        if (commAggRes.error) throw commAggRes.error;
        if (ordersRes.error) throw ordersRes.error;
        if (reversalRes.error) throw reversalRes.error;
        if (!alive) return;

        const walletMap = new Map<string, WalletSummaryRow>();
        ((walletRes.data ?? []) as WalletSummaryRow[]).forEach((w) => {
          if (w.reseller_id) walletMap.set(w.reseller_id, w);
        });

        const resellersData = (resRes.data ?? []) as ResellerQueryRow[];
        const commData = (commAggRes.data ?? []) as CommissionQueryRow[];
        const ordersData = (ordersRes.data ?? []) as Pick<OrderQueryRow, "total" | "status">[];

        const salesByReseller = new Map<string, number>();
        const refByReseller = new Map<string, number>();
        commData.forEach((c) => {
          if (c.status === "cancelled") return;
          const map = c.level === 1 ? salesByReseller : refByReseller;
          map.set(c.reseller_id, (map.get(c.reseller_id) || 0) + Number(c.amount || 0));
        });

        const directByParent = new Map<string, number>();
        const childrenByParent = new Map<string, string[]>();
        resellersData.forEach((r) => {
          if (r.parent_id) {
            directByParent.set(r.parent_id, (directByParent.get(r.parent_id) || 0) + 1);
            const arr = childrenByParent.get(r.parent_id) || [];
            arr.push(r.id);
            childrenByParent.set(r.parent_id, arr);
          }
        });
        const networkSize = (rootId: string): number => {
          const visited = new Set<string>();
          const stack = [rootId];
          while (stack.length) {
            const cur = stack.pop()!;
            (childrenByParent.get(cur) || []).forEach((c) => {
              if (!visited.has(c)) { visited.add(c); stack.push(c); }
            });
          }
          return visited.size;
        };

        const resellerNameById = new Map<string, string>();
        resellersData.forEach((r) => resellerNameById.set(r.id, r.seller_stores?.[0]?.store_name || r.display_name));

        setResellers(
          resellersData.map((r) => {
            const w = walletMap.get(r.id);
            return {
              id: r.id,
              display_name: r.display_name,
              email: r.email,
              tier: r.tier,
              status: r.status,
              store_name: r.seller_stores?.[0]?.store_name || null,
              pending: Number(w?.pending || 0),
              available: Number(w?.available || 0),
              paid: Number(w?.paid || 0),
              total: Number(w?.total_balance || 0),
              sales: salesByReseller.get(r.id) || 0,
              referrals: refByReseller.get(r.id) || 0,
              ordersCount: 0,
              directReferrals: directByParent.get(r.id) || 0,
              networkSize: networkSize(r.id),
            };
          }).sort((a, b) => (b.available + b.pending) - (a.available + a.pending)),
        );

        const paidOrders = ordersData.filter((o) => ["paid", "confirmed", "shipped", "delivered"].includes(o.status));
        const pendingOnly = ordersData.filter((o) => ["new", "aguardando", "pending"].includes(o.status));
        setTotals({
          paid: paidOrders.reduce((s, o) => s + Number(o.total || 0), 0),
          pending: pendingOnly.reduce((s, o) => s + Number(o.total || 0), 0),
          ordersPaid: paidOrders.length,
        });

        setCommissions(commData.map((c) => ({
          id: c.id,
          order_id: c.order_id,
          amount: Number(c.amount || 0),
          rate: 0,
          level: c.level,
          status: c.status,
          reseller_id: c.reseller_id,
          resellerName: resellerNameById.get(c.reseller_id) || "Sacoleira",
        })));

        setReversalDebitsTotal(
          (reversalRes.data ?? []).reduce((s, t) => s + Number(t.amount || 0), 0),
        );
      } catch (e: unknown) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Falha ao carregar financeiro.");
        setResellers([]);
        setCommissions([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [reloadToken]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLedgerLoading(true);
      try {
        const from = (ledgerPage - 1) * DEFAULT_PAGE_SIZE;
        const to = from + DEFAULT_PAGE_SIZE - 1;
        const { data, error: ledgerError, count } = await supabase
          .from("wallet_transactions")
          .select("id,type,amount,status,description,created_at,commission_id,reseller_id", { count: "exact" })
          .in("type", ["commission", "commission_reversal"])
          .order("created_at", { ascending: false })
          .range(from, to);
        if (ledgerError) throw ledgerError;
        if (!alive) return;

        const orderByCommission = new Map<string, string>();
        commissions.forEach((c) => orderByCommission.set(c.id, c.order_id));
        const resellerName = (id: string) => {
          const r = resellers.find((x) => x.id === id);
          return r?.store_name || r?.display_name || "Sacoleira";
        };

        setLedger(
          (data ?? []).map((t) => ({
            id: t.id,
            type: t.type,
            amount: Number(t.amount || 0),
            status: t.status,
            description: t.description,
            reason: null as string | null,
            created_at: t.created_at,
            commission_id: t.commission_id,
            reseller_id: t.reseller_id,
            resellerName: resellerName(t.reseller_id),
            order_id: t.commission_id ? orderByCommission.get(t.commission_id) || null : null,
          })),
        );
        setLedgerTotal(count ?? 0);
      } catch (e: unknown) {
        if (!alive) return;
        setLedger([]);
        setLedgerTotal(0);
        toastError(e);
      } finally {
        if (alive) setLedgerLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [ledgerPage, commissions, resellers]);

  const activeCommissionCredits = useMemo(
    () => commissions.filter((c) => c.status !== "cancelled").reduce((s, c) => s + c.amount, 0),
    [commissions],
  );
  const cancelledCommissionCredits = useMemo(
    () => commissions.filter((c) => c.status === "cancelled").reduce((s, c) => s + c.amount, 0),
    [commissions],
  );
  const netCommission = activeCommissionCredits + reversalDebitsTotal;

  return (
    <AdminLayout>
      <PageHeader eyebrow="Comissões" title="Comissões e carteira" description="Controle saldos das sacoleiras e comissões multinível geradas por venda." />

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3 mb-6">
          <p className="text-sm text-destructive">{error}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => setReloadToken((n) => n + 1)} disabled={loading}>
            Tentar novamente
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center h-60 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2"/> Carregando dados...</div>
      ) : (
      <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label="Total faturado" value={formatBRL(totals.paid)} icon={DollarSign} hint="pedidos pagos" />
        <StatCard label="A receber" value={formatBRL(totals.pending)} icon={Clock} hint="aguardando pagamento" />
        <StatCard
          label="Comissões líquidas"
          value={formatBRL(netCommission)}
          icon={TrendingUp}
          hint={`ativas ${formatBRL(activeCommissionCredits)} · canceladas ${formatBRL(cancelledCommissionCredits)} · débitos ${formatBRL(reversalDebitsTotal)}`}
        />
        <StatCard label="Pedidos pagos" value={String(totals.ordersPaid)} icon={CreditCard} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-display text-xl">Wallet das sacoleiras</h3>
          </div>
          <div className="divide-y divide-border">
            {resellers.length === 0 && <div className="px-5 py-8 text-sm text-center text-muted-foreground">Nenhuma sacoleira cadastrada.</div>}
            {resellers.map((s) => (
              <Dialog key={s.id}>
                <div className="px-5 py-4 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <DialogTrigger className="text-left font-medium underline-offset-4 transition-colors hover:text-gold hover:underline">{s.store_name || s.display_name}</DialogTrigger>
                      <p className="text-xs text-muted-foreground">Disponível {formatBRL(s.available)} · Pendente {formatBRL(s.pending)}</p>
                    </div>
                    <p className="font-display text-xl text-gold">{formatBRL(s.available + s.pending)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Vendas próprias</p>
                      <p className="font-display text-lg text-primary">{formatBRL(s.sales)}</p>
                    </div>
                    <div className="rounded-lg border border-gold/25 bg-gold/10 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Indicação MLM</p>
                      <p className="font-display text-lg text-gold">{formatBRL(s.referrals)}</p>
                    </div>
                  </div>
                </div>
                <DialogContent className="border-border bg-card sm:max-w-xl">
                  <DialogHeader>
                    <DialogTitle className="font-display text-2xl text-gold">{s.store_name || s.display_name}</DialogTitle>
                    <DialogDescription>{s.display_name} · {s.tier} · carteira detalhada</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border bg-background/60 p-4">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Saldo disponível</p>
                      <p className="mt-1 font-display text-2xl text-primary">{formatBRL(s.available)}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-background/60 p-4">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Saldo pendente</p>
                      <p className="mt-1 font-display text-2xl text-warning">{formatBRL(s.pending)}</p>
                    </div>
                    <div className="rounded-lg border border-primary/20 bg-primary/10 p-4">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Ganhos por vendas</p>
                      <p className="mt-1 font-display text-2xl text-primary">{formatBRL(s.sales)}</p>
                    </div>
                    <div className="rounded-lg border border-gold/25 bg-gold/10 p-4">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Comissões por indicação</p>
                      <p className="mt-1 font-display text-2xl text-gold">{formatBRL(s.referrals)}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Resumo MLM</p>
                    <p className="mt-2 text-sm text-muted-foreground">{s.directReferrals} indicações diretas · {s.networkSize} pessoas na rede · {s.ordersCount} pedidos vinculados</p>
                  </div>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-display text-xl">Histórico de comissões</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Débitos (`commission_reversal`) só existem para comissões já pagas. Créditos pending/available cancelados aparecem como cancelamento, sem valor negativo extra.
            </p>
          </div>
          <div className="divide-y divide-border max-h-[36rem] overflow-y-auto">
            {ledgerLoading && (
              <div className="px-5 py-8 text-sm text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando página...
              </div>
            )}
            {!ledgerLoading && ledger.length === 0 && commissions.length === 0 && (
              <div className="px-5 py-8 text-sm text-center text-muted-foreground">Nenhuma movimentação ainda.</div>
            )}
            {!ledgerLoading && ledger.filter((t) => t.type === "commission_reversal").map((t) => (
              <div key={t.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium truncate">{t.resellerName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {typeLabel(t.type)}
                    {t.order_id ? ` · Pedido ${t.order_id.slice(0, 8)}` : ""}
                    {t.reason ? ` · ${t.reason}` : ""}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{t.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-medium text-destructive">{formatBRL(t.amount)}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${statusColors[t.status] || "border-border text-muted-foreground"}`}>
                    {statusLabel(t.status)}
                  </span>
                </div>
              </div>
            ))}
            {!ledgerLoading && ledger.filter((t) => t.type === "commission").map((t) => (
              <div key={t.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium truncate">{t.resellerName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {t.status === "cancelled" ? "Crédito cancelado" : typeLabel(t.type)}
                    {t.order_id ? ` · Pedido ${t.order_id.slice(0, 8)}` : ""}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{t.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-medium ${t.status === "cancelled" ? "text-muted-foreground line-through" : "text-primary"}`}>
                    {formatBRL(t.amount)}
                  </p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${statusColors[t.status] || "border-border text-muted-foreground"}`}>
                    {statusLabel(t.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <ListPagination
            page={ledgerPage}
            total={ledgerTotal}
            pageSize={DEFAULT_PAGE_SIZE}
            disabled={ledgerLoading}
            onPageChange={setLedgerPage}
          />
        </div>
      </div>
      </>)}
    </AdminLayout>
  );
};

export default AdminFinance;
