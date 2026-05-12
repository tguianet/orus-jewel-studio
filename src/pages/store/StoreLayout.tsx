import { Link, Outlet, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ShoppingBag, Search, Heart, Instagram, MessageCircle, ShieldAlert, ArrowRight } from "lucide-react";
import { getStoreBySlug } from "@/lib/mockData";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { loadPublicStore } from "@/lib/cloudStore";
import { DEFAULT_BANNER, StoreTheme, defaultTheme, loadStoreThemeBySlug } from "@/lib/storeTheme";
import { waLink } from "@/lib/whatsapp";
import { themeCssVars } from "@/lib/colorUtils";
import { useAuth } from "@/contexts/AuthContext";
import { EditableText } from "@/components/preview/EditableText";

const StoreLayout = () => {
  const { slug } = useParams();
  const { profile, loading: authLoading } = useAuth();
  const [store, setStore] = useState(() => getStoreBySlug(slug));
  const [theme, setTheme] = useState<StoreTheme>(defaultTheme);
  const { count } = useCart();

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

      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/75 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/60">

        {/* Linha 1: CEP / Logo central / Buscar Account Bag */}
        <div className="container grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="hidden md:inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: accent }} />
              Informar meu CEP
            </span>
          </div>

          <Link to={`/loja/${store.storeSlug}`} className="flex flex-col items-center justify-center">
            {theme.logoUrl ? (
              <img src={theme.logoUrl} alt={store.storeName} className="h-20 sm:h-24 lg:h-28 max-w-[280px] object-contain" />
            ) : (
              <span className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-[0.32em] uppercase leading-none font-light text-foreground">
                {store.storeName}
              </span>
            )}
          </Link>

          <div className="flex items-center justify-end gap-2">
            <div className="hidden md:flex items-center rounded-full border border-border bg-secondary/50 px-3 h-9 w-56">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Buscar por nome ou código"
                className="bg-transparent outline-none text-sm px-2 w-full placeholder:text-muted-foreground"
              />
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9 md:hidden"><Search className="h-4 w-4" /></Button>
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

        <nav className="border-t border-border/70">
          <div className="container flex items-center justify-center gap-6 sm:gap-10 py-3 text-[12px] sm:text-[13px] uppercase tracking-[0.22em] text-foreground/85 overflow-x-auto">
            <a href={`/loja/${store.storeSlug}#vitrine`} className="hover:text-foreground transition-colors whitespace-nowrap">Joias</a>
            <a href={`/loja/${store.storeSlug}#colecoes`} className="hover:text-foreground transition-colors whitespace-nowrap">Coleções</a>
            <a href={`/loja/${store.storeSlug}#vitrine`} className="hover:text-foreground transition-colors whitespace-nowrap hidden sm:inline">Novidades</a>
            <a href={`/loja/${store.storeSlug}#sobre`} className="hover:text-foreground transition-colors whitespace-nowrap">Sobre</a>
            <a
              href={`/loja/${store.storeSlug}#vitrine`}
              className="font-semibold whitespace-nowrap"
              style={{ color: accent }}
            >
              SALE
            </a>
          </div>
        </nav>
      </header>

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
