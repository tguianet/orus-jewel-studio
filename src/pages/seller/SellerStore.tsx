import { ExternalLink, Share2, Check, MessageCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SellerLayout } from "@/layouts/SellerLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  buildWhatsAppShareHref,
  officialStoreUrl,
} from "@/lib/storeShare";

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const SellerStore = () => {
  const { profile } = useAuth();
  const slug = profile?.storeSlug;
  const storeId = profile?.storeId;
  const storePath = slug ? `/loja/${slug}` : null;
  const fullUrl = useMemo(() => (slug ? officialStoreUrl(slug) : ""), [slug]);
  const whatsappHref = useMemo(
    () => (slug ? buildWhatsAppShareHref(slug) : ""),
    [slug],
  );
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<{ products: number; orders: number; revenue: number } | null>(null);

  useEffect(() => {
    if (!storeId) return;
    (async () => {
      const [{ count: products }, ordersRes] = await Promise.all([
        supabase
          .from("store_products")
          .select("id", { count: "exact", head: true })
          .eq("seller_store_id", storeId)
          .eq("active", true),
        supabase
          .from("orders")
          .select("total,status")
          .eq("seller_store_id", storeId),
      ]);
      type StoreOrderStat = { total: number; status: string };
      const orders = (ordersRes.data ?? []) as StoreOrderStat[];
      const revenue = orders
        .filter((o) => ["paid", "confirmed", "shipped", "delivered"].includes(o.status))
        .reduce((s, o) => s + Number(o.total || 0), 0);
      setStats({ products: products ?? 0, orders: orders.length, revenue });
    })();
  }, [storeId]);

  const handleCopy = async () => {
    if (!fullUrl) return;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <SellerLayout>
      <PageHeader
        eyebrow="Sua presença online"
        title="Minha loja"
        description="Visão geral da sua loja virtual pública."
        actions={
          storePath ? (
            <Link to={storePath} target="_blank" rel="noopener noreferrer">
              <Button variant="gold"><ExternalLink className="h-4 w-4" /> Abrir loja</Button>
            </Link>
          ) : (
            <Button variant="gold" disabled><ExternalLink className="h-4 w-4" /> Abrir loja</Button>
          )
        }
      />

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
          <div className="aspect-[16/7] bg-gradient-gold relative">
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
            <div className="absolute bottom-6 left-6">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary-foreground/80">
                {profile?.displayName || "sua loja"}
              </p>
              <h2 className="font-display text-3xl text-primary-foreground">Joias com sua história</h2>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">URL pública da sua loja</p>
                {storePath ? (
                  <a
                    href={storePath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-sm text-primary hover:underline truncate block"
                  >
                    {fullUrl}
                  </a>
                ) : (
                  <p className="font-mono text-sm text-muted-foreground">
                    Sua loja ainda está sendo configurada
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={handleCopy} disabled={!storePath}>
                  {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                  {copied ? "Copiado" : "Copiar"}
                </Button>
                <a
                  href={whatsappHref || undefined}
                  target="_blank"
                  rel="noreferrer"
                  className={!storePath ? "pointer-events-none opacity-50" : ""}
                >
                  <Button variant="whatsapp" size="sm" disabled={!storePath}>
                    <MessageCircle className="h-4 w-4" /> Compartilhar
                  </Button>
                </a>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3 pt-2">
              <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Produtos ativos</p><p className="font-display text-2xl">{stats ? stats.products : "—"}</p></div>
              <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Pedidos</p><p className="font-display text-2xl">{stats ? stats.orders : "—"}</p></div>
              <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Receita</p><p className="font-display text-2xl">{stats ? formatBRL(stats.revenue) : "—"}</p></div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Link to="/sacoleira/studio-v2" className="block rounded-xl border border-primary/50 bg-primary/5 p-5 hover:border-primary transition-all relative overflow-hidden">
            <span className="absolute top-3 right-3 text-[9px] uppercase tracking-widest bg-primary text-primary-foreground rounded-full px-2 py-0.5">Novo</span>
            <h4 className="font-display text-lg">Studio V2</h4>
            <p className="text-xs text-muted-foreground mt-1">Editor visual — clique e edite sua loja direto na página</p>
          </Link>
          <Link to="/sacoleira/personalizacao" className="block rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-all">
            <h4 className="font-display text-lg">Personalizar visual</h4>
            <p className="text-xs text-muted-foreground mt-1">Logo, banner e cores</p>
          </Link>
          <Link to="/sacoleira/catalogo" className="block rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-all">
            <h4 className="font-display text-lg">Adicionar produtos</h4>
            <p className="text-xs text-muted-foreground mt-1">Selecione do catálogo Amada Amante</p>
          </Link>
          <Link to="/sacoleira/meus-produtos" className="block rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-all">
            <h4 className="font-display text-lg">Definir preços</h4>
            <p className="text-xs text-muted-foreground mt-1">Sua margem, sua escolha</p>
          </Link>
        </div>
      </div>
    </SellerLayout>
  );
};

export default SellerStore;
