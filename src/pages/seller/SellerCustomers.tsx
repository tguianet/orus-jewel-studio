import { useEffect, useState } from "react";
import { Loader2, Wallet, Clock, CheckCircle2, ShoppingBag, Users } from "lucide-react";
import { SellerLayout } from "@/layouts/SellerLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { useAuth } from "@/contexts/AuthContext";
import { loadWalletForReseller, WalletSummary, WalletTx } from "@/lib/cloudStore";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { statusColors } from "@/lib/orderStatus";

type Breakdown = { ownSales: number; networkCommissions: number };

const SellerCustomers = () => {
  const { profile } = useAuth();
  const [summary, setSummary] = useState<WalletSummary>({ pending: 0, available: 0, paid: 0, total: 0 });
  const [txs, setTxs] = useState<WalletTx[]>([]);
  const [breakdown, setBreakdown] = useState<Breakdown>({ ownSales: 0, networkCommissions: 0 });
  const [loading, setLoading] = useState(true);

  const [sourceByCommission, setSourceByCommission] = useState<Record<string, { name: string; level: number }>>({});

  useEffect(() => {
    if (!profile?.resellerId) { setLoading(false); return; }
    const resellerId = profile.resellerId;
    Promise.all([
      loadWalletForReseller(resellerId),
      supabase
        .from("commissions")
        .select("id, amount, level, source_reseller_id, resellers!commissions_source_reseller_id_fkey(display_name)")
        .eq("reseller_id", resellerId),
    ]).then(([wallet, commRes]) => {
      setSummary(wallet.summary);
      setTxs(wallet.transactions);
      type CommissionSourceRow = {
        id: string;
        amount: number;
        level: number;
        source_reseller_id: string | null;
        resellers: { display_name: string } | null;
      };
      const rows = (commRes.data ?? []) as CommissionSourceRow[];
      const ownSales = rows.filter((r) => r.level === 1).reduce((s, r) => s + Number(r.amount || 0), 0);
      const networkCommissions = rows.filter((r) => r.level > 1).reduce((s, r) => s + Number(r.amount || 0), 0);
      setBreakdown({ ownSales, networkCommissions });
      const map: Record<string, { name: string; level: number }> = {};
      rows.forEach((r) => {
        map[r.id] = {
          name: r.resellers?.display_name || "Indicada",
          level: r.level,
        };
      });
      setSourceByCommission(map);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [profile?.resellerId]);

  const totalAcumulado = breakdown.ownSales + breakdown.networkCommissions;

  return (
    <SellerLayout>
      <PageHeader eyebrow="Carteira" title="Saldo e comissões" description="Acompanhe suas vendas, comissões da rede e saldo disponível." />
      {loading ? <div className="flex items-center justify-center h-40 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2"/> Carregando...</div> : (
      <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-4">
        <StatCard label="Suas vendas" value={formatBRL(breakdown.ownSales)} icon={ShoppingBag} hint="ganhos das suas próprias vendas"/>
        <StatCard label="Comissão das indicadas" value={formatBRL(breakdown.networkCommissions)} icon={Users} hint="vendas das sacoleiras da sua rede"/>
        <StatCard label="Total acumulado" value={formatBRL(totalAcumulado)} icon={CheckCircle2} hint="vendas + comissões"/>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        <StatCard label="Saldo disponível" value={formatBRL(summary.available)} icon={Wallet} hint="liberado para saque"/>
        <StatCard label="Saldo pendente" value={formatBRL(summary.pending)} icon={Clock} hint="aguardando pedido pago"/>
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border"><h3 className="font-display text-xl">Histórico</h3></div>
        <div className="divide-y divide-border">
          {txs.length === 0 ? <div className="px-5 py-8 text-center text-sm text-muted-foreground">Nenhuma movimentação ainda. Comissões aparecem quando seus pedidos forem pagos.</div> :
            txs.map((t) => {
              const src = t.commission_id ? sourceByCommission[t.commission_id] : undefined;
              const isOwn = src && src.level === 1;
              const label = src
                ? (isOwn ? "Sua venda" : `Indicada: ${src.name} (nível ${src.level})`)
                : null;
              return (
                <div key={t.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{t.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.created_at).toLocaleDateString("pt-BR")}
                      {label && <> · <span className="text-foreground/80">{label}</span></>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={t.amount >= 0 ? "font-medium text-primary" : "font-medium text-muted-foreground"}>{formatBRL(t.amount)}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${statusColors[t.status] || "border-border text-muted-foreground"}`}>{t.status}</span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
      </>)}
    </SellerLayout>
  );
};

export default SellerCustomers;
