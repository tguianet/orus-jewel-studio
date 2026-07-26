import { useParams, useOutletContext, Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, ShoppingBag, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { formatBRL } from "@/lib/format";
import type { Sacoleira } from "@/types/commerce";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { CloudStoreProduct, loadStoreProducts } from "@/lib/cloudStore";

const StoreProduct = () => {
  const { id } = useParams();
  const { store } = useOutletContext<{ store: Sacoleira }>();
  const [cloudProducts, setCloudProducts] = useState<CloudStoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const product = cloudProducts.find((item) => item.id === id) ?? null;
  const resellerPrice = product?.resellerPrice ?? product?.suggestedPrice ?? 0;
  const { add } = useCart();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    loadStoreProducts(store.id)
      .then((items) => {
        if (!mounted) return;
        setCloudProducts(items);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setCloudProducts([]);
        setError(err instanceof Error ? err.message : "Não foi possível carregar o produto.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [store.id]);

  const gallery = useMemo(() => {
    if (!product) return [] as string[];
    if (product.images && product.images.length) return product.images;
    return product.image ? [product.image] : [];
  }, [product]);

  useEffect(() => {
    setSlide(0);
  }, [product?.id]);

  if (loading) {
    return (
      <div className="container py-16 flex justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-muted border-t-foreground animate-spin" aria-label="Carregando produto" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-16 text-center space-y-3">
        <p className="text-destructive text-sm">{error}</p>
        <Link to={`/loja/${store.storeSlug}`} className="text-sm text-muted-foreground hover:text-primary">
          Voltar à loja
        </Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container py-16 text-center space-y-3">
        <p className="text-muted-foreground">Produto não encontrado.</p>
        <Link to={`/loja/${store.storeSlug}`} className="text-sm text-primary hover:underline">
          Voltar à loja
        </Link>
      </div>
    );
  }

  const handleAdd = () => {
    for (let i = 0; i < qty; i++) add(product, resellerPrice);
    toast.success(`${product.name} adicionado ao carrinho`);
  };

  const prev = () => setSlide((s) => (s - 1 + gallery.length) % gallery.length);
  const next = () => setSlide((s) => (s + 1) % gallery.length);

  return (
    <div className="container py-8">
      <Link to={`/loja/${store.storeSlug}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="grid lg:grid-cols-2 gap-10">
        <div className="space-y-3">
          <div className="relative aspect-square rounded-2xl overflow-hidden border border-border bg-card">
            <div className="flex h-full w-full transition-transform duration-500 ease-out" style={{ transform: `translateX(-${slide * 100}%)` }}>
              {gallery.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`${product.name} ${i + 1}`}
                  width={800}
                  height={800}
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  className="h-full w-full flex-shrink-0 object-cover"
                />
              ))}
            </div>
            {gallery.length > 1 && (
              <>
                <button type="button" onClick={prev} aria-label="Anterior" className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/80 backdrop-blur border border-border flex items-center justify-center hover:bg-background">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button type="button" onClick={next} aria-label="Próximo" className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/80 backdrop-blur border border-border flex items-center justify-center hover:bg-background">
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {gallery.map((_, i) => (
                    <button key={i} type="button" onClick={() => setSlide(i)} aria-label={`Foto ${i + 1}`} className={`h-1.5 rounded-full transition-all ${i === slide ? "w-6 bg-primary" : "w-1.5 bg-background/70"}`} />
                  ))}
                </div>
              </>
            )}
          </div>
          {gallery.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {gallery.map((src, i) => (
                <button key={i} type="button" onClick={() => setSlide(i)} className={`h-16 w-16 flex-shrink-0 rounded-md overflow-hidden border-2 transition-colors ${i === slide ? "border-primary" : "border-border"}`}>
                  <img src={src} alt="" width={80} height={80} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">{product.category}</p>
          <h1 className="font-display text-4xl sm:text-5xl font-light leading-tight">{product.name}</h1>
          <p className="mt-3 text-sm text-muted-foreground">Cód. {product.code}</p>

          <div className="my-6 gold-divider" />

          <p className="text-muted-foreground leading-relaxed">{product.description}</p>

          <div className="mt-8">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Preço</p>
            <p className="font-display text-5xl font-light text-gold mt-1">{formatBRL(resellerPrice)}</p>
            <p className="text-xs text-muted-foreground mt-1">ou em até 3x sem juros</p>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center border border-border rounded-lg self-start">
              <Button variant="ghost" size="icon" className="rounded-r-none" onClick={() => setQty(Math.max(1, qty - 1))}><Minus className="h-4 w-4" /></Button>
              <span className="w-10 text-center font-medium">{qty}</span>
              <Button variant="ghost" size="icon" className="rounded-l-none" onClick={() => setQty(qty + 1)}><Plus className="h-4 w-4" /></Button>
            </div>
            <Button variant="gold" size="lg" className="flex-1 w-full sm:w-auto whitespace-normal text-sm sm:text-base" onClick={handleAdd}>
              <ShoppingBag className="h-4 w-4" /> Adicionar ao carrinho
            </Button>
          </div>

          <Button variant="whatsapp" size="lg" className="mt-3 w-full" onClick={() => { handleAdd(); navigate(`/loja/${store.storeSlug}/checkout`); }}>
            Comprar pelo WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StoreProduct;
