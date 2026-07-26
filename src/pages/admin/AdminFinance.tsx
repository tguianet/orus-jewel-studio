import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, CreditCard, Clock, Loader2 } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { statusColors } from "@/lib/orderStatus";

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
  const [resellers, setResellers] = useState<ResellerRow[]>([]);
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [ledger, setLedger] = useState<WalletLedgerRow[]>([]);
  const [totals, setTotals] = useState({ paid: 0, pending: 0, ordersPaid: 0 });

  useEffect(() => {
    (async () => {
      const [resRes, walletRes, commRes, ordersRes, ledgerRes] = await Promise.all([
        supabase.from("resellers").select("id,display_name,email,tier,status,parent_id,seller_stores(id,store_name)"),
        supabase.from("reseller_wallet_summary").select("*"),
        supabase.from("commissions").select("id,order_id,amount,rate,level,status,reseller_id,created_at").order("created_at", { ascending: false }),
        supabase.from("orders").select("id,total,status,seller_store_id,seller_stores(reseller_id)"),
        supabase
          .from("wallet_transactions")
          .select("id,type,amount,status,description,created_at,commission_id,reseller_id")
          .in("type", ["commission", "commission_reversal"])
          .order("created_at", { ascending: false })
          .limit(80),
      ]);

      const walletMap = new Map<string, WalletSummaryRow>();
      ((walletRes.data ?? []) as WalletSummaryRow[]).forEach((w) => {
        if (w.reseller_id) walletMap.set(w.reseller_id, w);
      });

      const resellersData = (resRes.data ?? []) as ResellerQueryRow[];
      const commData = (commRes.data ?? []) as CommissionQueryRow[];
      const ordersData = (ordersRes.data ?? []) as OrderQueryRow[];

      // Aggregate sales (level=1 commissions = own sales) & referrals (level>1)
      const salesByReseller = new Map<string, number>();
      const refByReseller = new Map<string, number>();
      commData.forEach((c) => {
        const map = c.level === 1 ? salesByReseller : refByReseller;
        map.set(c.reseller_id, (map.get(c.reseller_id) || 0) + Number(c.amount || 0));
      });

      // orders per reseller (via store)
      const ordersByReseller = new Map<string, number>();
      ordersData.forEach((o) => {
        const rid = o.seller_stores?.reseller_id;
        if (!rid) return;
        ordersByReseller.set(rid, (ordersByReseller.get(rid) || 0) + 1);
      });

      // network counts
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

      const rows: ResellerRow[] = resellersData.map((r) => {
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
          ordersCount: ordersByReseller.get(r.id) || 0,
          directReferrals: directByParent.get(r.id) || 0,
          networkSize: networkSize(r.id),
        };
      }).sort((a, b) => (b.available + b.pending) - (a.available + a.pending));

      const paidOrders = ordersData.filter((o) => ["paid","confirmed","shipped","delivered"].includes(o.status));
      const pendingOrders = ordersData.filter((o) => ["new","aguardando","pending"].includes(o.status));
      setTotals({
        paid: paidOrders.reduce((s, o) => s + Number(o.total || 0), 0),
        pending: pendingOrders.reduce((s, o) => s + Number(o.total || 0), 0),
        ordersPaid: paidOrders.length,
      });

      setResellers(rows);
      setCommissions(commData.map((c) => ({
        id: c.id,
        order_id: c.order_id,
        amount: Number(c.amount || 0),
        rate: Number(c.rate || 0),
        level: c.level,
        status: c.status,
        reseller_id: c.reseller_id,
        resellerName: resellerNameById.get(c.reseller_id) || "Sacoleira",
      })));

      const orderByCommission = new Map<string, string>();
      commData.forEach((c) => orderByCommission.set(c.id, c.order_id));

      type LedgerQueryRow = {
        id: string;
        type: string;
        amount: number;
        status: string;
        description: string;
        created_at: string;
        commission_id: string | null;
        reseller_id: string;
      };

      // reason fica no banco pós-migration; até lá usamos description
      setLedger(
        ((ledgerRes.error ? [] : ledgerRes.data) ?? []).map((raw) => {
          const t = raw as LedgerQueryRow;
          return {
            id: t.id,
            type: t.type,
            amount: Number(t.amount || 0),
            status: t.status,
            description: t.description,
            reason: null as string | null,
            created_at: t.created_at,
            commission_id: t.commission_id,
            reseller_id: t.reseller_id,
            resellerName: resellerNameById.get(t.reseller_id) || "Sacoleira",
            order_id: t.commission_id ? orderByCommission.get(t.commission_id) || null : null,
          };
        }),
      );
      setLoading(false);
    })();
  }, []);

  // Créditos cancelled saem do líquido; paid permanece nas commissions até filtrarmos status.
  // Débitos reais = apenas commission_reversal (casos paid). Cancelamento pending/available não cria débito.
  const activeCommissionCredits = commissions
    .filter((c) => c.status !== "cancelled")
    .reduce((s, c) => s + c.amount, 0);
  const cancelledCommissionCredits = commissions
    .filter((c) => c.status === "cancelled")
    .reduce((s, c) => s + c.amount, 0);
  const reversalDebits = ledger
    .filter((t) => t.type === "commission_reversal" && t.status === "available")
    .reduce((s, t) => s + t.amount, 0);
  const netCommission = activeCommissionCredits + reversalDebits;

  return (
    <AdminLayout>
      <PageHeader eyebrow="Comissões" title="Comissões e carteira" description="Controle saldos das sacoleiras e comissões multinível geradas por venda." />

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
          hint={`ativas ${formatBRL(activeCommissionCredits)} · canceladas ${formatBRL(cancelledCommissionCredits)} · débitos ${formatBRL(reversalDebits)}`}
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
            {ledger.length === 0 && commissions.length === 0 && (
              <div className="px-5 py-8 text-sm text-center text-muted-foreground">Nenhuma movimentação ainda.</div>
            )}
            {ledger.filter((t) => t.type === "commission_reversal").map((t) => (
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
            {ledger.filter((t) => t.type === "commission").map((t) => (
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
            {ledger.length === 0 && commissions.map((c) => (
              <div key={c.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium truncate">{c.resellerName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {c.status === "cancelled" ? "Comissão cancelada" : "Comissão"}
                    {" · "}Pedido {c.order_id.slice(0, 8)} · nível {c.level}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-medium ${c.status === "cancelled" ? "text-muted-foreground line-through" : "text-primary"}`}>
                    {formatBRL(c.amount)}
                  </p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${statusColors[c.status] || "border-border text-muted-foreground"}`}>{statusLabel(c.status)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </>)}
    </AdminLayout>
  );
};

export default AdminFinance;
