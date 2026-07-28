import type { StoreTemplateKey, StoreTemplateMeta } from "./types";
import { DEFAULT_STORE_TEMPLATE_KEY, STORE_TEMPLATE_KEYS, normalizeStoreTemplateKey } from "./types";

export const STORE_TEMPLATE_CATALOG: StoreTemplateMeta[] = [
  {
    key: "elegance",
    name: "Elegance",
    description: "Joalheria premium com hero amplo, tipografia sofisticada e foco na marca.",
    features: ["Hero cinematográfico", "Coleções em destaque", "Tom dourado e neutro"],
    previewGradient: "linear-gradient(135deg, #1a1410 0%, #d4a747 45%, #f5e6c8 100%)",
  },
  {
    key: "boutique",
    name: "Boutique",
    description: "Modelo comercial focado em conversão, preço e compra rápida no celular.",
    features: ["Produtos em destaque cedo", "CTAs maiores", "WhatsApp e promoções"],
    previewGradient: "linear-gradient(135deg, #111827 0%, #b45309 50%, #fef3c7 100%)",
  },
  {
    key: "minimal",
    name: "Minimal",
    description: "Visual limpo e leve, com foco nas imagens e navegação simples.",
    features: ["Poucos elementos", "Foco nas fotos", "Ótimo no celular"],
    previewGradient: "linear-gradient(135deg, #fafafa 0%, #e5e5e5 50%, #d4d4d4 100%)",
  },
];

export function getStoreTemplateMeta(key: StoreTemplateKey): StoreTemplateMeta {
  return (
    STORE_TEMPLATE_CATALOG.find((t) => t.key === key) ||
    STORE_TEMPLATE_CATALOG.find((t) => t.key === DEFAULT_STORE_TEMPLATE_KEY)!
  );
}

export function listActiveStoreTemplates(): StoreTemplateMeta[] {
  return STORE_TEMPLATE_CATALOG.filter((t) =>
    (STORE_TEMPLATE_KEYS as readonly string[]).includes(t.key),
  );
}

export { normalizeStoreTemplateKey, DEFAULT_STORE_TEMPLATE_KEY, STORE_TEMPLATE_KEYS };
