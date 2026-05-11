import { Link, useOutletContext } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Sparkles, Instagram, MessageCircle, Heart, Truck, ShieldCheck, Gem, Crown, Award, Droplet, Sun, Sparkle, CheckCircle2, Package, RefreshCw, CreditCard } from "lucide-react";
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
      <section id="sobre" className="container py-16 scroll-mt-20 space-y-10">
        {/* Hero do sobre */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-gold-soft p-10 lg:p-14">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Sobre a loja</p>
              <h3 className="font-display text-3xl sm:text-4xl font-light">
                {store.storeName}
              </h3>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                {t.description ||
                  `${store.storeName} é uma curadoria autoral de joias em prata 925, ouro 18k e folheados a ouro de alta qualidade. Cada peça é escolhida pensando em quem usa — para acompanhar você nos dias comuns e nos momentos que merecem brilho.`}
              </p>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Trabalhamos com fornecedores reconhecidos no Brasil, priorizando acabamento impecável, design atemporal e durabilidade. Mais do que vender joias, queremos fazer parte da sua história.
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
              <div className="rounded-xl border border-primary/20 bg-background/40 p-5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Garantia</p>
                <p className="font-display text-3xl mt-1">12 <span className="text-base text-muted-foreground">meses</span></p>
              </div>
              <div className="rounded-xl border border-primary/20 bg-background/40 p-5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Troca</p>
                <p className="font-display text-3xl mt-1">7 <span className="text-base text-muted-foreground">dias</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Materiais */}
        <div>
          <div className="text-center mb-8">
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">Materiais</p>
            <h3 className="font-display text-3xl sm:text-4xl font-light">Joias com a qualidade que você merece</h3>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
              Trabalhamos com três linhas para você encontrar a peça ideal para cada ocasião — todas com garantia, embalagem para presente e nota fiscal.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            <div className="rounded-2xl border border-border bg-card p-7 hover:border-primary/40 transition-colors">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Crown className="h-6 w-6 text-primary" />
              </div>
              <h4 className="font-display text-xl mb-2">Ouro 18k</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Joias maciças em ouro 18 quilates com pureza certificada. Investimento que atravessa gerações, sem perder o brilho nem o valor.
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Pureza 750 (75% ouro puro)</li>
                <li className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Hipoalergênico</li>
                <li className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Certificado de autenticidade</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-card p-7 hover:border-primary/40 transition-colors">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Gem className="h-6 w-6 text-primary" />
              </div>
              <h4 className="font-display text-xl mb-2">Prata 925</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Prata de lei com 92,5% de pureza. Versátil, elegante e ideal para o uso diário. Combina com qualquer estilo e ocasião.
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Selo 925 garantido</li>
                <li className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Acabamento polido ou ródio</li>
                <li className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Antialérgica</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-card p-7 hover:border-primary/40 transition-colors">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Sparkle className="h-6 w-6 text-primary" />
              </div>
              <h4 className="font-display text-xl mb-2">Folheado a ouro</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Banho de ouro 18k sobre base nobre, com camada reforçada para durar muito mais. O brilho da joia fina, no preço que cabe no seu dia a dia.
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Banho triplo reforçado</li>
                <li className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Garantia de 12 meses</li>
                <li className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Não escurece com facilidade</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Cuidados */}
        <div className="rounded-2xl border border-border bg-secondary/20 p-8 lg:p-10">
          <div className="text-center mb-8">
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">Cuidados</p>
            <h3 className="font-display text-2xl sm:text-3xl font-light">Para suas joias durarem ainda mais</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="text-center">
              <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Droplet className="h-5 w-5 text-primary" />
              </div>
              <h5 className="font-medium mb-1">Evite contato com água</h5>
              <p className="text-xs text-muted-foreground">Tire as peças folheadas antes de banho, piscina e mar.</p>
            </div>
            <div className="text-center">
              <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Sun className="h-5 w-5 text-primary" />
              </div>
              <h5 className="font-medium mb-1">Perfume por último</h5>
              <p className="text-xs text-muted-foreground">Coloque a joia depois do creme e do perfume já secos.</p>
            </div>
            <div className="text-center">
              <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <h5 className="font-medium mb-1">Limpeza suave</h5>
              <p className="text-xs text-muted-foreground">Use flanela seca. Para prata, pasta específica de joias.</p>
            </div>
            <div className="text-center">
              <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <h5 className="font-medium mb-1">Guarde separadas</h5>
              <p className="text-xs text-muted-foreground">Em saquinhos individuais para evitar arranhões.</p>
            </div>
          </div>
        </div>

        {/* Compra & garantia */}
        <div className="grid md:grid-cols-3 gap-5">
          <div className="rounded-2xl border border-border bg-card p-6">
            <Award className="h-6 w-6 text-primary mb-3" />
            <h4 className="font-display text-lg mb-2">Garantia real</h4>
            <p className="text-sm text-muted-foreground">12 meses contra defeitos de fabricação e oxidação fora do uso normal.</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <RefreshCw className="h-6 w-6 text-primary mb-3" />
            <h4 className="font-display text-lg mb-2">Troca facilitada</h4>
            <p className="text-sm text-muted-foreground">Não gostou? Troque em até 7 dias após o recebimento, sem complicação.</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <CreditCard className="h-6 w-6 text-primary mb-3" />
            <h4 className="font-display text-lg mb-2">Pagamento seguro</h4>
            <p className="text-sm text-muted-foreground">Pix, cartão em até 6x e combinação direto pelo WhatsApp.</p>
          </div>
        </div>

        {/* CTA final */}
        <div className="rounded-2xl border border-primary/30 bg-gradient-gold-soft p-8 lg:p-10 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">Atendimento personalizado</p>
          <h3 className="font-display text-2xl sm:text-3xl font-light max-w-2xl mx-auto">
            Não encontrou o que procurava? Fale comigo e eu ajudo a escolher a joia perfeita.
          </h3>
          <div className="flex flex-wrap gap-3 mt-6 justify-center">
            {t.whatsapp || store.phone ? (
              <a
                href={`https://wa.me/${(t.whatsapp || store.phone).replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="gold" size="xl"><MessageCircle className="h-4 w-4" /> Chamar no WhatsApp</Button>
              </a>
            ) : null}
            {t.instagram && (
              <a href={`https://instagram.com/${t.instagram}`} target="_blank" rel="noreferrer">
                <Button variant="outline" size="xl"><Instagram className="h-4 w-4" /> Ver Instagram</Button>
              </a>
            )}
          </div>
        </div>
      </section>
    </>
  );
};

export default StoreHome;
