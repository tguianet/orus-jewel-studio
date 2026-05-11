import { Link, useOutletContext } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Sparkles, Instagram, MessageCircle, Heart, Truck, ShieldCheck } from "lucide-react";
import { formatBRL, getStoreProducts, Sacoleira } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero-jewelry.jpg";
import { CloudStoreProduct, loadStoreProducts } from "@/lib/cloudStore";
import { DEFAULT_BANNER, StoreTheme, defaultTheme } from "@/lib/storeTheme";

type StoreCtx = { store: Sacoleira; theme?: StoreTheme; banner?: string };

const StoreHome = () => {
  const { store, theme, banner } = useOutletContext<StoreCtx>();
  const t = { ...defaultTheme, ...(theme || {}) };
  const heroBanner = banner || t.bannerUrl || DEFAULT_BANNER || heroImg;
  const [cloudProducts, setCloudProducts] = useState<CloudStoreProduct[]>([]);
  const [activeCat, setActiveCat] = useState<string>("Todos");
  const mockProducts = getStoreProducts(store.id);
  const allProducts: CloudStoreProduct[] | any[] = cloudProducts.length ? cloudProducts : mockProducts;

  useEffect(() => {
    let mounted = true;
    loadStoreProducts(store.id).then((items) => {
      if (mounted) setCloudProducts(items);
    });
    return () => { mounted = false; };
  }, [store.id]);

  const cats = useMemo(() => {
    const set = new Set<string>();
    allProducts.forEach((p: any) => p.category && set.add(p.category));
    return ["Todos", ...Array.from(set)];
  }, [allProducts]);

  const filtered = activeCat === "Todos"
    ? allProducts
    : allProducts.filter((p: any) => p.category === activeCat);

  const collections = cats.filter((c) => c !== "Todos").slice(0, 6);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0">
          <img src={heroBanner} alt={`Banner ${store.storeName}`} className="w-full h-full object-cover opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        </div>
        <div className="container relative py-20 lg:py-32">
          <div className="max-w-xl">
            <p className="text-[10px] uppercase tracking-[0.3em] mb-3 flex items-center gap-2" style={{ color: t.primaryColor }}>
              <Sparkles className="h-3 w-3" /> Coleção atual
            </p>
            <h1 className="font-display text-5xl sm:text-6xl font-light leading-[1.05]">
              {store.storeName}
            </h1>
            <p className="mt-4 text-muted-foreground max-w-md">
              {t.description || `Curadoria exclusiva de ${store.storeName}. Peças folheadas a ouro, selecionadas com carinho para você brilhar todos os dias.`}
            </p>
            <div className="flex flex-wrap gap-3 mt-7">
              <Button variant="gold" size="xl" asChild>
                <a href="#vitrine">Ver vitrine <ArrowRight className="h-4 w-4" /></a>
              </Button>
              <Button variant="outline" size="xl" asChild>
                <a href="#sobre">Sobre a loja</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits strip */}
      <section className="border-b border-border/50 bg-secondary/20">
        <div className="container grid grid-cols-2 md:grid-cols-3 gap-4 py-5 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground"><Truck className="h-4 w-4 text-primary" /> Envio para todo Brasil</div>
          <div className="flex items-center gap-2 text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" /> Garantia da folheação</div>
          <div className="flex items-center gap-2 text-muted-foreground"><Heart className="h-4 w-4 text-primary" /> Atendimento pessoal</div>
        </div>
      </section>

      {/* Coleções */}
      <section id="colecoes" className="container py-14 scroll-mt-20">
        <div className="text-center mb-8">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">Coleções</p>
          <h2 className="font-display text-3xl sm:text-4xl font-light">Explore por categoria</h2>
        </div>
        {collections.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">Em breve novas coleções por aqui.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {collections.map((c) => {
              const sample = allProducts.find((p: any) => p.category === c);
              return (
                <button
                  key={c}
                  onClick={() => { setActiveCat(c); document.getElementById("vitrine")?.scrollIntoView({ behavior: "smooth" }); }}
                  className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-border text-left"
                >
                  {sample?.image && (
                    <img src={sample.image} alt={c} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-primary">Coleção</p>
                    <h3 className="font-display text-xl">{c}</h3>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Vitrine */}
      <section id="vitrine" className="container py-8 scroll-mt-20">
        <div className="text-center mb-8">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">Vitrine</p>
          <h2 className="font-display text-4xl sm:text-5xl font-light">Selecionadas para você</h2>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-4 -mx-4 px-4 mb-6 justify-start sm:justify-center">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCat(c)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors ${
                activeCat === c
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">Ainda não há produtos nesta categoria.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((p: any) => (
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
        )}
      </section>

      {/* Sobre */}
      <section id="sobre" className="container py-16 scroll-mt-20">
        <div className="rounded-2xl border border-primary/20 bg-gradient-gold-soft p-10 lg:p-14">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Sobre a loja</p>
              <h3 className="font-display text-3xl sm:text-4xl font-light">
                {store.storeName}
              </h3>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                {t.description ||
                  `${store.storeName} é uma curadoria de joias folheadas a ouro feita com carinho. Cada peça é escolhida pensando em quem usa — para acompanhar você nos dias comuns e nos momentos especiais.`}
              </p>
              <div className="flex flex-wrap gap-3 mt-6">
                {t.whatsapp || store.phone ? (
                  <a
                    href={`https://wa.me/${(t.whatsapp || store.phone).replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button variant="gold"><MessageCircle className="h-4 w-4" /> Falar no WhatsApp</Button>
                  </a>
                ) : null}
                {t.instagram && (
                  <a href={`https://instagram.com/${t.instagram}`} target="_blank" rel="noreferrer">
                    <Button variant="outline"><Instagram className="h-4 w-4" /> @{t.instagram}</Button>
                  </a>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-primary/20 bg-background/40 p-5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Peças</p>
                <p className="font-display text-3xl mt-1">{allProducts.length}</p>
              </div>
              <div className="rounded-xl border border-primary/20 bg-background/40 p-5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Coleções</p>
                <p className="font-display text-3xl mt-1">{collections.length}</p>
              </div>
              <div className="col-span-2 rounded-xl border border-primary/20 bg-background/40 p-5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Atendimento</p>
                <p className="text-sm mt-2">Tire dúvidas, peça sugestões e finalize seu pedido pelo WhatsApp com a {store.name || "sacoleira"}.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default StoreHome;
