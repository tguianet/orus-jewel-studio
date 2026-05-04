import { supabase } from "@/integrations/supabase/client";
import defaultBanner from "@/assets/default-store-banner.jpg";

export const DEFAULT_BANNER = defaultBanner;

export type StoreTheme = {
  bannerUrl?: string;
  logoUrl?: string;
  description?: string;
  whatsapp?: string;
  instagram?: string;
  primaryColor?: string;
  secondaryColor?: string;
};

export type StoreCustomization = {
  id: string;
  storeName: string;
  storeSlug: string;
  contactPhone: string | null;
  theme: StoreTheme;
};

export const defaultTheme: StoreTheme = {
  primaryColor: "#d4a747",
  secondaryColor: "#f5e6c8",
};

export const loadCurrentSellerStore = async (): Promise<StoreCustomization | null> => {
  const { data, error } = await supabase
    .from("seller_stores")
    .select("id, store_name, store_slug, contact_phone, theme")
    .eq("status", "approved")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
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
  const update: Record<string, unknown> = { theme: patch.theme };
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
