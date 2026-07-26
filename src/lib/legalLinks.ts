export type LegalLink = {
  path: string;
  label: string;
  shortLabel?: string;
};

export const LEGAL_LAST_UPDATED = "26 de julho de 2026";

export const LEGAL_LINKS: LegalLink[] = [
  { path: "/politica-de-privacidade", label: "Política de Privacidade", shortLabel: "Privacidade" },
  { path: "/termos-de-uso", label: "Termos de Uso", shortLabel: "Termos" },
  { path: "/trocas-e-devolucoes", label: "Trocas e Devoluções", shortLabel: "Trocas" },
  { path: "/politica-de-entrega", label: "Política de Entrega", shortLabel: "Entrega" },
  { path: "/politica-de-comissoes", label: "Política de Comissões", shortLabel: "Comissões" },
  { path: "/politica-de-saques", label: "Política de Saques", shortLabel: "Saques" },
];

export const LEGAL_CONTACT_EMAIL = "privacidade@amadaamante.com.br";
