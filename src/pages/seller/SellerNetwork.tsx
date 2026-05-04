import { useEffect, useState } from "react";
import { Network, Users, Loader2 } from "lucide-react";
import { SellerLayout } from "@/layouts/SellerLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { useAuth } from "@/contexts/AuthContext";
import { loadNetwork, NetworkMember } from "@/lib/cloudStore";

const commissionRules = [
  { level: 1, rate: 0.1, label: "Nível 1 — venda direta" },
  { level: 2, rate: 0.05, label: "Nível 2 — indicada" },
  { level: 3, rate: 0.02, label: "Nível 3 — sub-indicada" },
];

const SellerNetwork = () => {
  const { profile } = useAuth();
  const [members, setMembers] = useState<NetworkMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.resellerId) { setLoading(false); return; }
    loadNetwork(profile.resellerId).then((m) => { setMembers(m); setLoading(false); });
  }, [profile?.resellerId]);

  const byLevel = (lvl: number) => members.filter((m) => m.level === lvl);

  return (
    <SellerLayout>
      <PageHeader eyebrow="MLM" title="Minha rede" description="Suas indicadas em até 3 níveis." />

      {profile?.resellerId && (
        <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-xs text-muted-foreground">Compartilhe seu código de indicação:</p>
          <p className="font-mono text-sm text-primary break-all mt-1">{profile.resellerId}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label="Diretas (N1)" value={String(byLevel(1).length)} icon={Users}/>
        <StatCard label="Nível 2" value={String(byLevel(2).length)} icon={Network}/>
        <StatCard label="Nível 3" value={String(byLevel(3).length)} icon={Network}/>
        <StatCard label="Rede total" value={String(members.length)} icon={Network} hint="10% · 5% · 2%"/>
      </div>

      {loading ? <div className="flex items-center justify-center h-40 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2"/> Carregando...</div> : (
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border"><h3 className="font-display text-xl">Sua rede</h3></div>
          <div className="divide-y divide-border">
            {[1,2,3].map((lvl) => (
              <div key={lvl} className="px-5 py-4">
                <p className="font-display text-lg mb-3">Nível {lvl}</p>
                <div className="space-y-2">
                  {byLevel(lvl).length ? byLevel(lvl).map((m) => (
                    <div key={m.id} className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2">
                      <div><p className="font-medium">{m.name}</p><p className="text-xs text-muted-foreground">{m.email}</p></div>
                      <span className="text-xs text-muted-foreground">{m.status}</span>
                    </div>
                  )) : <p className="text-sm text-muted-foreground">Nenhuma indicada neste nível.</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-primary/20 bg-gradient-gold-soft p-6">
          <h3 className="font-display text-2xl mb-4">Plano MLM</h3>
          <div className="space-y-3">
            {commissionRules.map((r) => (
              <div key={r.level} className="flex items-center justify-between rounded-lg border border-border bg-card/70 p-3">
                <span className="text-sm">{r.label}</span>
                <span className="font-display text-xl text-gold">{Math.round(r.rate * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}
    </SellerLayout>
  );
};

export default SellerNetwork;
