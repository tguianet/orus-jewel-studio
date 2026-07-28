import type { CloudStoreProduct } from "@/lib/cloudStore";
import type { StoreTheme } from "@/lib/storeTheme";
import type { StoreHeroSlide } from "@/lib/storeHeroSlides";
import type { Sacoleira } from "@/types/commerce";

export const STORE_TEMPLATE_KEYS = ["elegance", "boutique", "minimal"] as const;

export type StoreTemplateKey = (typeof STORE_TEMPLATE_KEYS)[number];

export const DEFAULT_STORE_TEMPLATE_KEY: StoreTemplateKey = "elegance";

export type StoreTemplateMeta = {
  key: StoreTemplateKey;
  name: string;
  description: string;
  features: string[];
  /** CSS gradient used as card thumbnail preview */
  previewGradient: string;
};

export type StoreTemplateHomeProps = {
  store: Sacoleira;
  theme: StoreTheme;
  /** URLs dos banners (compatibilidade / prévia). Preferir heroSlides. */
  banners: string[];
  /** Contrato comum: campanhas oficiais + banners da sacoleira. */
  heroSlides?: StoreHeroSlide[];
  products: CloudStoreProduct[];
  filteredProducts: CloudStoreProduct[];
  categories: string[];
  collections: string[];
  activeCategory: string;
  onActiveCategoryChange: (cat: string) => void;
  query: string;
  productsLoading: boolean;
  productsError: string | null;
  /** When true, templates should avoid heavy autoplay if desired */
  previewMode?: boolean;
  /** Só na prévia: força layout de celular dentro da moldura (viewport real permanece desktop) */
  previewViewport?: "desktop" | "mobile";
};

export function normalizeStoreTemplateKey(value: unknown): StoreTemplateKey {
  const key = String(value ?? "")
    .trim()
    .toLowerCase();
  if ((STORE_TEMPLATE_KEYS as readonly string[]).includes(key)) {
    return key as StoreTemplateKey;
  }
  return DEFAULT_STORE_TEMPLATE_KEY;
}
