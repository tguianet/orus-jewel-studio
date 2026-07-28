/** Tipos comerciais de joia usados no cálculo MLM (não confundir com categoria). */
export const JEWELRY_MATERIALS = ["gold", "silver", "plated"] as const;

export type JewelryMaterial = (typeof JEWELRY_MATERIALS)[number];

export const JEWELRY_MATERIAL_LABELS: Record<JewelryMaterial, string> = {
  gold: "Ouro",
  silver: "Prata",
  plated: "Folheado",
};

export const JEWELRY_MATERIAL_OPTIONS: { value: JewelryMaterial; label: string }[] = [
  { value: "gold", label: "Ouro" },
  { value: "silver", label: "Prata" },
  { value: "plated", label: "Folheado" },
];

export function isJewelryMaterial(value: unknown): value is JewelryMaterial {
  return typeof value === "string" && (JEWELRY_MATERIALS as readonly string[]).includes(value);
}

export function jewelryMaterialLabel(value: string | null | undefined): string {
  if (!value) return "Pendente";
  if (isJewelryMaterial(value)) return JEWELRY_MATERIAL_LABELS[value];
  return value;
}

export const PRODUCT_JEWELRY_MATERIAL_REQUIRED_MSG =
  "Selecione se esta joia é Ouro, Prata ou Folheada.";

export const PRODUCT_JEWELRY_MATERIAL_BLOCK_MSG =
  "Defina o tipo da joia antes de disponibilizar este produto para venda.";
