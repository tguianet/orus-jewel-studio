import { DollarSign, TrendingUp, CreditCard, Clock } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { formatBRL, wholesaleOrders } from "@/lib/mockData";

const AdminFinance = () => {
  const paid = wholesaleOrders.filter(o => o.status !== "aguardando" && o.status !== "cancelado").reduce((s,o) => s + o.total, 0);
  const pending = wholesaleOrders.filter(o => o.status === "aguardando").reduce((s,o) => s + o.total, 0);

  return (
    <AdminLayout>
      <PageHeader eyebrow="Financeiro" title="Visão financeira" description="Acompanhe o faturamento do seu atacado e prepare comissões para a rede." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label="Total faturado" value={formatBRL(paid)} icon={DollarSign} trend="+18,2%" />
        <StatCard label="A receber" value={formatBRL(pending)} icon={Clock} hint="aguardando pagamento" />
        <StatCard label="Ticket médio" value={formatBRL(paid / 4)} icon={TrendingUp} />
        <StatCard label="Pedidos pagos" value="42" icon={CreditCard} hint="este mês" />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-display text-xl mb-4">Faturamento por período</h3>
          <div className="space-y-3">
            {[
              { p: "Hoje", v: 1240 },
              { p: "Esta semana", v: 6890 },
              { p: "Este mês", v: 24890 },
              { p: "Este ano", v: 184320 },
            ].map(r => (
              <div key={r.p} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <span className="text-sm text-muted-foreground">{r.p}</span>
                <span className="font-display text-xl text-gold">{formatBRL(r.v)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-primary/20 bg-gradient-gold-soft p-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">Em breve</p>
          <h3 className="font-display text-2xl mb-3">Comissões e cupons</h3>
          <p className="text-sm text-muted-foreground mb-4">Estrutura preparada para distribuir comissões automáticas para sacoleiras VIP e gerar cupons de desconto temporários.</p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Comissões por nível de revenda</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Cupons promocionais</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Pagamento online integrado</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminFinance;
