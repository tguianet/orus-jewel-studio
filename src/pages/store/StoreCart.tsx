import { Link, useOutletContext } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { formatBRL } from "@/lib/format";
import type { Sacoleira } from "@/types/commerce";
import { Button } from "@/components/ui/button";

const StoreCart = () => {
  const { store } = useOutletContext<{ store: Sacoleira }>();
  const { items, setQty, remove, total, count } = useCart();

  if (count === 0) {
    return (
      <div className="container py-20 text-center">
        <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="font-display text-3xl mb-2">Seu carrinho está vazio</h2>
        <p className="text-muted-foreground mb-6">Que tal explorar a vitrine?</p>
        <Link to={`/loja/${store.storeSlug}`}><Button variant="gold">Ver vitrine</Button></Link>
      </div>
    );
  }

  return (
    <div className="container py-8 grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-3">
        <h1 className="font-display text-3xl mb-4">Seu carrinho</h1>
        {items.map(i => (
          <div key={i.product.id} className="flex gap-4 rounded-xl border border-border bg-card p-4">
            <img src={i.product.image} alt={i.product.name} className="h-24 w-24 rounded-lg object-cover border border-border" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{i.product.category}</p>
              <h3 className="font-display text-lg leading-tight">{i.product.name}</h3>
              <p className="text-primary font-medium mt-1">{formatBRL(i.price)}</p>
            </div>
            <div className="flex flex-col items-end justify-between">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(i.product.id)}><Trash2 className="h-4 w-4" /></Button>
              <div className="flex items-center border border-border rounded-md">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setQty(i.product.id, i.qty - 1)}><Minus className="h-3 w-3" /></Button>
                <span className="w-8 text-center text-sm">{i.qty}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setQty(i.product.id, i.qty + 1)}><Plus className="h-3 w-3" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-6 h-fit lg:sticky lg:top-20">
        <h3 className="font-display text-xl mb-4">Resumo</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatBRL(total)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Entrega</span><span className="text-muted-foreground">A combinar</span></div>
        </div>
        <div className="my-4 gold-divider" />
        <div className="flex justify-between items-end mb-5">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="font-display text-3xl text-gold">{formatBRL(total)}</span>
        </div>
        <Link to={`/loja/${store.storeSlug}/checkout`}>
          <Button variant="gold" size="lg" className="w-full">Finalizar pedido</Button>
        </Link>
      </div>
    </div>
  );
};

export default StoreCart;
