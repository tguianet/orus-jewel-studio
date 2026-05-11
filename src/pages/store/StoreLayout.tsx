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

const StoreLayout = () => {
  const { slug } = useParams();
  const { profile, loading: authLoading } = useAuth();
  const [store, setStore] = useState(() => getStoreBySlug(slug));
  const [theme, setTheme] = useState<StoreTheme>(defaultTheme);
  const { count } = useCart();

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

  return (
    <div className="store-light min-h-screen flex flex-col bg-background text-foreground" style={themeCssVars(theme.primaryColor, theme.secondaryColor)}>
      {/* Top promo bar */}
      <div className="w-full text-[12px] text-primary-foreground" style={{ background: theme.primaryColor || "hsl(var(--primary))" }}>
        <div className="container flex items-center justify-center gap-3 py-2 text-center tracking-wide">
          <span className="hidden sm:inline opacity-90">FRETE GRÁTIS PARA TODO BRASIL</span>
          <span className="hidden sm:inline opacity-60">•</span>
          <span>10% OFF NA PRIMEIRA COMPRA</span>
          <span className="opacity-60">•</span>
          <span className="font-medium">CUPOM: BEMVINDO10</span>
        </div>
      </div>

      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="container grid grid-cols-3 items-center gap-4 py-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {theme.instagram && (
              <a href={`https://instagram.com/${theme.instagram}`} target="_blank" rel="noreferrer">
                <Button variant="ghost" size="icon" className="h-8 w-8"><Instagram className="h-4 w-4" /></Button>
              </a>
            )}
            <span className="hidden md:inline">Atendimento: {theme.whatsapp || store.phone || "—"}</span>
          </div>

          <Link to={`/loja/${store.storeSlug}`} className="flex flex-col items-center justify-center">
            {theme.logoUrl ? (
              <img src={theme.logoUrl} alt={store.storeName} className="h-12 object-contain" />
            ) : (
              <>
                <span className="font-display text-2xl sm:text-3xl tracking-[0.2em] uppercase leading-none">
                  {store.storeName}
                </span>
                <span className="mt-1 text-[10px] tracking-[0.4em] uppercase text-muted-foreground">Joalheria</span>
              </>
            )}
          </Link>

          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9"><Search className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 hidden sm:inline-flex"><Heart className="h-4 w-4" /></Button>
            <Link to={`/loja/${store.storeSlug}/carrinho`}>
              <Button variant="ghost" size="icon" className="h-9 w-9 relative">
                <ShoppingBag className="h-4 w-4" />
                {count > 0 && (
                  <span
                    className="absolute -top-1 -right-1 h-4 min-w-[1rem] px-1 rounded-full text-[10px] flex items-center justify-center font-medium text-primary-foreground"
                    style={{ background: theme.primaryColor || "hsl(var(--primary))" }}
                  >
                    {count}
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </div>

        <nav className="border-t border-border/70">
          <div className="container flex items-center justify-center gap-6 sm:gap-8 py-3 text-[12px] sm:text-[13px] uppercase tracking-[0.18em] text-foreground/80 overflow-x-auto">
            <a href={`/loja/${store.storeSlug}#vitrine`} className="hover:text-primary transition-colors whitespace-nowrap">Joias</a>
            <a href={`/loja/${store.storeSlug}#colecoes`} className="hover:text-primary transition-colors whitespace-nowrap">Coleções</a>
            <a href={`/loja/${store.storeSlug}#vitrine`} className="hover:text-primary transition-colors whitespace-nowrap hidden sm:inline">Novidades</a>
            <a href={`/loja/${store.storeSlug}#sobre`} className="hover:text-primary transition-colors whitespace-nowrap">Sobre</a>
            <a
              href={`/loja/${store.storeSlug}#vitrine`}
              className="rounded-sm px-3 py-1 text-primary-foreground whitespace-nowrap"
              style={{ background: theme.primaryColor || "hsl(var(--primary))" }}
            >
              OFF
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
