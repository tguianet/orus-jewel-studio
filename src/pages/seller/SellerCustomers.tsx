import { useEffect, useState } from "react";
import { Loader2, Wallet, Clock, CheckCircle2 } from "lucide-react";
import { SellerLayout } from "@/layouts/SellerLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { useAuth } from "@/contexts/AuthContext";
import { loadWalletForReseller, WalletSummary, WalletTx } from "@/lib/cloudStore";
import { formatBRL, statusColors } from "@/lib/mockData";

const SellerCustomers = () => {
  const { profile } = useAuth();
  const [summary, setSummary] = useState<WalletSummary>({ pending: 0, available: 0, paid: 0, total: 0 });
  const [txs, setTxs] = useState<WalletTx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.resellerId) { setLoading(false); return; }
    loadWalletForReseller(profile.resellerId).then((r) => {
      setSummary(r.summary); setTxs(r.transactions); setLoading(false);
    });
  }, [profile?.resellerId]);

  return (
    <SellerLayout>
      <PageHeader eyebrow="Carteira" title="Saldo e comissões" description="Saldo disponível, pendente e histórico de movimentações." />
      {loading ? <div className="flex items-center justify-center h-40 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2"/> Carregando...</div> : (
      <>
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <StatCard label="Saldo disponível" value={formatBRL(summary.available)} icon={Wallet}/>
        <StatCard label="Saldo pendente" value={formatBRL(summary.pending)} icon={Clock}/>
        <StatCard label="Total acumulado" value={formatBRL(summary.total + summary.paid)} icon={CheckCircle2}/>
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border"><h3 className="font-display text-xl">Histórico</h3></div>
        <div className="divide-y divide-border">
          {txs.length === 0 ? <div className="px-5 py-8 text-center text-sm text-muted-foreground">Nenhuma movimentação ainda. Comissões aparecem quando seus pedidos forem pagos.</div> :
            txs.map((t) => (
            <div key={t.id} className="px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">{t.description}</p>
                <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString("pt-BR")}</p>
              </div>
              <div className="text-right">
                <p className={t.amount >= 0 ? "font-medium text-primary" : "font-medium text-muted-foreground"}>{formatBRL(t.amount)}</p>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${statusColors[t.status] || "border-border text-muted-foreground"}`}>{t.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      </>)}
    </SellerLayout>
  );
};

export default SellerCustomers;
