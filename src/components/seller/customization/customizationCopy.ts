import type { StoreTemplateKey } from "@/components/store/templates/types";

export type CustomizationStepId = 1 | 2 | 3 | 4 | 5;

export const CUSTOMIZATION_STEPS: {
  id: CustomizationStepId;
  short: string;
  title: string;
}[] = [
  { id: 1, short: "Modelo", title: "Escolha o estilo da sua loja" },
  { id: 2, short: "Identidade", title: "Deixe a loja com a sua cara" },
  { id: 3, short: "Capa", title: "Escolha a imagem principal" },
  { id: 4, short: "Contato", title: "Como seus clientes falam com você?" },
  { id: 5, short: "Revisão", title: "Confira sua loja" },
];

export type ReadyColorPreset = {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  /** Miniatura: fundo / destaque / texto */
  swatches: [string, string, string];
};

/** Combinações prontas (sem jargão técnico). */
export const READY_COLOR_PRESETS: ReadyColorPreset[] = [
  {
    id: "gold-black",
    name: "Dourado e preto",
    primary: "#d4a747",
    secondary: "#1a1410",
    swatches: ["#1a1410", "#d4a747", "#f5e6c8"],
  },
  {
    id: "rose-gold",
    name: "Rosa e dourado",
    primary: "#d4877a",
    secondary: "#f5e6c8",
    swatches: ["#f7e6df", "#d4877a", "#d4a747"],
  },
  {
    id: "white-gold",
    name: "Branco e dourado",
    primary: "#c8a46b",
    secondary: "#f8f7f5",
    swatches: ["#ffffff", "#c8a46b", "#f5e6c8"],
  },
  {
    id: "black-silver",
    name: "Preto e prata",
    primary: "#a8a29e",
    secondary: "#111111",
    swatches: ["#111111", "#a8a29e", "#e7e5e4"],
  },
  {
    id: "nude-brown",
    name: "Nude e marrom",
    primary: "#c8b59c",
    secondary: "#5a4630",
    swatches: ["#e8dcc8", "#c8b59c", "#5a4630"],
  },
];

export type DescriptionSuggestion = {
  id: "elegant" | "commercial" | "warm";
  label: string;
  text: string;
};

export const DESCRIPTION_SUGGESTIONS: DescriptionSuggestion[] = [
  {
    id: "elegant",
    label: "Elegante",
    text: "Joias selecionadas para deixar seus momentos ainda mais especiais.",
  },
  {
    id: "commercial",
    label: "Comercial",
    text: "Encontre sua próxima joia favorita e compre com facilidade.",
  },
  {
    id: "warm",
    label: "Acolhedor",
    text: "Escolhi cada peça com carinho para você.",
  },
];

export function templateDisplayName(key: StoreTemplateKey | string): string {
  if (key === "boutique") return "Boutique";
  if (key === "minimal") return "Minimal";
  return "Elegance";
}

export function findReadyPresetByColors(
  primary?: string,
  secondary?: string,
): ReadyColorPreset | null {
  if (!primary) return null;
  const p = primary.toLowerCase();
  const s = (secondary || "").toLowerCase();
  return (
    READY_COLOR_PRESETS.find(
      (preset) =>
        preset.primary.toLowerCase() === p
        && (!s || preset.secondary.toLowerCase() === s),
    ) || null
  );
}
