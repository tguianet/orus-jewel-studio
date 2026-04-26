import { SellerLayout } from "@/layouts/SellerLayout";
import { PageHeader } from "@/components/PageHeader";
import { Wallet, Clock, CheckCircle2 } from "lucide-react";
import { fallbackStore, formatBRL, getWalletTransactions, statusColors } from "@/lib/mockData";
import { StatCard } from "@/components/StatCard";

const SellerCustomers = () => {
  const transactions = getWalletTransactions(fallbackStore.id);

  return (
    <SellerLayout>
      <PageHeader eyebrow="Carteira" title="Saldo e comissões" description="Acompanhe seu saldo disponível, pendente e histórico de movimentações." />

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <StatCard label="Saldo disponível" value={formatBRL(fallbackStore.walletAvailable)} icon={Wallet} />
        <StatCard label="Saldo pendente" value={formatBRL(fallbackStore.walletPending)} icon={Clock} />
        <StatCard label="Total em carteira" value={formatBRL(fallbackStore.walletAvailable + fallbackStore.walletPending)} icon={CheckCircle2} />
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
