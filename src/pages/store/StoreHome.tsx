import { Link, useOutletContext } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { categories, formatBRL, getStoreProducts, Sacoleira } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero-jewelry.jpg";
import { CloudStoreProduct, loadStoreProducts } from "@/lib/cloudStore";

const StoreHome = () => {
  const { store } = useOutletContext<{ store: Sacoleira }>();
  const [cloudProducts, setCloudProducts] = useState<CloudStoreProduct[]>([]);
  const mockProducts = getStoreProducts(store.id).slice(0, 8);
  const featured = cloudProducts.length ? cloudProducts : mockProducts;

  useEffect(() => {
    let mounted = true;
    loadStoreProducts(store.id).then((items) => {
      if (mounted) setCloudProducts(items.slice(0, 8));
    });
    return () => { mounted = false; };
  }, [store.id]);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0">
          <img src={heroImg} alt="" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        </div>
        <div className="container relative py-20 lg:py-32">
          <div className="max-w-xl">
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3 flex items-center gap-2">
              <Sparkles className="h-3 w-3" /> Coleção atual
            </p>
            <h1 className="font-display text-5xl sm:text-6xl font-light leading-[1.05]">
              Joias com sua<br /><span className="text-gold italic">história</span>.
            </h1>
            <p className="mt-4 text-muted-foreground max-w-md">
              Curadoria exclusiva de {store.storeName}. Peças folheadas a ouro, selecionadas com carinho para você brilhar todos os dias.
            </p>
            <Button variant="gold" size="xl" className="mt-7" asChild>
              <a href="#vitrine">Ver vitrine <ArrowRight className="h-4 w-4" /></a>
            </Button>
          </div>
        </div>
      </section>

      {/* Categorias */}
      <section className="container py-12">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {categories.map(c => (
            <button key={c.id} className="shrink-0 rounded-full border border-border px-4 py-1.5 text-sm hover:border-primary hover:text-primary transition-colors">
              {c.name}
            </button>
          ))}
        </div>
      </section>

      {/* Vitrine */}
      <section id="vitrine" className="container py-8">
        <div className="text-center mb-10">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">Vitrine</p>
          <h2 className="font-display text-4xl sm:text-5xl font-light">Selecionadas para você</h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map(p => (
            <Link key={p.id} to={`/loja/${store.storeSlug}/produto/${p.id}`} className="group">
              <div className="aspect-square overflow-hidden rounded-xl border border-border mb-3">
                <img src={p.image} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              </div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{p.category}</p>
              <h3 className="font-display text-lg leading-tight mt-1 group-hover:text-primary transition-colors">{p.name}</h3>
              <p className="text-primary font-medium mt-1">{formatBRL(p.resellerPrice)}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Sobre */}
      <section className="container py-16">
        <div className="rounded-2xl border border-primary/20 bg-gradient-gold-soft p-10 lg:p-14 text-center">
          <h3 className="font-display text-3xl sm:text-4xl font-light max-w-xl mx-auto">Cada joia conta uma história. Qual será a sua?</h3>
          <p className="mt-3 text-sm text-muted-foreground">Atendimento personalizado pelo WhatsApp.</p>
        </div>
      </section>
    </>
  );
};

export default StoreHome;
