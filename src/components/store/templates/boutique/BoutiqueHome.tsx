import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Menu, MessageCircle, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatBRL } from "@/lib/format";
import { defaultTheme } from "@/lib/storeTheme";
import type { CloudStoreProduct } from "@/lib/cloudStore";
import type { StoreTemplateHomeProps } from "../types";
import { StoreProductCard } from "../shared/StoreProductCard";

const BoutiqueHome = ({
  store,
  theme,
  banners,
  products: allProducts,
  filteredProducts: filtered,
  categories: cats,
  collections,
  activeCategory,
  onActiveCategoryChange,
  query,
  productsLoading,
  productsError,
}: StoreTemplateHomeProps) => {
  const t = { ...defaultTheme, ...(theme || {}) };
  const [catMenuOpen, setCatMenuOpen] = useState(false);
  const [quickProduct, setQuickProduct] = useState<CloudStoreProduct | null>(null);
  const navigate = useNavigate();
  const hero = banners[0];
  const wa = (t.whatsapp || store.phone || "").replace(/\D/g, "");

  return (
    <>
      {/* Compact commercial hero */}
      <section className="bg-foreground text-background">
        <div className="container py-6 @sm:py-8 grid @sm:grid-cols-[1.2fr_1fr] gap-6 items-center">
          <div className="space-y-4 order-2 @sm:order-1">
            <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-primary">
              <Percent className="h-3.5 w-3.5" /> Ofertas da loja
            </p>
            <h1 className="font-display text-3xl @sm:text-5xl font-medium leading-tight">
              {t.heroTitle1 || store.storeName}
            </h1>
            <p className="text-sm @sm:text-base text-background/80 max-w-md">
              {t.heroPromoText || t.description || "Peças selecionadas com preço claro e compra rápida pelo celular."}
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#vitrine">
                <Button variant="gold" size="lg" className="min-h-12 px-6 text-sm">
                  {t.heroCtaPrimary || "Ver produtos"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
              {wa && (
                <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">
                  <Button variant="whatsapp" size="lg" className="min-h-12 px-6 text-sm">
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </Button>
                </a>
              )}
            </div>
          </div>
          <div className="order-1 @sm:order-2 aspect-[16/10] @sm:aspect-square overflow-hidden rounded-xl bg-muted">
            {hero && <img src={hero} alt={store.storeName} className="w-full h-full object-cover" loading="eager" />}
          </div>
        </div>
      </section>

      {/* Benefits as promo chips */}
      <section className="border-b border-border bg-secondary/30">
        <div className="container flex gap-2 overflow-x-auto py-3 text-[11px] uppercase tracking-wider">
          {(t.benefits?.length
            ? t.benefits
            : ["Frete Grátis*", "Até 10x sem juros", "5% OFF no PIX", "Troca em 7 dias"]
          ).map((b, i) => (
            <span key={i} className="shrink-0 rounded-full border border-primary/30 bg-background px-3 py-1.5 font-medium">
              {b}
            </span>
          ))}
        </div>
      </section>

      {/* Categories early */}
      {(t.showCollections ?? true) && collections.length > 0 && (
        <section id="colecoes" className="container py-6 scroll-mt-20">
          <div className="flex items-end justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Categorias</p>
              <h2 className="font-display text-2xl font-medium">{t.categoriesTitle || "Compre por categoria"}</h2>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {collections.map((c) => {
              const sample = allProducts.find((p) => p.category === c);
              const img = (t.categoryImages || {})[c] || sample?.image;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    onActiveCategoryChange(c);
                    document.getElementById("vitrine")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="shrink-0 w-28 @sm:w-32 text-left"
                >
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-2">
                    {img && <img src={img} alt={c} loading="lazy" className="w-full h-full object-cover" />}
                  </div>
                  <p className="text-xs font-medium truncate">{c}</p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Product grid first-class */}
      <section id="vitrine" className="container pb-16 scroll-mt-20">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="font-display text-2xl @sm:text-3xl font-medium">Produtos</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {filtered.length} {filtered.length === 1 ? "peça" : "peças"}
              {query ? ` para “${query}”` : ""}
            </p>
          </div>
          <button
            type="button"
            className="@sm:hidden inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs uppercase tracking-wider"
            onClick={() => setCatMenuOpen(true)}
          >
            <Menu className="h-4 w-4" /> {activeCategory}
          </button>
        </div>

        <div className="hidden @sm:flex flex-wrap gap-2 mb-6">
          {cats.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onActiveCategoryChange(c)}
              className={`rounded-full px-4 py-2 text-xs uppercase tracking-wider border transition ${
                activeCategory === c
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:border-primary/40"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <Sheet open={catMenuOpen} onOpenChange={setCatMenuOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Categorias</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-2 py-4">
              {cats.map((c) => (
                <Button
                  key={c}
                  variant={activeCategory === c ? "gold" : "outline"}
                  onClick={() => {
                    onActiveCategoryChange(c);
                    setCatMenuOpen(false);
                  }}
                >
                  {c}
                </Button>
              ))}
            </div>
          </SheetContent>
        </Sheet>

        {productsLoading ? (
          <p className="text-center text-sm text-muted-foreground py-12">Carregando produtos…</p>
        ) : productsError ? (
          <p className="text-center text-sm text-destructive py-12">{productsError}</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">Nenhum produto encontrado.</p>
        ) : (
          <div className="grid grid-cols-2 @sm:grid-cols-3 @lg:grid-cols-4 gap-3 @sm:gap-5">
            {filtered.map((p) => (
              <StoreProductCard
                key={p.id}
                product={p}
                storeSlug={store.storeSlug}
                density="compact"
                emphasizePrice
                showHeart={false}
                onMobileTap={setQuickProduct}
              />
            ))}
          </div>
        )}

        <Dialog open={!!quickProduct} onOpenChange={(o) => !o && setQuickProduct(null)}>
          <DialogContent className="max-w-sm p-0 overflow-hidden">
            {quickProduct && (
              <div>
                <div className="aspect-square bg-muted">
                  <img src={quickProduct.image} alt={quickProduct.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-5 space-y-3">
                  <DialogHeader className="text-left space-y-1">
                    <DialogTitle className="font-display text-xl">{quickProduct.name}</DialogTitle>
                    <DialogDescription>{formatBRL(quickProduct.resellerPrice)} · em até 10x*</DialogDescription>
                  </DialogHeader>
                  <Button
                    variant="gold"
                    size="lg"
                    className="w-full min-h-12"
                    onClick={() => {
                      const id = quickProduct.id;
                      setQuickProduct(null);
                      navigate(`/loja/${store.storeSlug}/produto/${id}`);
                    }}
                  >
                    Comprar agora <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </section>

      {(t.showFinalCta ?? true) && wa && (
        <section className="container pb-16">
          <div className="rounded-2xl border border-primary/30 bg-gradient-gold-soft p-6 @sm:p-8 flex flex-col @sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-1">Atendimento rápido</p>
              <h3 className="font-display text-2xl font-medium">Tire dúvidas e feche no WhatsApp</h3>
            </div>
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">
              <Button variant="whatsapp" size="xl">
                <MessageCircle className="h-5 w-5" /> Chamar agora
              </Button>
            </a>
          </div>
        </section>
      )}
    </>
  );
};

export default BoutiqueHome;
