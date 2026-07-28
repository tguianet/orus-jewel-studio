import type { CloudStoreProduct } from "@/lib/cloudStore";
import type { StoreTheme } from "@/lib/storeTheme";
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
  banners: string[];
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
