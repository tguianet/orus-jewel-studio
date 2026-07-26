import { useEffect, useState } from "react";
import { Network, Users, Loader2, Copy, Check, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SellerLayout } from "@/layouts/SellerLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { useAuth } from "@/contexts/AuthContext";
import { loadNetwork, NetworkMember } from "@/lib/cloudStore";
import { waLink } from "@/lib/whatsapp";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { commissionRules as baseCommissionRules } from "@/lib/commissionRules";

const commissionRules = baseCommissionRules.map((rule) => ({
  ...rule,
  label:
    rule.level === 1
      ? "Nível 1 — venda direta"
      : rule.level === 2
        ? "Nível 2 — indicada"
        : "Nível 3 — sub-indicada",
}));

const SellerNetwork = () => {
  const { profile } = useAuth();
  const [members, setMembers] = useState<NetworkMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [monthBySource, setMonthBySource] = useState<Record<string, number>>({});

  const monthLabel = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const handleCopy = async () => {
    if (!profile?.resellerId) return;
    try {
      await navigator.clipboard.writeText(profile.resellerId);
      setCopied(true);
      toast.success("Código copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  useEffect(() => {
    if (!profile?.resellerId) { setLoading(false); return; }
    const resellerId = profile.resellerId;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    Promise.all([
      loadNetwork(resellerId),
      supabase
        .from("commissions")
        .select("amount, source_reseller_id")
        .eq("reseller_id", resellerId)
        .gte("created_at", monthStart),
    ]).then(([m, commRes]) => {
      setMembers(m);
      const map: Record<string, number> = {};
      type MonthCommissionRow = { amount: number; source_reseller_id: string | null };
      ((commRes.data ?? []) as MonthCommissionRow[]).forEach((r) => {
        if (!r.source_reseller_id) return;
        map[r.source_reseller_id] = (map[r.source_reseller_id] || 0) + Number(r.amount || 0);
      });
      setMonthBySource(map);
      setLoading(false);
    });
  }, [profile?.resellerId]);

  const byLevel = (lvl: number) => members.filter((m) => m.level === lvl);

  return (
    <SellerLayout>
      <PageHeader eyebrow="MLM" title="Minha rede" description="Suas indicadas em até 3 níveis." />

      {profile?.resellerId && (
        <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-xs text-muted-foreground">Compartilhe seu código de indicação:</p>
          <div className="mt-1 flex items-center gap-2">
            <p className="font-mono text-sm text-primary break-all flex-1">{profile.resellerId}</p>
            <Button size="sm" variant="goldOutline" onClick={handleCopy} className="shrink-0">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
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
          <div className="px-5 py-4 border-b border-border flex items-baseline justify-between gap-2">
            <h3 className="font-display text-xl">Sua rede</h3>
            <span className="text-xs text-muted-foreground capitalize">Comissões de {monthLabel}</span>
          </div>
          <div className="divide-y divide-border">
            {[1,2,3].map((lvl) => (
              <div key={lvl} className="px-5 py-4">
                <p className="font-display text-lg mb-3">Nível {lvl}</p>
                <div className="space-y-2">
                  {byLevel(lvl).length ? byLevel(lvl).map((m) => {
                    const monthAmount = monthBySource[m.id] || 0;
                    return (
                      <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/50 px-3 py-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{m.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Este mês</p>
                            <p className={`font-display text-sm ${monthAmount > 0 ? "text-gold" : "text-muted-foreground"}`}>{formatBRL(monthAmount)}</p>
                          </div>
                          <span className="text-xs text-muted-foreground hidden sm:inline">{m.status}</span>
                          {m.phone && (
                            <a
                              href={waLink(
                                m.phone,
                                `Olá ${m.name}! Aqui é da sua mentora na Amada Amante. Tudo bem? Passando pra te dar um apoio com a sua loja. ✨`,
                              )}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Button variant="whatsapp" size="sm"><MessageCircle className="h-4 w-4"/></Button>
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  }) : <p className="text-sm text-muted-foreground">Nenhuma indicada neste nível.</p>}
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
