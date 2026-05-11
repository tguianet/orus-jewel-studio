import { supabase } from "@/integrations/supabase/client";

export type MarketingBanner = {
  id: string;
  title: string;
  imageUrl: string;
  active: boolean;
  sortOrder: number;
};

export const loadMarketingBanners = async (onlyActive = true): Promise<MarketingBanner[]> => {
  let q = supabase.from("marketing_banners").select("id,title,image_url,active,sort_order").order("sort_order", { ascending: true }).order("created_at", { ascending: false });
  if (onlyActive) q = q.eq("active", true);
  const { data, error } = await q;
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    title: r.title || "",
    imageUrl: r.image_url,
    active: r.active,
    sortOrder: r.sort_order || 0,
  }));
};

export const uploadMarketingBannerFile = async (file: File): Promise<string> => {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `marketing/banner-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("store-assets").upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from("store-assets").getPublicUrl(path);
  return data.publicUrl;
};

export const createMarketingBanner = async (b: { title: string; imageUrl: string }) => {
  const { error } = await supabase.from("marketing_banners").insert({ title: b.title, image_url: b.imageUrl });
  if (error) throw error;
};

export const setMarketingBannerActive = async (id: string, active: boolean) => {
  const { error } = await supabase.from("marketing_banners").update({ active }).eq("id", id);
  if (error) throw error;
};

export const deleteMarketingBanner = async (id: string) => {
  const { error } = await supabase.from("marketing_banners").delete().eq("id", id);
  if (error) throw error;
};
