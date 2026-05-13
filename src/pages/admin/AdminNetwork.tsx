import { useEffect, useState } from "react";
import { Network, Users, Crown } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { commissionRules, formatBRL } from "@/lib/mockData";
import { supabase } from "@/integrations/supabase/client";

type Reseller = {
  id: string;
  display_name: string | null;
  parent_id: string | null;
  status: string | null;
};

type Commission = {
  reseller_id: string;
  level: number;
  amount: number;
  status: string | null;
};

const AdminNetwork = () => {
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: rs }, { data: cs }] = await Promise.all([
        supabase.from("resellers").select("id, display_name, parent_id, status").order("created_at"),
        supabase.from("commissions").select("reseller_id, level, amount, status"),
      ]);
      setResellers((rs as Reseller[]) || []);
      setCommissions((cs as Commission[]) || []);
      setLoading(false);
    })();
  }, []);

  const approved = resellers.filter((r) => r.status === "approved");
  const directOf = (id: string) => resellers.filter((r) => r.parent_id === id);
  const levelsOf = (id: string) => {
    const l1 = resellers.filter((r) => r.parent_id === id);
    const l2 = resellers.filter((r) => l1.some((p) => p.id === r.parent_id));
    const l3 = resellers.filter((r) => l2.some((p) => p.id === r.parent_id));
    return [
      { level: 1 as const, label: "Nível 1", members: l1 },
      { level: 2 as const, label: "Nível 2", members: l2 },
      { level: 3 as const, label: "Nível 3", members: l3 },
    ];
  };
  const earningsOf = (id: string) =>
    commissionRules.map((rule) => ({
      ...rule,
      amount: commissions
        .filter((c) => c.reseller_id === id && c.level === rule.level && c.status === "available")
        .reduce((sum, c) => sum + Number(c.amount || 0), 0),
    }));

  const totalAvailable = commissions
    .filter((c) => c.status === "available")
    .reduce((sum, c) => sum + Number(c.amount || 0), 0);

  return (
    <AdminLayout>
      <PageHeader
        eyebrow="MLM"
        title="Marketing multinível"
        description="Acompanhe a árvore de indicação das sacoleiras e as comissões multinível geradas somente por vendas de produto."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label="Revendedoras aprovadas" value={String(approved.length)} icon={Users} />
        <StatCard label="Rede total" value={String(resellers.length)} icon={Network} hint="inclui pendentes" />
        <StatCard label="Comissões disponíveis" value={formatBRL(totalAvailable)} icon={Crown} />
        <StatCard label="Níveis ativos" value="3" icon={Network} hint="10% · 5% · 2%" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-display text-xl">Árvore MLM</h3>
            <p className="text-xs text-muted-foreground">Cada linha mostra patrocinadora, indicadas diretas e alcance da rede multinível.</p>
          </div>
          <div className="divide-y divide-border">
            {loading && <p className="px-5 py-6 text-sm text-muted-foreground">Carregando rede…</p>}
            {!loading && resellers.length === 0 && (
              <p className="px-5 py-6 text-sm text-muted-foreground">Nenhuma sacoleira cadastrada.</p>
            )}
            {resellers.map((s) => {
              const parent = resellers.find((item) => item.id === s.parent_id);
              const direct = directOf(s.id);
              const levels = levelsOf(s.id);
              const earnings = earningsOf(s.id);
              const networkSize = levels.reduce((sum, l) => sum + l.members.length, 0);
              return (
                <div key={s.id} className="px-5 py-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{s.display_name || "Sem nome"}</p>
                      <p className="text-xs text-muted-foreground">Patrocinadora: {parent?.display_name || "Raiz da rede"}</p>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span><b className="text-primary">{direct.length}</b> diretas</span>
                      <span><b className="text-primary">{networkSize}</b> na rede</span>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {levels.map((level) => (
                      <div key={level.level} className="rounded-lg border border-border bg-background/50 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{level.label}</p>
                        <p className="text-sm">{level.members.length} indicadas · <span className="text-gold">{formatBRL(earnings.find(e => e.level === level.level)?.amount || 0)}</span></p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-primary/20 bg-gradient-gold-soft p-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">Regras</p>
          <h3 className="font-display text-2xl mb-4">Comissão MLM por venda</h3>
          <div className="space-y-3">
            {commissionRules.map((rule) => (
              <div key={rule.level} className="flex items-center justify-between rounded-lg border border-border bg-card/70 p-3">
                <span className="text-sm">{rule.label}</span>
                <span className="font-display text-xl text-gold">{Math.round(rule.rate * 100)}%</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">MLM sem comissão por cadastro: a carteira só recebe valores de pedidos de produto confirmados.</p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminNetwork;
