import { SellerLayout } from "@/layouts/SellerLayout";
import { PageHeader } from "@/components/PageHeader";
import { Wallet, Clock, CheckCircle2, ShoppingBag, Network } from "lucide-react";
import { fallbackStore, formatBRL, getWalletBreakdown, getWalletTransactions, statusColors } from "@/lib/mockData";
import { StatCard } from "@/components/StatCard";

const SellerCustomers = () => {
  const transactions = getWalletTransactions(fallbackStore.id);
  const breakdown = getWalletBreakdown(fallbackStore.id);

  return (
    <SellerLayout>
      <PageHeader eyebrow="Carteira" title="Saldo e comissões" description="Acompanhe seu saldo disponível, pendente e histórico de movimentações." />

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <StatCard label="Saldo disponível" value={formatBRL(fallbackStore.walletAvailable)} icon={Wallet} />
        <StatCard label="Saldo pendente" value={formatBRL(fallbackStore.walletPending)} icon={Clock} />
        <StatCard label="Total em carteira" value={formatBRL(fallbackStore.walletAvailable + fallbackStore.walletPending)} icon={CheckCircle2} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <div className="rounded-xl border border-primary/20 bg-primary/10 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Ganhos por vendas</p>
              <h3 className="mt-1 font-display text-3xl text-primary">{formatBRL(breakdown.sales)}</h3>
            </div>
            <ShoppingBag className="h-8 w-8 text-primary" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Comissões geradas pelas vendas da sua própria loja.</p>
        </div>
        <div className="rounded-xl border border-gold/25 bg-gold/10 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Comissões por indicação</p>
              <h3 className="mt-1 font-display text-3xl text-gold">{formatBRL(breakdown.referrals)}</h3>
            </div>
            <Network className="h-8 w-8 text-gold" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Ganhos MLM vindos das vendas realizadas pela sua rede indicada.</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-display text-xl">Histórico da carteira</h3>
        </div>
        <div className="divide-y divide-border">
          {transactions.map((t) => (
            <div key={t.id} className="px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">{t.description}</p>
                <p className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString("pt-BR")}</p>
              </div>
              <div className="text-right">
                <p className={t.amount >= 0 ? "font-medium text-primary" : "font-medium text-muted-foreground"}>{formatBRL(t.amount)}</p>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${statusColors[t.status]}`}>{t.status === "available" ? "Disponível" : t.status === "pending" ? "Pendente" : "Pago"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SellerLayout>
  );
};

export default SellerCustomers;
