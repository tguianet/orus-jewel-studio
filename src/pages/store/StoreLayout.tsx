import { Link, Outlet, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ShoppingBag, Search, Heart, Instagram, MessageCircle } from "lucide-react";
import { getStoreBySlug } from "@/lib/mockData";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { loadPublicStore } from "@/lib/cloudStore";
import { DEFAULT_BANNER, StoreTheme, defaultTheme, loadStoreThemeBySlug } from "@/lib/storeTheme";
import { waLink } from "@/lib/whatsapp";
import { themeCssVars } from "@/lib/colorUtils";

const StoreLayout = () => {
  const { slug } = useParams();
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

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/85 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link to={`/loja/${store.storeSlug}`} className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-full overflow-hidden flex items-center justify-center text-primary-foreground font-display font-semibold"
              style={theme.logoUrl ? undefined : { background: theme.primaryColor }}
            >
              {theme.logoUrl ? (
                <img src={theme.logoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                store.storeName.charAt(0)
              )}
            </div>
            <div>
              <p className="font-display text-lg leading-none">{store.storeName}</p>
              <p className="text-[10px] text-muted-foreground tracking-widest uppercase">por Aura</p>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href={`/loja/${store.storeSlug}#vitrine`} className="hover:text-primary transition-colors">Vitrine</a>
            <a href={`/loja/${store.storeSlug}#colecoes`} className="hover:text-primary transition-colors">Coleções</a>
            <a href={`/loja/${store.storeSlug}#sobre`} className="hover:text-primary transition-colors">Sobre</a>
          </nav>
          <div className="flex items-center gap-1">
            {theme.instagram && (
              <a
                href={`https://instagram.com/${theme.instagram}`}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex"
              >
                <Button variant="ghost" size="icon"><Instagram className="h-4 w-4" /></Button>
              </a>
            )}
            <Button variant="ghost" size="icon"><Search className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="hidden sm:inline-flex"><Heart className="h-4 w-4" /></Button>
            <Link to={`/loja/${store.storeSlug}/carrinho`}>
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingBag className="h-4 w-4" />
                {count > 0 && <span className="absolute -top-1 -right-1 h-4 min-w-[1rem] px-1 rounded-full bg-gradient-gold text-[10px] text-primary-foreground flex items-center justify-center font-medium">{count}</span>}
              </Button>
            </Link>
          </div>
        </div>
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
