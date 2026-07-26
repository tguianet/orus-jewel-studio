import { useEffect, useState } from "react";
import { SellerLayout } from "@/layouts/SellerLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { loadOrdersForStore, SellerOrderRow, loadOrderDetail, OrderDetail } from "@/lib/cloudStore";
import { formatBRL } from "@/lib/format";
import { statusColors } from "@/lib/orderStatus";
import { Loader2, MessageCircle, Eye } from "lucide-react";
import { waLink } from "@/lib/whatsapp";

const SellerOrders = () => {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<SellerOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!profile?.storeId) { setLoading(false); return; }
    loadOrdersForStore(profile.storeId).then((o) => { setOrders(o); setLoading(false); });
  }, [profile?.storeId]);

  const openDetail = async (id: string) => {
    setDetailOpen(true);
    setDetail(null);
    setLoadingDetail(true);
    const d = await loadOrderDetail(id);
    setDetail(d);
    setLoadingDetail(false);
  };

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
              <div className="flex items-center gap-3 flex-wrap">
                <div className="text-right"><p className="text-xs text-muted-foreground">Total</p><p className="font-display text-xl text-gold">{formatBRL(o.total)}</p></div>
                <Button variant="outline" size="sm" onClick={() => openDetail(o.id)}>
                  <Eye className="h-4 w-4"/> Ver pedido
                </Button>
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

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do pedido</DialogTitle>
            <DialogDescription>
              {detail ? `${detail.customer} · ${new Date(detail.date).toLocaleString("pt-BR")}` : "Carregando..."}
            </DialogDescription>
          </DialogHeader>

          {loadingDetail || !detail ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2"/> Carregando...
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Cliente</p>
                  <p>{detail.customer}</p>
                  <p className="text-muted-foreground">{detail.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Status</p>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${statusColors[detail.status] || "border-border"}`}>{detail.status}</span>
                </div>
                {detail.address && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Endereço</p>
                    <p className="whitespace-pre-line">{detail.address}</p>
                  </div>
                )}
                {detail.notes && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Observações</p>
                    <p className="whitespace-pre-line">{detail.notes}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Itens</p>
                {detail.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem itens registrados.</p>
                ) : (
                  <div className="border border-border rounded-lg divide-y divide-border">
                    {detail.items.map((it) => (
                      <div key={it.id} className="flex items-center justify-between p-3 text-sm">
                        <div>
                          <p className="font-medium">{it.productName}</p>
                          <p className="text-xs text-muted-foreground">{it.quantity} × {formatBRL(it.unitPrice)}</p>
                        </div>
                        <p className="font-display text-gold">{formatBRL(it.total)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-3 space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatBRL(detail.subtotal)}</span></div>
                {detail.discount > 0 && (
                  <div className="flex justify-between text-muted-foreground"><span>Desconto</span><span>- {formatBRL(detail.discount)}</span></div>
                )}
                <div className="flex justify-between text-base pt-1">
                  <span className="font-medium">Total</span>
                  <span className="font-display text-xl text-gold">{formatBRL(detail.total)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SellerLayout>
  );
};

export default SellerOrders;
