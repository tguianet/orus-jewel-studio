import { Network, Users } from "lucide-react";
import { SellerLayout } from "@/layouts/SellerLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { commissionRules, fallbackStore, formatBRL, getCommissionsByReseller, getNetwork } from "@/lib/mockData";

const SellerNetwork = () => {
  const direct = getNetwork(fallbackStore.id);
  const commissions = getCommissionsByReseller(fallbackStore.id);
  const total = commissions.reduce((sum, c) => sum + c.amount, 0);

  return (
    <SellerLayout>
      <PageHeader eyebrow="Minha rede" title="Indicações e níveis" description="Veja suas indicadas diretas, rede e comissões por vendas de produto." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label="Indicadas diretas" value={String(direct.length)} icon={Users} />
        <StatCard label="Rede total" value={String(fallbackStore.networkSize)} icon={Network} />
        <StatCard label="Comissões da rede" value={formatBRL(total)} icon={Network} />
        <StatCard label="Níveis" value="3" icon={Network} hint="10% · 5% · 2%" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-display text-xl">Indicadas diretas</h3>
          </div>
          <div className="divide-y divide-border">
            {direct.map((s) => (
              <div key={s.id} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.storeName} · /loja/{s.storeSlug}</p>
                </div>
                <span className="text-sm text-primary">{s.status === "approved" ? "Aprovada" : "Pendente"}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-primary/20 bg-gradient-gold-soft p-6">
          <h3 className="font-display text-2xl mb-4">Plano de comissão</h3>
          <div className="space-y-3">
            {commissionRules.map((rule) => (
              <div key={rule.level} className="flex items-center justify-between rounded-lg border border-border bg-card/70 p-3">
                <span className="text-sm">{rule.label}</span>
                <span className="font-display text-xl text-gold">{Math.round(rule.rate * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SellerLayout>
  );
};

export default SellerNetwork;
