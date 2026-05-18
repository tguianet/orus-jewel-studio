import { Link, useOutletContext, useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowRight, Sparkles, Instagram, MessageCircle, Heart, Truck, ShieldCheck, Gem, Crown, Award, Droplet, Sun, Sparkle, CheckCircle2, Package, RefreshCw, CreditCard, ChevronLeft, ChevronRight, Menu, Check } from "lucide-react";
import { formatBRL, getStoreProducts, Sacoleira } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import heroImg from "@/assets/hero-jewelry.jpg";
import { CloudStoreProduct, loadStoreProducts } from "@/lib/cloudStore";
import { DEFAULT_BANNER, StoreTheme, defaultTheme } from "@/lib/storeTheme";
import { EditableText, isPreview } from "@/components/preview/EditableText";

type StoreCtx = { store: Sacoleira; theme?: StoreTheme; banner?: string };

const StoreHome = () => {
  const { store, theme, banner } = useOutletContext<StoreCtx>();
  const [searchParams] = useSearchParams();
  const query = (searchParams.get("q") || "").trim().toLowerCase();
  const t = { ...defaultTheme, ...(theme || {}) };
  const banners = useMemo(() => {
    const list = [
      ...((t.bannerUrls || []).filter(Boolean)),
      ...(t.bannerUrl && !(t.bannerUrls || []).includes(t.bannerUrl) ? [t.bannerUrl] : []),
    ];
    if (list.length === 0) list.push(banner || DEFAULT_BANNER || heroImg);
    return list;
  }, [t.bannerUrls, t.bannerUrl, banner]);
  const [bannerIdx, setBannerIdx] = useState(0);
  useEffect(() => {
    if (banners.length < 2) return;
    const id = setInterval(() => setBannerIdx((i) => (i + 1) % banners.length), 5000);
    return () => clearInterval(id);
  }, [banners.length]);
  const [cloudProducts, setCloudProducts] = useState<CloudStoreProduct[]>([]);
  const [activeCat, setActiveCat] = useState<string>("Todos");
  const [catMenuOpen, setCatMenuOpen] = useState(false);
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

  const byCategory = activeCat === "Todos"
    ? allProducts
    : allProducts.filter((p: any) => p.category === activeCat);
  const filtered = query
    ? byCategory.filter((p: any) =>
        [p.name, p.category, p.code, p.sku, p.id]
          .filter(Boolean)
          .some((s: any) => String(s).toLowerCase().includes(query))
      )
    : byCategory;

  const collections = cats.filter((c) => c !== "Todos").slice(0, 6);

  const accent = t.accentColor || "#f4a78a";

  return (
    <>
      {/* Hero cinematográfico premium */}
      <section
        className="relative overflow-hidden bg-secondary/30"
        style={{
          ...(t.heroBgColor ? { background: t.heroBgColor } : {}),
          ...(t.heroTextColor ? { color: t.heroTextColor } : {}),
          ...(t.heroFontFamily ? { fontFamily: t.heroFontFamily } : {}),
        }}
      >
        <div className="relative w-full h-[78vh] min-h-[520px] max-h-[860px]">
          {banners.map((b, i) => (
            <img
              key={b + i}
              src={b}
              alt={`Banner ${i + 1} ${store.storeName}`}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1400ms] ${i === bannerIdx ? "opacity-100" : "opacity-0"}`}
            />
          ))}

          {/* Overlay editorial */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />

          <div className="absolute inset-0">
            <div className="container h-full flex items-center">
              <div className="max-w-xl text-white luxe-rise">
                <EditableText
                  field="heroEyebrow"
                  value={t.heroEyebrow || "Nova Coleção"}
                  className="block text-[10px] uppercase tracking-[0.5em] mb-5 text-white/85"
                />
                <EditableText
                  field="heroTitle1"
                  value={t.heroTitle1 || store.storeName}
                  as="h1"
                  className="block font-display text-5xl sm:text-7xl lg:text-[88px] font-light leading-[1] tracking-tight text-white"
                />
                {(t.heroTitleHighlight || isPreview()) && (
                  <EditableText
                    field="heroTitleHighlight"
                    value={t.heroTitleHighlight || ""}
                    as="p"
                    className="block font-display italic text-2xl sm:text-3xl mt-3 text-white/85"
                    placeholder="Subtítulo"
                  />
                )}
                {(t.heroPromoText || isPreview()) && (
                  <EditableText
                    field="heroPromoText"
                    value={t.heroPromoText || ""}
                    as="p"
                    className="block text-sm sm:text-base mt-6 text-white/90 max-w-md"
                    placeholder="Texto promocional"
                  />
                )}
                <div className="mt-10 flex flex-wrap items-center gap-3">
                  <a
                    href="#vitrine"
                    className="inline-flex items-center gap-3 px-8 py-3.5 text-[11px] uppercase tracking-[0.32em] font-medium border border-white/80 text-white hover:bg-white hover:text-foreground transition-all duration-500"
                  >
                    {t.heroCtaPrimary || "Descobrir coleção"}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                  {(t.heroCtaSecondary || isPreview()) && (
                    <a
                      href="#sobre"
                      className="inline-flex items-center gap-3 px-8 py-3.5 text-[11px] uppercase tracking-[0.32em] font-medium text-white/90 hover:text-white border border-transparent hover:border-white/40 transition-all duration-500"
                    >
                      {t.heroCtaSecondary || "Sobre a loja"}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {banners.length > 1 && (
            <>
              <button
                onClick={() => setBannerIdx((i) => (i - 1 + banners.length) % banners.length)}
                aria-label="Banner anterior"
                className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-10 h-11 w-11 rounded-full bg-white/15 backdrop-blur-md border border-white/30 text-white flex items-center justify-center hover:bg-white hover:text-foreground transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setBannerIdx((i) => (i + 1) % banners.length)}
                aria-label="Próximo banner"
                className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-10 h-11 w-11 rounded-full bg-white/15 backdrop-blur-md border border-white/30 text-white flex items-center justify-center hover:bg-white hover:text-foreground transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="absolute bottom-7 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {banners.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setBannerIdx(i)}
                    aria-label={`Banner ${i + 1}`}
                    className={`h-[2px] rounded-full transition-all ${i === bannerIdx ? "w-10 bg-white" : "w-5 bg-white/50 hover:bg-white/80"}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Benefits strip */}
      {(() => {
        const benefits = (t.benefits && t.benefits.length)
          ? t.benefits
          : ["Frete Grátis*", "Parcele em até 10x sem juros", "Bônus em todas as compras*", "5% OFF com PIX", "Atendimento personalizado"];
        return (
          <section
            className="border-b border-border bg-background"
            style={{
              ...(t.benefitsBgColor ? { background: t.benefitsBgColor } : {}),
              ...(t.benefitsTextColor ? { color: t.benefitsTextColor } : {}),
              ...(t.benefitsFontFamily ? { fontFamily: t.benefitsFontFamily } : {}),
            }}
          >
            <div className="container flex flex-wrap items-center justify-center gap-x-10 gap-y-2 py-4 text-[12px] uppercase tracking-wider">
              {benefits.map((b, i) => (
                <span key={i} className={`font-medium ${i >= 2 ? "hidden md:inline" : ""}`}>{b}</span>
              ))}
            </div>
          </section>
        );
      })()}

      {/* Coleções estilo Vivara — JOIAS [LOJA] / ESCOLHA POR CATEGORIAS */}
      {(t.showCollections ?? true) && (
        <section
          id="colecoes"
          className="scroll-mt-20"
          style={{
            ...(t.categoriesBgColor ? { background: t.categoriesBgColor } : {}),
            ...(t.categoriesTextColor ? { color: t.categoriesTextColor } : {}),
            ...(t.categoriesFontFamily ? { fontFamily: t.categoriesFontFamily } : {}),
          }}
        >
          <div className="container pt-10 pb-14 sm:pt-16 sm:pb-24">
          <div className="text-center mb-7 sm:mb-10">
            <EditableText
              field="categoriesTitle"
              value={t.categoriesTitle || `Joias ${store.storeName}`}
              as="h2"
              className="block font-display text-2xl sm:text-5xl font-light tracking-[0.08em] sm:tracking-wide uppercase leading-tight break-words"
              style={t.categoriesFontFamily ? { fontFamily: t.categoriesFontFamily } : undefined}
            />
            <EditableText
              field="categoriesSubtitle"
              value={t.categoriesSubtitle || "Escolha por categorias"}
              as="p"
              className="block mt-2 sm:mt-3 text-[10px] sm:text-[11px] uppercase tracking-[0.3em] sm:tracking-[0.4em] opacity-70"
            />
            <div
              className="mx-auto mt-3"
              style={{
                background: t.categoriesDividerColor || accent,
                width: `${t.categoriesDividerWidth ?? 48}px`,
                height: `${t.categoriesDividerHeight ?? 2}px`,
              }}
            />
          </div>
          {collections.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">Em breve novas coleções por aqui.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
              {collections.map((c) => {
                const sample = allProducts.find((p: any) => p.category === c);
                const img = (t.categoryImages || {})[c] || sample?.image;
                return (
                  <button
                    key={c}
                    onClick={() => { setActiveCat(c); document.getElementById("vitrine")?.scrollIntoView({ behavior: "smooth" }); }}
                    className="group flex flex-col items-center text-center"
                  >
                    <div className="aspect-square w-full overflow-hidden rounded-full bg-secondary/40 ring-1 ring-border transition-all duration-500 group-hover:ring-primary group-hover:shadow-[0_20px_50px_-20px_hsl(var(--primary)/0.4)]">
                      {img && (
                        <img src={img} alt={c} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1200ms]" />
                      )}
                    </div>
                    <h3 className="mt-4 text-[11px] uppercase tracking-[0.3em] font-light">{c}</h3>
                  </button>
                );
              })}
            </div>
          )}
          </div>
        </section>
      )}

      {/* Vitrine */}
      <section id="vitrine" className="container pt-4 pb-14 sm:pb-20 scroll-mt-20">
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-[10px] uppercase tracking-[0.4em] text-primary mb-3">Vitrine</p>
          <h2 className="font-display text-2xl sm:text-5xl font-light leading-tight">Selecionadas para você</h2>
          <div className="mx-auto mt-4 h-px w-12 bg-primary/60" />
        </div>

        {/* Mobile: botão sanduíche de categorias */}
        <div className="sm:hidden mb-6 flex justify-center">
          <button
            onClick={() => setCatMenuOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-[11px] uppercase tracking-[0.28em] font-light"
          >
            <Menu className="h-4 w-4" />
            <span>{activeCat}</span>
          </button>
        </div>

        {/* Desktop / tablet: barra horizontal */}
        <div className="hidden sm:flex gap-1 overflow-x-auto pb-6 -mx-4 px-4 mb-10 justify-center">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCat(c)}
              className={`shrink-0 px-5 py-2 text-[11px] uppercase tracking-[0.28em] font-light transition-all duration-300 border-b ${
                activeCat === c
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <Sheet open={catMenuOpen} onOpenChange={setCatMenuOpen}>
          <SheetContent side="right" className="w-[82%] max-w-sm p-0 bg-background text-foreground flex flex-col">
            <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/60 text-left">
              <SheetTitle className="font-display text-xl tracking-[0.25em] uppercase font-light">
                Categorias
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col py-2">
              {cats.map((c) => {
                const active = activeCat === c;
                return (
                  <button
                    key={c}
                    onClick={() => { setActiveCat(c); setCatMenuOpen(false); }}
                    className={`flex items-center justify-between px-6 py-4 border-b border-border/40 text-sm uppercase tracking-[0.3em] font-light text-left transition-colors ${active ? "text-foreground bg-muted/40" : "text-muted-foreground hover:bg-muted/30"}`}
                  >
                    <span>{c}</span>
                    {active && <Check className="h-4 w-4" />}
                  </button>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>

        {query && (
          <p className="text-center text-xs uppercase tracking-[0.3em] text-muted-foreground mb-6">
            Resultados para "{query}" — {filtered.length} {filtered.length === 1 ? "peça" : "peças"}
          </p>
        )}

        {filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">
            {query ? `Nenhuma peça encontrada para "${query}".` : "Ainda não há produtos nesta categoria."}
          </p>
        ) : (
          <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((p: any) => (
              <Link key={p.id} to={`/loja/${store.storeSlug}/produto/${p.id}`} className="group block">
                <div className="relative aspect-square overflow-hidden bg-secondary/50 mb-5 transition-all duration-500 group-hover:shadow-[0_30px_60px_-20px_rgba(17,17,17,0.18)]">
                  <img src={p.image} alt={p.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-105" />
                  <span className="absolute top-3 right-3 h-9 w-9 rounded-full bg-white/85 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Heart className="h-4 w-4 text-foreground" />
                  </span>
                </div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{p.category}</p>
                <h3 className="font-display text-xl font-light leading-tight mt-1.5 group-hover:text-primary transition-colors duration-300">{p.name}</h3>
                <p className="mt-2 text-[15px] font-light tracking-wide" style={{ color: "hsl(var(--primary-deep))" }}>{formatBRL(p.resellerPrice)}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Sobre */}
      <section
        id="sobre"
        className="container py-16 scroll-mt-20 space-y-10"
        style={{
          ...(t.aboutBgColor ? { background: t.aboutBgColor } : {}),
          ...(t.aboutTextColor ? { color: t.aboutTextColor } : {}),
          ...(t.aboutFontFamily ? { fontFamily: t.aboutFontFamily } : {}),
        }}
      >
        {/* Hero do sobre */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-gold-soft p-10 lg:p-14">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <EditableText
                field="aboutEyebrow"
                value={t.aboutEyebrow || "Sobre a loja"}
                as="p"
                className="block text-[10px] uppercase tracking-[0.3em] text-primary mb-3"
              />
              <EditableText
                field="aboutTitle"
                value={t.aboutTitle || store.storeName}
                as="h3"
                className="block font-display text-3xl sm:text-4xl font-light"
              />
              <EditableText
                field="aboutText"
                value={t.aboutText || t.description || `${store.storeName} é uma curadoria autoral de joias em prata 925, ouro 18k e folheados a ouro de alta qualidade. Cada peça é escolhida pensando em quem usa — para acompanhar você nos dias comuns e nos momentos que merecem brilho.`}
                as="p"
                multiline
                className="block mt-4 text-muted-foreground leading-relaxed whitespace-pre-line"
              />
              {(t.aboutText2 || (!t.aboutText && !t.description) || isPreview()) && (
                <EditableText
                  field="aboutText2"
                  value={t.aboutText2 || "Trabalhamos com fornecedores reconhecidos no Brasil, priorizando acabamento impecável, design atemporal e durabilidade. Mais do que vender joias, queremos fazer parte da sua história."}
                  as="p"
                  multiline
                  className="block mt-3 text-muted-foreground leading-relaxed whitespace-pre-line"
                />
              )}
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
        {(t.showMaterials ?? true) && (
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
        )}

        {/* Cuidados */}
        {(t.showCare ?? true) && (
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
        )}

        {/* Compra & garantia */}
        {(t.showGuarantee ?? true) && (
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
        )}

        {/* CTA final */}
        {(t.showFinalCta ?? true) && (
        <div
          className="rounded-2xl border border-primary/30 bg-gradient-gold-soft p-8 lg:p-10 text-center"
          style={{
            ...(t.finalCtaBgColor ? { background: t.finalCtaBgColor } : {}),
            ...(t.finalCtaTextColor ? { color: t.finalCtaTextColor } : {}),
            ...(t.finalCtaFontFamily ? { fontFamily: t.finalCtaFontFamily } : {}),
          }}
        >
          <EditableText
            field="finalCtaEyebrow"
            value={t.finalCtaEyebrow || "Atendimento personalizado"}
            as="p"
            className="block text-[10px] uppercase tracking-[0.3em] text-primary mb-2"
          />
          <EditableText
            field="finalCtaTitle"
            value={t.finalCtaTitle || "Não encontrou o que procurava? Fale comigo e eu ajudo a escolher a joia perfeita."}
            as="h3"
            multiline
            className="block font-display text-2xl sm:text-3xl font-light max-w-2xl mx-auto"
          />
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
        )}
      </section>
    </>
  );
};

export default StoreHome;
