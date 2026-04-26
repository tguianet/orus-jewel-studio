import { Network, Users, Crown } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { commissionRules, formatBRL, getNetwork, sacoleiras } from "@/lib/mockData";

const AdminNetwork = () => {
  const approved = sacoleiras.filter((s) => s.status === "approved");
  const totalAvailable = sacoleiras.reduce((sum, s) => sum + s.walletAvailable, 0);

  return (
    <AdminLayout>
      <PageHeader
        eyebrow="Marketing multinível"
        title="Rede de indicação"
        description="Acompanhe indicações por sacoleira e regras de comissão geradas somente por venda de produto."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label="Revendedoras aprovadas" value={String(approved.length)} icon={Users} />
        <StatCard label="Rede total" value={String(sacoleiras.length)} icon={Network} hint="inclui pendentes" />
        <StatCard label="Comissões disponíveis" value={formatBRL(totalAvailable)} icon={Crown} />
        <StatCard label="Níveis ativos" value="3" icon={Network} hint="10% · 5% · 2%" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-display text-xl">Árvore da rede</h3>
            <p className="text-xs text-muted-foreground">Cada linha mostra indicadas diretas e tamanho total da rede.</p>
          </div>
          <div className="divide-y divide-border">
            {sacoleiras.map((s) => {
              const parent = sacoleiras.find((item) => item.id === s.parentId);
              const direct = getNetwork(s.id);
              return (
                <div key={s.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{s.storeName}</p>
                    <p className="text-xs text-muted-foreground">Patrocinadora: {parent?.storeName || "Raiz da rede"}</p>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span><b className="text-primary">{direct.length}</b> diretas</span>
                    <span><b className="text-primary">{s.networkSize}</b> na rede</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-primary/20 bg-gradient-gold-soft p-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">Regras</p>
          <h3 className="font-display text-2xl mb-4">Comissão por venda</h3>
          <div className="space-y-3">
            {commissionRules.map((rule) => (
              <div key={rule.level} className="flex items-center justify-between rounded-lg border border-border bg-card/70 p-3">
                <span className="text-sm">{rule.label}</span>
                <span className="font-display text-xl text-gold">{Math.round(rule.rate * 100)}%</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Comissões não são geradas por cadastro, apenas por pedidos de produto confirmados.</p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminNetwork;
