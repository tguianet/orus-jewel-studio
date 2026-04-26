import { UserPlus, ExternalLink, Crown } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { sacoleiras, formatBRL } from "@/lib/mockData";
import { Link } from "react-router-dom";

const tone: Record<string, string> = {
  approved: "bg-success/15 text-success border-success/30",
  pending: "bg-warning/15 text-warning border-warning/30",
  blocked: "bg-destructive/15 text-destructive border-destructive/30",
};
const tierTone: Record<string, string> = {
  "VIP": "bg-gradient-gold text-primary-foreground border-transparent",
  "padrão": "bg-secondary text-muted-foreground border-border",
  "personalizado": "bg-primary/15 text-primary border-primary/30",
};

const AdminSellers = () => (
  <AdminLayout>
    <PageHeader
      eyebrow="Rede de revenda"
      title="Sacoleiras"
      description="Aprove, bloqueie e acompanhe revendedoras da Aura Store Suite."
      actions={<Button variant="gold"><UserPlus className="h-4 w-4" /> Nova sacoleira</Button>}
    />

    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-left">
              <th className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Sacoleira</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium hidden md:table-cell">Loja</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Status</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium hidden lg:table-cell">Tier</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium hidden sm:table-cell text-right">Total comprado</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sacoleiras.map(s => (
              <tr key={s.id} className="hover:bg-secondary/30 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gradient-gold-soft border border-primary/30 flex items-center justify-center text-primary text-sm font-medium">
                      {s.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 hidden md:table-cell">
                  <p className="font-medium">{s.storeName}</p>
                  <p className="text-xs text-muted-foreground">/loja/{s.storeSlug}</p>
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${tone[s.status]}`}>
                    {s.status === "approved" ? "Aprovada" : s.status === "pending" ? "Pendente" : "Bloqueada"}
                  </span>
                </td>
                <td className="px-5 py-4 hidden lg:table-cell">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${tierTone[s.tier]}`}>
                    {s.tier === "VIP" && <Crown className="h-3 w-3" />} {s.tier}
                  </span>
                </td>
                <td className="px-5 py-4 hidden sm:table-cell text-right">
                  <p className="font-medium text-primary">{formatBRL(s.totalSpent)}</p>
                  <p className="text-xs text-muted-foreground">{s.ordersCount} pedidos</p>
                </td>
                <td className="px-5 py-4 text-right">
                  <Link to={`/loja/${s.storeSlug}`} target="_blank">
                    <Button variant="ghost" size="icon" className="h-8 w-8"><ExternalLink className="h-4 w-4" /></Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </AdminLayout>
);

export default AdminSellers;
