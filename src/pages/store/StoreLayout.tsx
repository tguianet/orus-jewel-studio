import { Link, Outlet, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ShoppingBag, Search, Heart, Instagram, MessageCircle, ShieldAlert, ArrowRight, X } from "lucide-react";
import { getStoreBySlug, getStoreProducts, formatBRL } from "@/lib/mockData";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CloudStoreProduct, loadPublicStore, loadStoreProducts } from "@/lib/cloudStore";
import { DEFAULT_BANNER, StoreTheme, defaultTheme, loadStoreThemeBySlug } from "@/lib/storeTheme";
import { waLink } from "@/lib/whatsapp";
import { themeCssVars } from "@/lib/colorUtils";
import { useAuth } from "@/contexts/AuthContext";
import { EditableText } from "@/components/preview/EditableText";

const StoreLayout = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, loading: authLoading } = useAuth();
  const [store, setStore] = useState(() => getStoreBySlug(slug));
  const [theme, setTheme] = useState<StoreTheme>(defaultTheme);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const { count } = useCart();

  useEffect(() => {
    setSearchTerm(searchParams.get("q") || "");
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;
    const mock = getStoreProducts(store.id);
    setAllProducts(mock);
    loadStoreProducts(store.id).then((items) => {
      if (mounted && items && items.length) setAllProducts(items);
    });
    return () => { mounted = false; };
  }, [store.id]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return allProducts.filter((p: any) =>
      [p.name, p.category, p.code, p.sku, p.id]
        .filter(Boolean)
        .some((s: any) => String(s).toLowerCase().includes(q))
    );
  }, [searchQuery, allProducts]);

  const submitSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = searchTerm.trim();
    if (!q) return;
    setSearchQuery(q);
    setSearchOpen(true);
    setMobileSearchOpen(false);
  };

  // Modo preview ao vivo: o editor envia ?preview=1 e empurra tema/loja via postMessage
  const isPreview = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "1";

  useEffect(() => {
    let mounted = true;
    loadPublicStore(slug).then((cloudStore) => {
      if (mounted && cloudStore) setStore(cloudStore);
    });
    loadStoreThemeBySlug(slug).then((t) => {
      if (mounted && t) setTheme({ ...defaultTheme, ...t });
    });
    return () => { mounted = false; };
  }, [slug]);

  useEffect(() => {
    if (!isPreview) return;
    const onMsg = (e: MessageEvent) => {
      const data = e.data as any;
      if (!data || typeof data !== "object") return;
      if (data.type === "lovable-preview-theme" && data.theme) {
        setTheme({ ...defaultTheme, ...(data.theme as StoreTheme) });
      }
      if (data.type === "lovable-preview-store" && data.store) {
        setStore((prev) => ({ ...prev, ...(data.store as any) }));
      }
    };
    window.addEventListener("message", onMsg);
    // sinaliza que está pronto pra receber estado
    try { window.parent?.postMessage({ type: "lovable-preview-ready" }, "*"); } catch { /* noop */ }
    return () => window.removeEventListener("message", onMsg);
  }, [isPreview]);

  const ctx = useMemo(
    () => ({ store, theme, banner: theme.bannerUrl || DEFAULT_BANNER }),
    [store, theme],
  );

  // Block sacoleiras from viewing another reseller's store/data.
  // Admins and unauthenticated visitors are allowed.
  const isSeller = !!profile?.roles?.includes("sacoleira");
  const isAdmin = !!profile?.roles?.includes("admin");
  const ownsThisStore = !!profile?.storeSlug && profile.storeSlug === slug;
  const blocked = !authLoading && isSeller && !isAdmin && !ownsThisStore;

  if (blocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center space-y-5 border border-border rounded-2xl p-8 bg-card">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldAlert className="h-7 w-7 text-primary" />
          </div>
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Acesso bloqueado</p>
            <h1 className="font-display text-3xl text-foreground">Esta loja não é sua</h1>
            <p className="text-sm text-muted-foreground">
              Você está logada como sacoleira e não pode visualizar o painel ou os dados de outra loja.
              Acesse apenas a sua própria loja{profile?.storeSlug ? <> em <span className="text-foreground font-medium">/loja/{profile.storeSlug}</span></> : null}.
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            {profile?.storeSlug && (
              <Button asChild variant="gold" size="lg" className="w-full">
                <Link to={`/loja/${profile.storeSlug}`}>Ir para a minha loja <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            )}
            <Button asChild variant="outline" size="lg" className="w-full">
              <Link to="/sacoleira">Voltar ao painel</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const accent = theme.accentColor || "hsl(36 45% 60%)";

  return (
    <div className="store-light min-h-screen flex flex-col bg-background text-foreground" style={themeCssVars(theme.primaryColor, theme.secondaryColor)}>
      {/* Top bar minimalista premium */}
      <div className="w-full text-[11px] tracking-[0.18em] uppercase border-b border-border/60" style={{ background: "hsl(var(--foreground))", color: "hsl(var(--background))" }}>
        <div className="container grid grid-cols-3 items-center py-2.5 text-center">
          <div className="flex items-center justify-start gap-2 opacity-80">
            <MessageCircle className="h-3 w-3" />
            <EditableText
              field="topBarLeftText"
              value={theme.topBarLeftText || "Atendimento ao cliente"}
              className="hidden sm:inline"
            />
          </div>
          <EditableText
            field="topBarCenterText"
            value={theme.topBarCenterText || "Frete cortesia em todas as compras"}
            className="font-light"
            as="div"
          />
          <div className="flex items-center justify-end gap-2 opacity-80">
            <EditableText
              field="topBarRightText"
              value={theme.topBarRightText || "Entrega segura"}
              className="hidden md:inline"
            />
          </div>
        </div>
      </div>

      <header
        className="sticky top-0 z-30 border-b border-border/60 bg-background/75 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/60"
        style={{
          ...(theme.headerBgColor ? { background: theme.headerBgColor } : {}),
          ...(theme.headerTextColor ? { color: theme.headerTextColor } : {}),
          ...(theme.headerFontFamily ? { fontFamily: theme.headerFontFamily } : {}),
        }}
      >
        <div className="container grid grid-cols-[auto_1fr_auto] items-center gap-6 py-4">
          {/* Logo à esquerda */}
          <Link to={`/loja/${store.storeSlug}`} className="flex items-center">
            {theme.logoUrl ? (
              <img src={theme.logoUrl} alt={store.storeName} className="h-12 sm:h-14 lg:h-16 max-w-[220px] object-contain" />
            ) : (
              <span className="font-display text-xl sm:text-2xl lg:text-3xl tracking-[0.3em] uppercase leading-none font-light text-foreground">
                {store.storeName}
              </span>
            )}
          </Link>

          {/* Menu centralizado */}
          <nav className="hidden lg:flex items-center justify-center gap-8 xl:gap-12 text-[11px] sm:text-[12px] uppercase tracking-[0.32em] font-light">
            <a href={`/loja/${store.storeSlug}#vitrine`} className="relative whitespace-nowrap hover:text-foreground transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-px after:w-0 after:bg-primary after:transition-all hover:after:w-full">Joias</a>
            <a href={`/loja/${store.storeSlug}#colecoes`} className="relative whitespace-nowrap hover:text-foreground transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-px after:w-0 after:bg-primary after:transition-all hover:after:w-full">Coleções</a>
            <a href={`/loja/${store.storeSlug}#vitrine`} className="relative whitespace-nowrap hover:text-foreground transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-px after:w-0 after:bg-primary after:transition-all hover:after:w-full">Novidades</a>
            <a href={`/loja/${store.storeSlug}#sobre`} className="relative whitespace-nowrap hover:text-foreground transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-px after:w-0 after:bg-primary after:transition-all hover:after:w-full">Sobre</a>
            <a
              href={`/loja/${store.storeSlug}#vitrine`}
              className="font-medium whitespace-nowrap"
              style={{ color: "hsl(142 70% 35%)" }}
            >
              Sale
            </a>
          </nav>

          {/* Busca + ícones à direita */}
          <div className="flex items-center justify-end gap-2">
            <form onSubmit={submitSearch} className="hidden md:flex items-center rounded-full border border-border bg-secondary/50 px-3 h-9 w-56 focus-within:border-primary transition-colors">
              <button type="submit" aria-label="Buscar" className="text-muted-foreground hover:text-foreground transition-colors">
                <Search className="h-4 w-4" />
              </button>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome ou código"
                className="bg-transparent outline-none text-sm px-2 w-full placeholder:text-muted-foreground"
              />
              {searchTerm && (
                <button type="button" onClick={() => { setSearchTerm(""); navigate(`/loja/${store.storeSlug}#vitrine`); }} aria-label="Limpar" className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </form>
            <Button variant="ghost" size="icon" className="h-9 w-9 md:hidden" onClick={() => setMobileSearchOpen((v) => !v)}>
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 hidden sm:inline-flex"><Heart className="h-4 w-4" /></Button>
            <Link to={`/loja/${store.storeSlug}/carrinho`}>
              <Button variant="ghost" size="icon" className="h-9 w-9 relative">
                <ShoppingBag className="h-4 w-4" />
                {count > 0 && (
                  <span
                    className="absolute -top-1 -right-1 h-4 min-w-[1rem] px-1 rounded-full text-[10px] flex items-center justify-center font-medium text-white"
                    style={{ background: accent }}
                  >
                    {count}
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </div>

        {/* Busca mobile */}
        {mobileSearchOpen && (
          <div className="md:hidden border-t border-border/70">
            <form onSubmit={submitSearch} className="container py-3 flex items-center gap-2">
              <div className="flex-1 flex items-center rounded-full border border-border bg-secondary/50 px-3 h-10">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nome ou código"
                  className="bg-transparent outline-none text-sm px-2 w-full placeholder:text-muted-foreground"
                />
              </div>
              <Button type="submit" variant="gold" size="sm">Buscar</Button>
            </form>
          </div>
        )}

        {/* Menu mobile (visível apenas em telas pequenas) */}
        <nav className="lg:hidden border-t border-border/70">
          <div className="container flex items-center justify-center gap-6 sm:gap-10 py-3 text-[11px] uppercase tracking-[0.32em] text-foreground/80 overflow-x-auto font-light">
            <a href={`/loja/${store.storeSlug}#vitrine`} className="whitespace-nowrap">Joias</a>
            <a href={`/loja/${store.storeSlug}#colecoes`} className="whitespace-nowrap">Coleções</a>
            <a href={`/loja/${store.storeSlug}#vitrine`} className="whitespace-nowrap">Novidades</a>
            <a href={`/loja/${store.storeSlug}#sobre`} className="whitespace-nowrap">Sobre</a>
            <a href={`/loja/${store.storeSlug}#vitrine`} className="whitespace-nowrap font-medium" style={{ color: "hsl(142 70% 35%)" }}>Sale</a>
          </div>
        </nav>
      </header>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-light">
              Resultados para "{searchQuery}"
            </DialogTitle>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {searchResults.length} {searchResults.length === 1 ? "peça encontrada" : "peças encontradas"}
            </p>
          </DialogHeader>
          <div className="overflow-y-auto -mx-2 px-2">
            {searchResults.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-12">
                Nenhuma peça encontrada para "{searchQuery}".
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-4">
                {searchResults.map((p: any) => (
                  <Link
                    key={p.id}
                    to={`/loja/${store.storeSlug}/produto/${p.id}`}
                    onClick={() => setSearchOpen(false)}
                    className="group block"
                  >
                    <div className="aspect-square overflow-hidden bg-secondary/50 mb-3 rounded">
                      <img src={p.image} alt={p.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    </div>
                    <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{p.category}</p>
                    <h3 className="font-display text-sm font-light leading-tight mt-1 group-hover:text-primary transition-colors line-clamp-2">{p.name}</h3>
                    <p className="mt-1 text-sm font-light" style={{ color: "hsl(var(--primary-deep))" }}>{formatBRL(p.resellerPrice)}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <main className="flex-1">
        <Outlet context={ctx} />
      </main>

      {(theme.whatsapp || store.phone) && (
        <a
          href={waLink(
            theme.whatsapp || store.phone,
            `Olá ${store.storeName}! Vi sua loja e gostaria de mais informações. ✨`,
          )}
          target="_blank"
          rel="noreferrer"
          aria-label="Falar no WhatsApp"
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-white shadow-[0_8px_30px_-8px_rgba(37,211,102,0.6)] hover:brightness-110 transition-all"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="hidden sm:inline text-sm font-medium">Fale conosco</span>
        </a>
      )}

      <footer className="border-t border-border/50 mt-16 py-8">
        <div className="container text-center space-y-2">
          <p className="font-display text-xl">{store.storeName}</p>
          {theme.description && <p className="text-sm text-muted-foreground max-w-md mx-auto">{theme.description}</p>}
          <p className="text-xs text-muted-foreground">Atendimento pelo WhatsApp · {theme.whatsapp || store.phone}</p>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground pt-3">Powered by Aura Store Suite</p>
        </div>
      </footer>
    </div>
  );
};

export default StoreLayout;
