import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatBRL } from "@/lib/format";
import { defaultTheme } from "@/lib/storeTheme";
import type { CloudStoreProduct } from "@/lib/cloudStore";
import type { StoreTemplateHomeProps } from "../types";
import { StoreProductCard } from "../shared/StoreProductCard";

const MinimalHome = ({
  store,
  theme,
  banners,
  filteredProducts: filtered,
  categories: cats,
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

  return (
    <div className="bg-background text-foreground">
      <section className="border-b border-border/60">
        <div className="container py-10 @sm:py-14 max-w-3xl text-center">
          <p className="text-[10px] uppercase tracking-[0.45em] text-muted-foreground mb-4">
            {t.heroEyebrow || "Coleção"}
          </p>
          <h1 className="font-display text-4xl @sm:text-6xl font-light tracking-tight">
            {t.heroTitle1 || store.storeName}
          </h1>
          {(t.heroTitleHighlight || t.description) && (
            <p className="mt-4 text-sm @sm:text-base text-muted-foreground leading-relaxed">
              {t.heroTitleHighlight || t.description}
            </p>
          )}
          <div className="mt-8">
            <a
              href="#vitrine"
              className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.35em] border-b border-foreground pb-1 hover:opacity-70 transition"
            >
              {t.heroCtaPrimary || "Ver peças"} <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
        {hero && (
          <div className="w-full max-h-[52vh] overflow-hidden bg-muted">
            <img
              src={hero}
              alt=""
              className="w-full max-h-[52vh] object-cover"
              loading="eager"
              decoding="async"
            />
          </div>
        )}
      </section>

      <section id="vitrine" className="container py-10 @sm:py-14 scroll-mt-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-display text-xl @sm:text-2xl font-light tracking-wide">
            {query ? `Resultados` : "Peças"}
          </h2>
          <button
            type="button"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-muted-foreground hover:text-foreground"
            onClick={() => setCatMenuOpen(true)}
          >
            <Menu className="h-4 w-4" /> {activeCategory}
          </button>
        </div>

        <div className="hidden @md:flex justify-center gap-6 mb-10">
          {cats.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onActiveCategoryChange(c)}
              className={`text-[11px] uppercase tracking-[0.3em] pb-1 border-b transition ${
                activeCategory === c
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <Sheet open={catMenuOpen} onOpenChange={setCatMenuOpen}>
          <SheetContent side="right" className="w-[80%] max-w-xs">
            <SheetHeader>
              <SheetTitle className="font-display font-light tracking-wide">Filtros</SheetTitle>
            </SheetHeader>
            <nav className="mt-6 space-y-1">
              {cats.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`block w-full text-left px-2 py-3 text-sm tracking-wide ${
                    activeCategory === c ? "text-foreground" : "text-muted-foreground"
                  }`}
                  onClick={() => {
                    onActiveCategoryChange(c);
                    setCatMenuOpen(false);
                  }}
                >
                  {c}
                </button>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        {productsLoading ? (
          <p className="text-center text-sm text-muted-foreground py-16">Carregando…</p>
        ) : productsError ? (
          <p className="text-center text-sm text-destructive py-16">{productsError}</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-16">Nenhuma peça encontrada.</p>
        ) : (
          <div className="grid grid-cols-2 @lg:grid-cols-3 gap-x-4 gap-y-10 @sm:gap-x-8 @sm:gap-y-14">
            {filtered.map((p) => (
              <StoreProductCard
                key={p.id}
                product={p}
                storeSlug={store.storeSlug}
                density="large"
                showHeart={false}
                onMobileTap={setQuickProduct}
              />
            ))}
          </div>
        )}

        <Dialog open={!!quickProduct} onOpenChange={(o) => !o && setQuickProduct(null)}>
          <DialogContent className="max-w-sm p-0 overflow-hidden border-0">
            {quickProduct && (
              <div>
                <img src={quickProduct.image} alt={quickProduct.name} className="w-full aspect-[4/5] object-cover" />
                <div className="p-5 space-y-3">
                  <DialogHeader className="text-left">
                    <DialogTitle className="font-display text-xl font-light">{quickProduct.name}</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground">{formatBRL(quickProduct.resellerPrice)}</p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      const id = quickProduct.id;
                      setQuickProduct(null);
                      navigate(`/loja/${store.storeSlug}/produto/${id}`);
                    }}
                  >
                    Ver peça
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </section>
    </div>
  );
};

export default MinimalHome;
