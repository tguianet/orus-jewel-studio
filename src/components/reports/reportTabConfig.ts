export type ReportTab = { to: string; label: string };

export const ADMIN_REPORT_TABS: ReportTab[] = [
  { to: "/admin/relatorios/vendas", label: "Vendas" },
  { to: "/admin/relatorios/sacoleiras", label: "Sacoleiras" },
  { to: "/admin/relatorios/comissoes", label: "Comissões" },
  { to: "/admin/relatorios/carteira", label: "Carteira" },
  { to: "/admin/relatorios/saques", label: "Saques" },
  { to: "/admin/relatorios/devolucoes", label: "Devoluções" },
  { to: "/admin/relatorios/estoque", label: "Estoque" },
  { to: "/admin/relatorios/produtos", label: "Produtos" },
  { to: "/admin/relatorios/expirados", label: "Expirados" },
];
