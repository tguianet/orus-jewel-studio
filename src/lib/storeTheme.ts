import { supabase } from "@/integrations/supabase/client";
import defaultBanner from "@/assets/default-store-banner.jpg";

export const DEFAULT_BANNER = defaultBanner;

export type StoreTheme = {
  bannerUrl?: string;
  bannerUrls?: string[];
  logoUrl?: string;
  description?: string;
  whatsapp?: string;
  instagram?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string; // Cor de destaque (faixa topo / CTAs estilo Vivara)
  // Faixa superior (top bar)
  topBarLeftText?: string;
  topBarCenterText?: string;
  topBarRightText?: string;
  // Categorias destaque (estilo Vivara)
  categoriesTitle?: string;
  categoriesSubtitle?: string;
  categoriesBgColor?: string; // Cor de fundo da seção "Joias [Loja]"
  categoriesTextColor?: string; // Cor do texto (título e subtítulo) da seção
  categoriesFontFamily?: string; // Família tipográfica da seção
  categoriesDividerColor?: string; // Cor do risco abaixo do título
  categoriesDividerWidth?: number; // Largura (px) do risco
  categoriesDividerHeight?: number; // Espessura (px) do risco
  headerBgColor?: string; // Cor de fundo do header (menu)
  headerTextColor?: string; // Cor dos textos/links do header
  headerFontFamily?: string; // Família tipográfica dos textos do header
  categoryImages?: Record<string, string>;
  // Hero
  heroEyebrow?: string;
  heroTitle1?: string;
  heroTitleHighlight?: string;
  heroPromoText?: string;
  heroCtaPrimary?: string;
  heroCtaSecondary?: string;
  // Benefícios (faixa abaixo do hero)
  benefits?: string[];
  // Sobre
  aboutEyebrow?: string;
  aboutTitle?: string;
  aboutText?: string;
  aboutText2?: string;
  // CTA final
  finalCtaEyebrow?: string;
  finalCtaTitle?: string;
  // Seções visíveis
  showCollections?: boolean;
  showMaterials?: boolean;
  showCare?: boolean;
  showGuarantee?: boolean;
  showFinalCta?: boolean;
};

export type StoreCustomization = {
  id: string;
  storeName: string;
  storeSlug: string;
  contactPhone: string | null;
  theme: StoreTheme;
};

export const defaultTheme: StoreTheme = {
  primaryColor: "#1a1410",
  secondaryColor: "#f5e6c8",
  accentColor: "#f4a78a",
};

export const loadCurrentSellerStore = async (storeId?: string): Promise<StoreCustomization | null> => {
  let q = supabase.from("seller_stores").select("id, store_name, store_slug, contact_phone, theme");
  if (storeId) q = q.eq("id", storeId);
  else q = q.eq("status", "approved").order("created_at", { ascending: true }).limit(1);
  const { data, error } = await q.maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    storeName: data.store_name,
    storeSlug: data.store_slug,
    contactPhone: data.contact_phone,
    theme: (data.theme as StoreTheme) || {},
  };
};

export const loadStoreThemeBySlug = async (slug?: string): Promise<StoreTheme | null> => {
  if (!slug) return null;
  const { data, error } = await supabase
    .from("seller_stores")
    .select("theme")
    .eq("store_slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return (data.theme as StoreTheme) || {};
};

export const saveStoreCustomization = async (
  storeId: string,
  patch: { storeName?: string; storeSlug?: string; contactPhone?: string; theme: StoreTheme }
) => {
  const update: {
    theme: StoreTheme;
    store_name?: string;
    store_slug?: string;
    contact_phone?: string;
  } = { theme: patch.theme };
  if (patch.storeName !== undefined) update.store_name = patch.storeName;
  if (patch.storeSlug !== undefined) update.store_slug = patch.storeSlug;
  if (patch.contactPhone !== undefined) update.contact_phone = patch.contactPhone;
  const { error } = await supabase.from("seller_stores").update(update).eq("id", storeId);
  if (error) throw error;
};

export const uploadStoreAsset = async (
  storeId: string,
  kind: "banner" | "logo",
  file: File
): Promise<string> => {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${storeId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("store-assets")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from("store-assets").getPublicUrl(path);
  return data.publicUrl;
};
