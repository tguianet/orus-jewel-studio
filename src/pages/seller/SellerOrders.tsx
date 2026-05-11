import { useEffect, useState } from "react";
import { SellerLayout } from "@/layouts/SellerLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { loadOrdersForStore, SellerOrderRow } from "@/lib/cloudStore";
import { formatBRL, statusColors } from "@/lib/mockData";
import { Loader2, MessageCircle } from "lucide-react";
import { waLink } from "@/lib/whatsapp";

const SellerOrders = () => {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<SellerOrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.storeId) { setLoading(false); return; }
    loadOrdersForStore(profile.storeId).then((o) => { setOrders(o); setLoading(false); });
  }, [profile?.storeId]);

  return (
    <SellerLayout>
      <PageHeader eyebrow="Sua loja" title="Pedidos recebidos" description="Pedidos das clientes finais via sua loja virtual." />
      {loading ? <div className="flex items-center justify-center h-40 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2"/> Carregando...</div> :
       orders.length === 0 ? <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">Nenhum pedido ainda. Compartilhe sua loja!</div> : (
      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-display text-xl">{o.customer}</p>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${statusColors[o.status] || "border-border"}`}>{o.status}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{new Date(o.date).toLocaleDateString("pt-BR")} · {o.items} itens · {o.phone}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right"><p className="text-xs text-muted-foreground">Total</p><p className="font-display text-xl text-gold">{formatBRL(o.total)}</p></div>
                <a
                  href={waLink(
                    o.phone,
                    `Olá ${o.customer}! Tudo bem? Recebi seu pedido de ${formatBRL(o.total)} (${o.items} ${o.items === 1 ? "item" : "itens"}) e já estou cuidando de tudo com muito carinho. Qualquer dúvida, é só me chamar por aqui. ✨`,
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="whatsapp" size="sm"><MessageCircle className="h-4 w-4"/> Contatar</Button>
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}
    </SellerLayout>
  );
};

export default SellerOrders;
