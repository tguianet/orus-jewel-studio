import { ReactNode } from "react";
import { LayoutDashboard, Package, Tags, Users, ShoppingBag, Wallet, Settings, Network, Image as ImageIcon } from "lucide-react";
import { AppShell, NavItem } from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";

const nav: NavItem[] = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  { label: "Produtos", to: "/admin/produtos", icon: Package },
  { label: "Categorias", to: "/admin/categorias", icon: Tags },
  { label: "Sacoleiras", to: "/admin/sacoleiras", icon: Users },
  { label: "Pedidos", to: "/admin/pedidos", icon: ShoppingBag },
  { label: "Comissões", to: "/admin/financeiro", icon: Wallet },
  { label: "Banners", to: "/admin/banners", icon: ImageIcon },
  { label: "MLM", to: "/admin/rede", icon: Network },
  { label: "Configurações", to: "/admin/configuracoes", icon: Settings },
];

export const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { profile } = useAuth();
  return (
    <AppShell nav={nav} scopeLabel="Painel Admin" userName={profile?.displayName || "Aura Store Suite"}>
      {children}
    </AppShell>
  );
};
