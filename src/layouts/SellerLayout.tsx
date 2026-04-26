import { ReactNode } from "react";
import { LayoutDashboard, Store, Palette, BookOpen, Sparkles, ShoppingBag, Network, Wallet, Settings } from "lucide-react";
import { AppShell, NavItem } from "@/components/AppShell";

const nav: NavItem[] = [
  { label: "Dashboard", to: "/sacoleira", icon: LayoutDashboard },
  { label: "Minha loja", to: "/sacoleira/loja", icon: Store },
  { label: "Personalização", to: "/sacoleira/personalizacao", icon: Palette },
  { label: "Catálogo disponível", to: "/sacoleira/catalogo", icon: BookOpen },
  { label: "Meus produtos", to: "/sacoleira/meus-produtos", icon: Sparkles },
  { label: "Pedidos", to: "/sacoleira/pedidos", icon: ShoppingBag },
  { label: "Carteira", to: "/sacoleira/clientes", icon: Wallet },
  { label: "Meu MLM", to: "/sacoleira/rede", icon: Network },
  { label: "Configurações", to: "/sacoleira/configuracoes", icon: Settings },
];

export const SellerLayout = ({ children }: { children: ReactNode }) => (
  <AppShell nav={nav} scopeLabel="Marina Aura" userName="Marina Costa">{children}</AppShell>
);
