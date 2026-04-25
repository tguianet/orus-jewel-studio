import { DollarSign, Users, ShoppingBag, AlertTriangle, TrendingUp, Crown } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { wholesaleOrders, sacoleiras, products, formatBRL, statusColors, statusLabels } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { NewProductModal } from "@/components/NewProductModal";
import { Link } from "react-router-dom";

const AdminDashboard = () => {
  const lowStock = products.filter(p => p.stock < 10);
  const recent = wholesaleOrders.slice(0, 5);

  return (
    <AdminLayout>
      <PageHeader
        eyebrow="Visão geral"
        title="Bem-vinda ao seu atacado"
        description="Resumo das operações da sua rede Orus."
        actions={<NewProductModal />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label="Faturamento (mês)" value={formatBRL(24890)} icon={DollarSign} trend="+12,4%" hint="vs mês anterior" />
        <StatCard label="Sacoleiras ativas" value="42" icon={Users} trend="+3" hint="esta semana" />
        <StatCard label="Pedidos pendentes" value="7" icon={ShoppingBag} hint="aguardando ação" />
        <StatCard label="Estoque baixo" value={String(lowStock.length)} icon={AlertTriangle} hint="produtos a repor" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Recent orders */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl">Pedidos recentes</h3>
              <p className="text-xs text-muted-foreground">Últimos 5 pedidos do atacado</p>
            </div>
            <Link to="/admin/pedidos"><Button variant="ghost" size="sm">Ver todos</Button></Link>
          </div>
          <div className="divide-y divide-border">
            {recent.map(o => (
              <div key={o.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-secondary/40 transition-colors">
                <div>
                  <p className="text-sm font-medium">{o.id}</p>
                  <p className="text-xs text-muted-foreground">{o.sacoleiraName} · {o.items} itens</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatBRL(o.total)}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${statusColors[o.status]}`}>{statusLabels[o.status]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top sellers */}
        <div className="rounded-xl border border-border bg-card">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-display text-xl flex items-center gap-2"><Crown className="h-4 w-4 text-primary" /> Top sacoleiras</h3>
            <p className="text-xs text-muted-foreground">Mais ativas neste mês</p>
          </div>
          <div className="p-3 space-y-1">
            {sacoleiras.filter(s => s.status === "approved").sort((a,b) => b.totalSpent - a.totalSpent).map((s, i) => (
              <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/40 transition-colors">
                <div className="h-9 w-9 rounded-full bg-gradient-gold-soft border border-primary/30 flex items-center justify-center text-primary font-medium text-sm">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.storeName}</p>
                  <p className="text-xs text-muted-foreground">{s.ordersCount} pedidos</p>
                </div>
                <p className="text-sm font-medium text-primary">{formatBRL(s.totalSpent)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Low stock */}
      <div className="mt-5 rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-display text-xl flex items-center gap-2"><TrendingUp className="h-4 w-4 text-warning" /> Estoque baixo</h3>
            <p className="text-xs text-muted-foreground">Produtos com menos de 10 unidades</p>
          </div>
        </div>
        <div className="divide-y divide-border">
          {lowStock.map(p => (
            <div key={p.id} className="px-5 py-3 flex items-center gap-4">
              <img src={p.image} alt={p.name} loading="lazy" className="h-12 w-12 rounded-md object-cover border border-border" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.code} · {p.category}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-warning">{p.stock} un.</p>
                <p className="text-xs text-muted-foreground">{formatBRL(p.wholesalePrice)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
