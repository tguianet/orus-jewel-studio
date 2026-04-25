import { useParams, useOutletContext, Link, useNavigate } from "react-router-dom";
import { Minus, Plus, ShoppingBag, ArrowLeft } from "lucide-react";
import { getProductById, formatBRL, Sacoleira } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useState } from "react";
import { toast } from "sonner";

const StoreProduct = () => {
  const { id } = useParams();
  const { store } = useOutletContext<{ store: Sacoleira }>();
  const product = getProductById(id);
  const { add } = useCart();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);

  if (!product) return <div className="container py-16 text-center text-muted-foreground">Produto não encontrado.</div>;

  const handleAdd = () => {
    for (let i = 0; i < qty; i++) add(product, product.suggestedPrice);
    toast.success(`${product.name} adicionado ao carrinho`);
  };

  return (
    <div className="container py-8">
      <Link to={`/loja/${store.storeSlug}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="grid lg:grid-cols-2 gap-10">
        <div className="aspect-square rounded-2xl overflow-hidden border border-border bg-card">
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        </div>

        <div className="flex flex-col">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">{product.category}</p>
          <h1 className="font-display text-4xl sm:text-5xl font-light leading-tight">{product.name}</h1>
          <p className="mt-3 text-sm text-muted-foreground">Cód. {product.code}</p>

          <div className="my-6 gold-divider" />

          <p className="text-muted-foreground leading-relaxed">{product.description}</p>

          <div className="mt-8">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Preço</p>
            <p className="font-display text-5xl font-light text-gold mt-1">{formatBRL(product.suggestedPrice)}</p>
            <p className="text-xs text-muted-foreground mt-1">ou em até 3x sem juros</p>
          </div>

          <div className="mt-8 flex items-center gap-4">
            <div className="flex items-center border border-border rounded-lg">
              <Button variant="ghost" size="icon" className="rounded-r-none" onClick={() => setQty(Math.max(1, qty - 1))}><Minus className="h-4 w-4" /></Button>
              <span className="w-10 text-center font-medium">{qty}</span>
              <Button variant="ghost" size="icon" className="rounded-l-none" onClick={() => setQty(qty + 1)}><Plus className="h-4 w-4" /></Button>
            </div>
            <Button variant="gold" size="lg" className="flex-1" onClick={handleAdd}>
              <ShoppingBag className="h-4 w-4" /> Adicionar ao carrinho
            </Button>
          </div>

          <Button variant="whatsapp" size="lg" className="mt-3" onClick={() => { handleAdd(); navigate(`/loja/${store.storeSlug}/checkout`); }}>
            Comprar pelo WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StoreProduct;
