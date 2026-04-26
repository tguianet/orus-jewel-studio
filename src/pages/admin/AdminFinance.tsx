import { DollarSign, TrendingUp, CreditCard, Clock } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { commissions, formatBRL, statusColors, sacoleiras, wholesaleOrders } from "@/lib/mockData";

const AdminFinance = () => {
  const paid = wholesaleOrders.filter(o => o.status !== "aguardando" && o.status !== "cancelado").reduce((s,o) => s + o.total, 0);
  const pending = wholesaleOrders.filter(o => o.status === "aguardando").reduce((s,o) => s + o.total, 0);
  const commissionTotal = commissions.reduce((sum, c) => sum + c.amount, 0);

  return (
    <AdminLayout>
      <PageHeader eyebrow="Comissões" title="Comissões e carteira" description="Controle saldos das sacoleiras e comissões multinível geradas por venda." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label="Total faturado" value={formatBRL(paid)} icon={DollarSign} trend="+18,2%" />
        <StatCard label="A receber" value={formatBRL(pending)} icon={Clock} hint="aguardando pagamento" />
        <StatCard label="Comissões geradas" value={formatBRL(commissionTotal)} icon={TrendingUp} />
        <StatCard label="Pedidos pagos" value="42" icon={CreditCard} hint="este mês" />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-display text-xl">Wallet das sacoleiras</h3>
          </div>
          <div className="divide-y divide-border">
            {sacoleiras.map((s) => (
              <div key={s.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{s.storeName}</p>
                  <p className="text-xs text-muted-foreground">Disponível {formatBRL(s.walletAvailable)} · Pendente {formatBRL(s.walletPending)}</p>
                </div>
                <p className="font-display text-xl text-gold">{formatBRL(s.walletAvailable + s.walletPending)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-display text-xl">Histórico de comissões</h3>
          </div>
          <div className="divide-y divide-border">
            {commissions.map((c) => {
              const reseller = sacoleiras.find((s) => s.id === c.resellerId);
              return (
                <div key={c.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{reseller?.storeName || "Sacoleira"}</p>
                    <p className="text-xs text-muted-foreground">Pedido {c.orderId} · nível {c.level} · {Math.round(c.rate * 100)}%</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-primary">{formatBRL(c.amount)}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${statusColors[c.status]}`}>{c.status === "available" ? "Disponível" : c.status === "pending" ? "Pendente" : "Pago"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminFinance;
