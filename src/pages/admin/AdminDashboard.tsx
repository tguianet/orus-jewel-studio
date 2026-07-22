import { useEffect, useMemo, useState } from "react";
import { DollarSign, Users, ShoppingBag, AlertTriangle, TrendingUp, Crown } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { wholesaleOrders, sacoleiras, products, formatBRL, statusColors, statusLabels } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { NewProductModal } from "@/components/NewProductModal";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type DashboardOrder = {
  id: string;
  sacoleiraName: string;
  items: number;
  total: number;
  status: string;
  date: string;
};

type DashboardSeller = {
  id: string;
  storeName: string;
  ordersCount: number;
  totalSpent: number;
};

type LowStockProduct = {
  id: string;
  name: string;
  code: string;
  category: string;
  stock: number;
  wholesalePrice: number;
  image: string;
};

const fallbackRecent: DashboardOrder[] = wholesaleOrders.slice(0, 5).map((order) => ({
  id: order.id,
  sacoleiraName: order.sacoleiraName,
  items: order.items,
  total: order.total,
  status: order.status,
  date: order.date,
}));

const fallbackTopSellers: DashboardSeller[] = sacoleiras
  .filter((seller) => seller.status === "approved")
  .sort((a, b) => b.totalSpent - a.totalSpent)
  .map((seller) => ({
    id: seller.id,
    storeName: seller.storeName,
    ordersCount: seller.ordersCount,
    totalSpent: seller.totalSpent,
  }));

const fallbackLowStock: LowStockProduct[] = products
  .filter((product) => product.stock < 10)
  .map((product) => ({
    id: product.id,
    name: product.name,
    code: product.code,
    category: product.category,
    stock: product.stock,
    wholesalePrice: product.wholesalePrice,
    image: product.image,
  }));

const AdminDashboard = () => {
  const [recent, setRecent] = useState<DashboardOrder[]>(fallbackRecent);
  const [topSellers, setTopSellers] = useState<DashboardSeller[]>(fallbackTopSellers);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>(fallbackLowStock);
  const [monthlyRevenue, setMonthlyRevenue] = useState(() => wholesaleOrders.reduce((sum, order) => sum + order.total, 0));
  const [activeSellers, setActiveSellers] = useState(() => fallbackTopSellers.length);
  const [pendingOrders, setPendingOrders] = useState(() => wholesaleOrders.filter((order) => ["aguardando", "novo"].includes(order.status)).length);

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [{ data: orders }, { data: stores }, { data: productRows }] = await Promise.all([
        supabase
          .from("orders")
          .select("id,total,status,created_at,seller_store_id")
          .gte("created_at", monthStart.toISOString())
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("seller_stores")
          .select("id,store_name,status")
          .eq("status", "approved"),
        supabase
          .from("products")
          .select("id,name,code,stock,wholesale_price,image_url,categories(name)")
          .lt("stock", 10)
          .order("stock", { ascending: true })
          .limit(8),
      ]);

      if (!mounted || !orders || !stores || !productRows) return;

      const storeNameById = new Map(stores.map((store) => [store.id, store.store_name]));
      const itemCounts = await Promise.all(
        orders.slice(0, 5).map(async (order) => {
          const { count } = await supabase
            .from("order_items")
            .select("id", { count: "exact", head: true })
            .eq("order_id", order.id);
          return [order.id, count ?? 0] as const;
        })
      );
      if (!mounted) return;

      const countByOrder = new Map(itemCounts);
      const sellerTotals = stores.map((store) => {
        const storeOrders = orders.filter((order) => order.seller_store_id === store.id);
        return {
          id: store.id,
          storeName: store.store_name,
          ordersCount: storeOrders.length,
          totalSpent: storeOrders.reduce((sum, order) => sum + Number(order.total ?? 0), 0),
        };
      }).sort((a, b) => b.totalSpent - a.totalSpent);

      setRecent(orders.slice(0, 5).map((order) => ({
        id: order.id,
        sacoleiraName: storeNameById.get(order.seller_store_id) ?? "Loja Amada Amante",
        items: countByOrder.get(order.id) ?? 0,
        total: Number(order.total ?? 0),
        status: String(order.status),
        date: order.created_at,
      })));
      setTopSellers(sellerTotals.length ? sellerTotals : fallbackTopSellers);
      setLowStock(productRows.map((product) => ({
        id: product.id,
        name: product.name,
        code: product.code,
        category: (product.categories as { name?: string } | null)?.name ?? "Sem categoria",
        stock: product.stock,
        wholesalePrice: Number(product.wholesale_price ?? 0),
        image: product.image_url || "/placeholder.svg",
      })));
      setMonthlyRevenue(orders.reduce((sum, order) => sum + Number(order.total ?? 0), 0));
      setActiveSellers(stores.length);
      setPendingOrders(orders.filter((order) => ["new", "pending", "aguardando"].includes(String(order.status))).length);
    };

    loadDashboard().catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  const revenueTrend = useMemo(() => monthlyRevenue > 0 ? "Atualizado" : undefined, [monthlyRevenue]);

  return (
    <AdminLayout>
      <PageHeader
        eyebrow="Visão geral"
        title="Bem-vinda à Amada Amante"
        description="Resumo das operações da sua rede Amada Amante."
        actions={<NewProductModal />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label="Faturamento (mês)" value={formatBRL(monthlyRevenue)} icon={DollarSign} trend={revenueTrend} hint="pedidos do mês" />
        <StatCard label="Sacoleiras ativas" value={String(activeSellers)} icon={Users} hint="lojas aprovadas" />
        <StatCard label="Pedidos pendentes" value={String(pendingOrders)} icon={ShoppingBag} hint="aguardando ação" />
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
            {topSellers.map((s, i) => (
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
