import { ReactNode } from "react";
import { LayoutDashboard, Package, Tags, Users, ShoppingBag, Wallet, Settings, Network } from "lucide-react";
import { AppShell, NavItem } from "@/components/AppShell";

const nav: NavItem[] = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  { label: "Produtos", to: "/admin/produtos", icon: Package },
  { label: "Categorias", to: "/admin/categorias", icon: Tags },
  { label: "Sacoleiras", to: "/admin/sacoleiras", icon: Users },
  { label: "Pedidos", to: "/admin/pedidos", icon: ShoppingBag },
  { label: "Comissões", to: "/admin/financeiro", icon: Wallet },
  { label: "Rede multinível", to: "/admin/rede", icon: Network },
  { label: "Configurações", to: "/admin/configuracoes", icon: Settings },
];

export const AdminLayout = ({ children }: { children: ReactNode }) => (
  <AppShell nav={nav} scopeLabel="Painel Admin" userName="Aura Store Suite">{children}</AppShell>
);
