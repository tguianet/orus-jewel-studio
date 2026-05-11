import { supabase } from "@/integrations/supabase/client";

export type ImageFormat = {
  id: string;
  name: string;
  slug: string;
  width: number;
  height: number;
  description: string;
  active: boolean;
  sortOrder: number;
};

export type MarketingBanner = {
  id: string;
  title: string;
  imageUrl: string;
  active: boolean;
  sortOrder: number;
  formatId: string | null;
};

export const loadImageFormats = async (onlyActive = true): Promise<ImageFormat[]> => {
  let q = supabase.from("image_formats").select("id,name,slug,width,height,description,active,sort_order").order("sort_order", { ascending: true });
  if (onlyActive) q = q.eq("active", true);
  const { data, error } = await q;
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    width: r.width,
    height: r.height,
    description: r.description || "",
    active: r.active,
    sortOrder: r.sort_order || 0,
  }));
};

export const createImageFormat = async (f: { name: string; slug: string; width: number; height: number; description?: string }) => {
  const { error } = await supabase.from("image_formats").insert({
    name: f.name, slug: f.slug, width: f.width, height: f.height, description: f.description || "",
  });
  if (error) throw error;
};

export const updateImageFormat = async (id: string, patch: Partial<{ name: string; slug: string; width: number; height: number; description: string; active: boolean; sortOrder: number }>) => {
  const upd: any = {};
  if (patch.name !== undefined) upd.name = patch.name;
  if (patch.slug !== undefined) upd.slug = patch.slug;
  if (patch.width !== undefined) upd.width = patch.width;
  if (patch.height !== undefined) upd.height = patch.height;
  if (patch.description !== undefined) upd.description = patch.description;
  if (patch.active !== undefined) upd.active = patch.active;
  if (patch.sortOrder !== undefined) upd.sort_order = patch.sortOrder;
  const { error } = await supabase.from("image_formats").update(upd).eq("id", id);
  if (error) throw error;
};

export const deleteImageFormat = async (id: string) => {
  const { error } = await supabase.from("image_formats").delete().eq("id", id);
  if (error) throw error;
};

export const loadMarketingBanners = async (opts?: { onlyActive?: boolean; formatId?: string | null }): Promise<MarketingBanner[]> => {
  const onlyActive = opts?.onlyActive ?? true;
  let q = supabase.from("marketing_banners").select("id,title,image_url,active,sort_order,format_id").order("sort_order", { ascending: true }).order("created_at", { ascending: false });
  if (onlyActive) q = q.eq("active", true);
  if (opts?.formatId) q = q.eq("format_id", opts.formatId);
  const { data, error } = await q;
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    title: r.title || "",
    imageUrl: r.image_url,
    active: r.active,
    sortOrder: r.sort_order || 0,
    formatId: r.format_id,
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

export const createMarketingBanner = async (b: { title: string; imageUrl: string; formatId?: string | null }) => {
  const { error } = await supabase.from("marketing_banners").insert({
    title: b.title, image_url: b.imageUrl, format_id: b.formatId ?? null,
  });
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

export const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
