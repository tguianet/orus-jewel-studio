import { SellerLayout } from "@/layouts/SellerLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { storeOrders, formatBRL, statusColors, statusLabels } from "@/lib/mockData";
import { MessageCircle } from "lucide-react";

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
              <Button variant="whatsapp" size="sm"><MessageCircle className="h-4 w-4" /> Contatar</Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  </SellerLayout>
);

export default SellerOrders;
