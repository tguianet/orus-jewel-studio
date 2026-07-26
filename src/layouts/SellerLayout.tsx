import { ReactNode } from "react";
import { LayoutDashboard, Store, Palette, BookOpen, Sparkles, ShoppingBag, Network, Wallet, Settings, Megaphone, Banknote, ScrollText, BarChart3 } from "lucide-react";
import { AppShell, NavItem } from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";

const nav: NavItem[] = [
  { label: "Dashboard", to: "/sacoleira", icon: LayoutDashboard },
  { label: "Minha loja", to: "/sacoleira/loja", icon: Store },
  { label: "Personalização", to: "/sacoleira/personalizacao", icon: Palette },
  { label: "Marketing", to: "/sacoleira/marketing", icon: Megaphone },
  { label: "Catálogo disponível", to: "/sacoleira/catalogo", icon: BookOpen },
  { label: "Meus produtos", to: "/sacoleira/meus-produtos", icon: Sparkles },
  { label: "Pedidos", to: "/sacoleira/pedidos", icon: ShoppingBag },
  { label: "Carteira", to: "/sacoleira/clientes", icon: Wallet },
  { label: "Saques", to: "/sacoleira/saques", icon: Banknote },
  { label: "Consentimentos", to: "/sacoleira/consentimentos", icon: ScrollText },
  { label: "Relatórios", to: "/sacoleira/relatorios", icon: BarChart3 },
  { label: "Meu MLM", to: "/sacoleira/rede", icon: Network },
  { label: "Configurações", to: "/sacoleira/configuracoes", icon: Settings },
];

export const SellerLayout = ({ children }: { children: ReactNode }) => {
  const { profile } = useAuth();
  return (
    <AppShell nav={nav} scopeLabel={profile?.storeSlug ? `loja/${profile.storeSlug}` : "Minha loja"} userName={profile?.displayName || "Sacoleira"}>
      {children}
    </AppShell>
  );
};
