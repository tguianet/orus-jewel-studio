import { useEffect, useMemo, useState } from "react";
import { ShoppingBag, DollarSign, Heart, ExternalLink, Wallet } from "lucide-react";
import { SellerLayout } from "@/layouts/SellerLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { SellerReferralCodeCard } from "@/components/seller/SellerReferralCodeCard";
import { formatBRL } from "@/lib/format";
import { statusColors, statusLabels } from "@/lib/orderStatus";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type SellerOrderRow = {
  id: string;
  customer: string;
  items: number;
  total: number;
  status: string;
};

const SellerDashboard = () => {
  const [orders, setOrders] = useState<SellerOrderRow[]>([]);
  const [monthlySales, setMonthlySales] = useState(0);
  const [pendingCommissions, setPendingCommissions] = useState(0);
  const [availableWallet, setAvailableWallet] = useState(0);
  const [storeSlug, setStoreSlug] = useState("");
  const [storeName, setStoreName] = useState("Minha loja");
  const [displayName, setDisplayName] = useState("Sacoleira");
  const [productCount, setProductCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const userId = authData?.user?.id;
      if (!userId) throw new Error("Faça login para ver o painel da sacoleira.");

      const { data: stores, error: storesError } = await supabase
        .from("seller_stores")
        .select("id,store_name,store_slug,reseller_id,resellers(display_name)")
        .eq("owner_user_id", userId)
        .limit(1);

      if (storesError) throw storesError;

      const store = stores?.[0];
      if (!store) throw new Error("Nenhuma loja encontrada para esta conta.");

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [orderRes, commissionRes, productsCountRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id,customer_name,total,status,created_at")
          .eq("seller_store_id", store.id)
          .gte("created_at", monthStart.toISOString())
          .order("created_at", { ascending: false })
          .limit(20),
        store.reseller_id
          ? supabase.from("wallet_transactions").select("amount,status").eq("reseller_id", store.reseller_id)
          : Promise.resolve({ data: [] as { amount: number; status: string }[], error: null }),
        supabase
          .from("store_products")
          .select("id", { count: "exact", head: true })
          .eq("seller_store_id", store.id)
          .eq("active", true),
      ]);

      if (orderRes.error) throw orderRes.error;
      if (commissionRes.error) throw commissionRes.error;
      if (productsCountRes.error) throw productsCountRes.error;

      const orderRows = orderRes.data ?? [];
      const itemCounts = await Promise.all(
        orderRows.slice(0, 5).map(async (order) => {
          const { count } = await supabase
            .from("order_items")
            .select("id", { count: "exact", head: true })
            .eq("order_id", order.id);
          return [order.id, count ?? 0] as const;
        }),
      );
      if (!mounted) return;

      const countByOrder = new Map(itemCounts);
      const walletRows = commissionRes.data ?? [];

      setStoreSlug(store.store_slug);
      setStoreName(store.store_name);
      setDisplayName((store.resellers as { display_name?: string } | null)?.display_name ?? "Sacoleira");
      setOrders(
        orderRows.slice(0, 5).map((order) => ({
          id: order.id,
          customer: order.customer_name,
          items: countByOrder.get(order.id) ?? 0,
          total: Number(order.total ?? 0),
          status: String(order.status),
        })),
      );
      setMonthlySales(orderRows.reduce((sum, order) => sum + Number(order.total ?? 0), 0));
      setPendingCommissions(
        walletRows
          .filter((row) => row.status === "pending")
          .reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
      );
      setAvailableWallet(
        walletRows
          .filter((row) => row.status === "available")
          .reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
      );
      setProductCount(productsCountRes.count ?? 0);
    };

    loadDashboard()
      .catch((err: unknown) => {
        if (!mounted) return;
        setOrders([]);
        setMonthlySales(0);
        setPendingCommissions(0);
        setAvailableWallet(0);
        setProductCount(0);
        setError(err instanceof Error ? err.message : "Não foi possível carregar o painel.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const firstName = useMemo(() => displayName.split(" ")[0] || "Sacoleira", [displayName]);

  return (
    <SellerLayout>
      <PageHeader
        eyebrow={storeName}
        title={`Bem-vinda, ${firstName}`}
        description="Resumo da sua loja virtual, pedidos, comissões e wallet."
        actions={
          storeSlug ? (
            <Link to={`/loja/${storeSlug}`} target="_blank">
              <Button variant="goldOutline">
                <ExternalLink className="h-4 w-4" /> Ver minha loja
              </Button>
            </Link>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <SellerReferralCodeCard />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          label="Vendas (mês)"
          value={loading ? "…" : formatBRL(monthlySales)}
          icon={DollarSign}
          hint="pedidos pagos e novos"
        />
        <StatCard
          label="Pedidos novos"
          value={loading ? "…" : String(orders.filter((order) => ["new", "novo"].includes(order.status)).length)}
          icon={ShoppingBag}
          hint="aguardando contato"
        />
        <StatCard
          label="Wallet disponível"
          value={loading ? "…" : formatBRL(availableWallet)}
          icon={Wallet}
          hint="saldo liberado"
        />
        <StatCard
          label="Comissões pendentes"
          value={loading ? "…" : formatBRL(pendingCommissions)}
          icon={Heart}
          hint="aguardando pagamento"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-display text-xl">Pedidos recentes</h3>
            <Link to="/sacoleira/pedidos">
              <Button variant="ghost" size="sm">
                Ver todos
              </Button>
            </Link>
          </div>
          <div className="divide-y divide-border">
            {loading && (
              <p className="px-5 py-8 text-sm text-muted-foreground text-center">Carregando pedidos…</p>
            )}
            {!loading && !error && orders.length === 0 && (
              <p className="px-5 py-8 text-sm text-muted-foreground text-center">Nenhum pedido neste mês.</p>
            )}
            {!loading &&
              orders.map((o) => (
                <div key={o.id} className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{o.customer}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.id} · {o.items} itens
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

        <div className="rounded-xl border border-primary/20 bg-gradient-gold-soft p-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">Próximo passo</p>
          <h3 className="font-display text-2xl mb-2">Adicione mais brilho à sua vitrine</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Você está exibindo {loading ? "…" : productCount} produtos. Adicione novos do catálogo Amada Amante para
            atrair mais clientes.
          </p>
          <Link to="/sacoleira/catalogo">
            <Button variant="gold" className="w-full">
              Explorar catálogo
            </Button>
          </Link>
        </div>
      </div>
    </SellerLayout>
  );
};

export default SellerDashboard;
