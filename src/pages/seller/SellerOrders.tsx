import { SellerLayout } from "@/layouts/SellerLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { storeOrders, formatBRL, statusColors, statusLabels } from "@/lib/mockData";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

const markAsPaid = async (orderId: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) {
    toast.info("Pedidos mockados não alteram a wallet real.");
    return;
  }
  const { error } = await supabase.rpc("mark_order_paid", { _order_id: orderId });
  if (error) toast.error("Não foi possível liberar a wallet.");
  else toast.success("Pedido pago: saldo liberado na wallet.");
};

const SellerOrders = () => (
  <SellerLayout>
    <PageHeader eyebrow="Sua loja" title="Pedidos recebidos" description="Pedidos das suas clientes finais via loja virtual." />

    <div className="space-y-3">
      {storeOrders.map(o => (
        <div key={o.id} className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-display text-xl">{o.customer}</p>
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${statusColors[o.status]}`}>{statusLabels[o.status]}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{o.id} · {new Date(o.date).toLocaleDateString("pt-BR")} · {o.items} itens · {o.phone}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-display text-xl text-gold">{formatBRL(o.total)}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => markAsPaid(o.id)}><CheckCircle2 className="h-4 w-4" /> Pago</Button>
              <Button variant="whatsapp" size="sm"><MessageCircle className="h-4 w-4" /> Contatar</Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  </SellerLayout>
);

export default SellerOrders;
