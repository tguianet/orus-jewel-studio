import { useEffect, useMemo, useState } from "react";
import { DollarSign, Users, ShoppingBag, AlertTriangle, TrendingUp, Crown } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { formatBRL } from "@/lib/format";
import { statusColors, statusLabels } from "@/lib/orderStatus";
import { Button } from "@/components/ui/button";
import { NewProductModal } from "@/components/NewProductModal";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchAdminSalesSummary, fetchAdminWithdrawalReport } from "@/lib/reports/api";
import { resolveReportRange } from "@/lib/reports/periods";

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

const AdminDashboard = () => {
  const [recent, setRecent] = useState<DashboardOrder[]>([]);
  const [topSellers, setTopSellers] = useState<DashboardSeller[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [netRevenue, setNetRevenue] = useState(0);
  const [paidOrders, setPaidOrders] = useState(0);
  const [avgTicket, setAvgTicket] = useState(0);
  const [returnsAmount, setReturnsAmount] = useState(0);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);
  const [activeSellers, setActiveSellers] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      const monthRange = resolveReportRange("current_month");

      const [ordersRes, storesRes, productRowsRes, salesSummary, withdrawalSummary] = await Promise.all([
        supabase
          .from("orders")
          .select("id,total,status,created_at,seller_store_id")
          .gte("created_at", monthRange.start.toISOString())
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
        fetchAdminSalesSummary({ start: monthRange.start, end: monthRange.end }).catch(() => null),
        fetchAdminWithdrawalReport({ start: monthRange.start, end: monthRange.end }).catch(() => null),
      ]);

      if (ordersRes.error || storesRes.error || productRowsRes.error) {
        throw new Error(
          ordersRes.error?.message ||
            storesRes.error?.message ||
            productRowsRes.error?.message ||
            "Não foi possível carregar o dashboard.",
        );
      }

      const orders = ordersRes.data ?? [];
      const stores = storesRes.data ?? [];
      const productRows = productRowsRes.data ?? [];

      const storeNameById = new Map(stores.map((store) => [store.id, store.store_name]));
      const itemCounts = await Promise.all(
        orders.slice(0, 5).map(async (order) => {
          const { count } = await supabase
            .from("order_items")
            .select("id", { count: "exact", head: true })
            .eq("order_id", order.id);
          return [order.id, count ?? 0] as const;
        }),
      );
      if (!mounted) return;

      const countByOrder = new Map(itemCounts);
      const sellerTotals = stores
        .map((store) => {
          const storeOrders = orders.filter((order) => order.seller_store_id === store.id);
          return {
            id: store.id,
            storeName: store.store_name,
            ordersCount: storeOrders.length,
            totalSpent: storeOrders.reduce((sum, order) => sum + Number(order.total ?? 0), 0),
          };
        })
        .sort((a, b) => b.totalSpent - a.totalSpent);

      setRecent(
        orders.slice(0, 5).map((order) => ({
          id: order.id,
          sacoleiraName: storeNameById.get(order.seller_store_id) ?? "Loja sem nome",
          items: countByOrder.get(order.id) ?? 0,
          total: Number(order.total ?? 0),
          status: String(order.status),
          date: order.created_at,
        })),
      );
      setTopSellers(sellerTotals);
      setLowStock(
        productRows.map((product) => ({
          id: product.id,
          name: product.name,
          code: product.code,
          category: (product.categories as { name?: string } | null)?.name ?? "Sem categoria",
          stock: product.stock,
          wholesalePrice: Number(product.wholesale_price ?? 0),
          image: product.image_url || "/placeholder.svg",
        })),
      );
      if (salesSummary) {
        setMonthlyRevenue(salesSummary.gross_revenue);
        setNetRevenue(salesSummary.net_revenue);
        setPaidOrders(salesSummary.paid_orders_count);
        setAvgTicket(salesSummary.average_ticket);
        setReturnsAmount(salesSummary.returns_amount ?? 0);
        setPendingOrders(salesSummary.pending_orders_count);
      } else {
        setMonthlyRevenue(
          orders
            .filter((o) => ["paid", "separated", "shipped", "delivered"].includes(String(o.status)))
            .reduce((sum, order) => sum + Number(order.total ?? 0), 0),
        );
        setPendingOrders(
          orders.filter((order) => ["new", "confirmed"].includes(String(order.status))).length,
        );
      }
      setPendingWithdrawals(Number(withdrawalSummary?.pending_count ?? 0));
      setActiveSellers(stores.length);
    };

    loadDashboard()
      .catch((err: unknown) => {
        if (!mounted) return;
        setRecent([]);
        setTopSellers([]);
        setLowStock([]);
        setMonthlyRevenue(0);
        setNetRevenue(0);
        setPaidOrders(0);
        setAvgTicket(0);
        setReturnsAmount(0);
        setPendingWithdrawals(0);
        setActiveSellers(0);
        setPendingOrders(0);
        setError(err instanceof Error ? err.message : "Não foi possível carregar o dashboard.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const revenueTrend = useMemo(() => (monthlyRevenue > 0 ? "Atualizado" : undefined), [monthlyRevenue]);

  return (
    <AdminLayout>
      <PageHeader
        eyebrow="Visão geral"
        title="Bem-vinda à Amada Amante"
        description="Resumo das operações da sua rede Amada Amante."
        actions={<NewProductModal />}
      />

      {error && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mb-3 flex justify-end print:hidden">
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/relatorios">Ver relatórios</Link>
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <StatCard
          label="Faturamento bruto (mês)"
          value={loading ? "…" : formatBRL(monthlyRevenue)}
          icon={DollarSign}
          trend={revenueTrend}
          hint="pedidos pagos confirmados"
        />
        <StatCard
          label="Receita líquida"
          value={loading ? "…" : formatBRL(netRevenue)}
          icon={TrendingUp}
          hint="bruto − reembolsos − devoluções"
        />
        <StatCard
          label="Pedidos pagos"
          value={loading ? "…" : String(paidOrders)}
          icon={ShoppingBag}
          hint={`ticket médio ${loading ? "…" : formatBRL(avgTicket)}`}
        />
        <StatCard
          label="Estoque crítico/baixo"
          value={loading ? "…" : String(lowStock.length)}
          icon={AlertTriangle}
          hint="amostra abaixo de 10 un."
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          label="Sacoleiras ativas"
          value={loading ? "…" : String(activeSellers)}
          icon={Users}
          hint="lojas aprovadas"
        />
        <StatCard
          label="Pedidos pendentes"
          value={loading ? "…" : String(pendingOrders)}
          icon={ShoppingBag}
          hint="new/confirmed"
        />
        <StatCard
          label="Saques pendentes"
          value={loading ? "…" : String(pendingWithdrawals)}
          icon={DollarSign}
          hint="mês atual"
        />
        <StatCard
          label="Devoluções (R$)"
          value={loading ? "…" : formatBRL(returnsAmount)}
          icon={AlertTriangle}
          hint="financeiras no mês"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Recent orders */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl">Pedidos recentes</h3>
              <p className="text-xs text-muted-foreground">Últimos 5 pedidos do atacado</p>
            </div>
            <Link to="/admin/pedidos">
              <Button variant="ghost" size="sm">
                Ver todos
              </Button>
            </Link>
          </div>
          <div className="divide-y divide-border">
            {loading && (
              <p className="px-5 py-8 text-sm text-muted-foreground text-center">Carregando pedidos…</p>
            )}
            {!loading && !error && recent.length === 0 && (
              <p className="px-5 py-8 text-sm text-muted-foreground text-center">Nenhum pedido neste mês.</p>
            )}
            {!loading &&
              recent.map((o) => (
                <div
                  key={o.id}
                  className="px-5 py-3.5 flex items-center justify-between hover:bg-secondary/40 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{o.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.sacoleiraName} · {o.items} itens
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatBRL(o.total)}</p>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${statusColors[o.status] ?? "bg-muted text-muted-foreground border-border"}`}
                    >
                      {statusLabels[o.status] ?? o.status}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Top sellers */}
        <div className="rounded-xl border border-border bg-card">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-display text-xl flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" /> Top sacoleiras
            </h3>
            <p className="text-xs text-muted-foreground">Mais ativas neste mês</p>
          </div>
          <div className="p-3 space-y-1">
            {loading && <p className="p-4 text-sm text-muted-foreground text-center">Carregando…</p>}
            {!loading && !error && topSellers.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground text-center">Nenhuma sacoleira ativa ainda.</p>
            )}
            {!loading &&
              topSellers.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/40 transition-colors">
                  <div className="h-9 w-9 rounded-full bg-gradient-gold-soft border border-primary/30 flex items-center justify-center text-primary font-medium text-sm">
                    {i + 1}
                  </div>
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
            <h3 className="font-display text-xl flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-warning" /> Estoque baixo
            </h3>
            <p className="text-xs text-muted-foreground">Produtos com menos de 10 unidades</p>
          </div>
        </div>
        <div className="divide-y divide-border">
          {loading && <p className="px-5 py-8 text-sm text-muted-foreground text-center">Carregando estoque…</p>}
          {!loading && !error && lowStock.length === 0 && (
            <p className="px-5 py-8 text-sm text-muted-foreground text-center">Nenhum produto com estoque baixo.</p>
          )}
          {!loading &&
            lowStock.map((p) => (
              <div key={p.id} className="px-5 py-3 flex items-center gap-4">
                <img
                  src={p.image}
                  alt={p.name}
                  loading="lazy"
                  className="h-12 w-12 rounded-md object-cover border border-border"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.code} · {p.category}
                  </p>
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
