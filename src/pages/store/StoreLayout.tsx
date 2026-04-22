import { Link, Outlet, useParams } from "react-router-dom";
import { ShoppingBag, Search, Heart } from "lucide-react";
import { sacoleiras } from "@/lib/mockData";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";

const StoreLayout = () => {
  const { slug } = useParams();
  const store = sacoleiras.find(s => s.storeSlug === slug) ?? sacoleiras[0];
  const { count } = useCart();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/85 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link to={`/loja/${store.storeSlug}`} className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-gold flex items-center justify-center text-primary-foreground font-display font-semibold">
              {store.storeName.charAt(0)}
            </div>
            <div>
              <p className="font-display text-lg leading-none">{store.storeName}</p>
              <p className="text-[10px] text-muted-foreground tracking-widest uppercase">por Orus</p>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link to={`/loja/${store.storeSlug}`} className="hover:text-primary transition-colors">Vitrine</Link>
            <a className="hover:text-primary transition-colors cursor-pointer">Coleções</a>
            <a className="hover:text-primary transition-colors cursor-pointer">Sobre</a>
          </nav>
          <div className="flex items-center gap-1">
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
        <Outlet context={{ store }} />
      </main>

      <footer className="border-t border-border/50 mt-16 py-8">
        <div className="container text-center space-y-2">
          <p className="font-display text-xl">{store.storeName}</p>
          <p className="text-xs text-muted-foreground">Atendimento pelo WhatsApp · {store.phone}</p>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground pt-3">Powered by Orus</p>
        </div>
      </footer>
    </div>
  );
};

export default StoreLayout;
