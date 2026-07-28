import { supabase } from "@/integrations/supabase/client";
import defaultBanner from "@/assets/default-store-banner.jpg";

export const DEFAULT_BANNER = defaultBanner;

export type StoreTheme = {
  bannerUrl?: string;
  bannerUrls?: string[];
  logoUrl?: string;
  logoFormat?: "square" | "wide"; // "square" = 400x400, "wide" = 800x400
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
  heroBgColor?: string;
  heroTextColor?: string;
  heroFontFamily?: string;
  // Benefícios (faixa abaixo do hero)
  benefits?: string[];
  benefitsBgColor?: string;
  benefitsTextColor?: string;
  benefitsFontFamily?: string;
  // Sobre
  aboutEyebrow?: string;
  aboutTitle?: string;
  aboutText?: string;
  aboutText2?: string;
  aboutBgColor?: string;
  aboutTextColor?: string;
  aboutFontFamily?: string;
  // CTA final
  finalCtaEyebrow?: string;
  finalCtaTitle?: string;
  finalCtaBgColor?: string;
  finalCtaTextColor?: string;
  finalCtaFontFamily?: string;
  // Rodapé (footer)
  footerAbout?: string;
  footerLinks?: { label: string; url: string }[];
  footerCopyright?: string;
  footerBgColor?: string;
  footerTextColor?: string;
  footerFontFamily?: string;
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
  templateKey: string;
};

export const defaultTheme: StoreTheme = {
  primaryColor: "#1a1410",
  secondaryColor: "#f5e6c8",
  accentColor: "#f4a78a",
};

export const loadCurrentSellerStore = async (storeId?: string): Promise<StoreCustomization | null> => {
  let query = supabase
    .from("seller_stores")
    .select("id, store_name, store_slug, contact_phone, theme, template_key");
  if (storeId) query = query.eq("id", storeId);
  else query = query.eq("status", "approved").order("created_at", { ascending: true }).limit(1);

  let { data, error } = await query.maybeSingle();

  if (error && /template_key/i.test(error.message || "")) {
    let legacy = supabase
      .from("seller_stores")
      .select("id, store_name, store_slug, contact_phone, theme");
    if (storeId) legacy = legacy.eq("id", storeId);
    else legacy = legacy.eq("status", "approved").order("created_at", { ascending: true }).limit(1);
    ({ data, error } = await legacy.maybeSingle());
  }

  if (error || !data) return null;
  const row = data as unknown as {
    id: string;
    store_name: string;
    store_slug: string;
    contact_phone: string | null;
    theme: StoreTheme | null;
    template_key?: string;
  };
  return {
    id: row.id,
    storeName: row.store_name,
    storeSlug: row.store_slug,
    contactPhone: row.contact_phone,
    theme: row.theme || {},
    templateKey: row.template_key || "elegance",
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

/**
 * Atualiza somente o template visual da loja (não altera theme nem dados comerciais).
 * Erros são normalizados em AppError com metadados sanitizados para diagnóstico.
 */
export const updateStoreTemplateKey = async (storeId: string, templateKey: string) => {
  const key = String(templateKey || "")
    .trim()
    .toLowerCase();

  const baseContext = {
    operation: "update_store_template",
    entityType: "seller_store",
    entityId: storeId,
    metadata: { template_key: key },
  } as const;

  if (key !== "elegance" && key !== "boutique" && key !== "minimal") {
    throw new AppError({
      code: "VALIDATION_FAILED",
      userMessage: "Template inválido. Escolha Elegance, Boutique ou Minimal.",
      technicalMessage: `Template inválido: ${key || "(vazio)"}`,
      ...baseContext,
    });
  }

  const { data, error } = await supabase
    .from("seller_stores")
    .update({ template_key: key } as never)
    .eq("id", storeId)
    .select("template_key")
    .maybeSingle();

  if (error) {
    const raw = error as { message?: string; code?: string; details?: string; hint?: string };
    const text = `${raw.message ?? ""} ${raw.details ?? ""} ${raw.hint ?? ""}`.toLowerCase();
    const missingColumn =
      raw.code === "42703"
      || raw.code === "PGRST204"
      || (text.includes("template_key") && (text.includes("column") || text.includes("coluna")));
    const denied =
      raw.code === "42501" || text.includes("permission denied") || text.includes("row-level");
    const constraint = raw.code === "23514" || text.includes("check constraint");

    const code = missingColumn
      ? "STORE_TEMPLATE_UNAVAILABLE"
      : denied
        ? "AUTH_ACCESS_DENIED"
        : constraint
          ? "DATABASE_VALIDATION"
          : "STORE_TEMPLATE_UPDATE_FAILED";

    throw new AppError({
      code,
      technicalMessage: String(raw.message ?? "erro desconhecido").slice(0, 400),
      originalError: error,
      ...baseContext,
      metadata: {
        ...baseContext.metadata,
        pg_code: raw.code ?? null,
        pg_details: raw.details ?? null,
        pg_hint: raw.hint ?? null,
      },
    });
  }

  if (!data) {
    throw new AppError({
      code: "AUTH_ACCESS_DENIED",
      userMessage: "Loja não encontrada ou sem permissão para alterar o modelo.",
      technicalMessage: "update retornou 0 linhas (RLS/owner_user_id ou id inexistente)",
      ...baseContext,
    });
  }

  return (data as { template_key?: string }).template_key as string;
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
