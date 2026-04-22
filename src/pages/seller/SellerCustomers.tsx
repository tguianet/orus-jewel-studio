import { SellerLayout } from "@/layouts/SellerLayout";
import { PageHeader } from "@/components/PageHeader";
import { Heart } from "lucide-react";
import { storeOrders, formatBRL } from "@/lib/mockData";

const SellerCustomers = () => (
  <SellerLayout>
    <PageHeader eyebrow="Relacionamento" title="Clientes" description="Quem confia na sua curadoria." />

    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {storeOrders.map(c => (
        <div key={c.id} className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-11 w-11 rounded-full bg-gradient-gold-soft border border-primary/30 flex items-center justify-center text-primary font-medium">
              {c.customer.charAt(0)}
            </div>
            <div>
              <p className="font-medium">{c.customer}</p>
              <p className="text-xs text-muted-foreground">{c.phone}</p>
            </div>
            <Heart className="h-4 w-4 text-primary ml-auto" />
          </div>
          <div className="flex items-center justify-between text-sm pt-3 border-t border-border">
            <span className="text-muted-foreground">1 pedido</span>
            <span className="font-medium text-primary">{formatBRL(c.total)}</span>
          </div>
        </div>
      ))}
    </div>
  </SellerLayout>
);

export default SellerCustomers;
