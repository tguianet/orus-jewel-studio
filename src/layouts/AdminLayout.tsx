import { ReactNode, useEffect, useState } from "react";
import { LayoutDashboard, Package, PackageOpen, Tags, Users, ShoppingBag, Wallet, Settings, Network, Image as ImageIcon, Banknote, ScrollText, FileText, AlertTriangle, BarChart3 } from "lucide-react";
import { AppShell, NavItem } from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { ImageFormat, loadImageFormats } from "@/lib/marketingBanners";

export const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { profile } = useAuth();
  const [formats, setFormats] = useState<ImageFormat[]>([]);

  useEffect(() => {
    loadImageFormats(true).then(setFormats).catch(() => setFormats([]));
  }, []);

  const nav: NavItem[] = [
    { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
    { label: "Produtos", to: "/admin/produtos", icon: Package },
    { label: "Categorias", to: "/admin/categorias", icon: Tags },
    { label: "Sacoleiras", to: "/admin/sacoleiras", icon: Users },
    { label: "Pedidos", to: "/admin/pedidos", icon: ShoppingBag },
    { label: "Devoluções", to: "/admin/devolucoes", icon: PackageOpen },
    { label: "Comissões", to: "/admin/financeiro", icon: Wallet },
    { label: "Saques", to: "/admin/saques", icon: Banknote },
    { label: "Docs legais", to: "/admin/documentos-legais", icon: FileText },
    { label: "Consentimentos", to: "/admin/consentimentos", icon: ScrollText },
    { label: "Erros", to: "/admin/erros-operacionais", icon: AlertTriangle },
    { label: "Relatórios", to: "/admin/relatorios", icon: BarChart3 },
    {
      label: "Marketing",
      to: "/admin/banners",
      icon: ImageIcon,
      children: [
        { label: "Todos os formatos", to: "/admin/banners" },
        ...formats.map((f) => ({ label: f.name, to: `/admin/banners/${f.slug}` })),
      ],
    },
    { label: "MLM", to: "/admin/rede", icon: Network },
    { label: "Configurações", to: "/admin/configuracoes", icon: Settings },
  ];

  return (
    <AppShell nav={nav} scopeLabel="Painel Admin" userName={profile?.displayName || "Amada Amante"}>
      {children}
    </AppShell>
  );
};
