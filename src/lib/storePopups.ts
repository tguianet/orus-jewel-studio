import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";

export type StorePopup = {
  id: string;
  title: string;
  message: string;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  active: boolean;
  createdAt: string;
};

type StorePopupRow = Tables<"store_popups">;

const map = (r: StorePopupRow): StorePopup => ({
  id: r.id,
  title: r.title || "",
  message: r.message || "",
  imageUrl: r.image_url,
  ctaLabel: r.cta_label,
  ctaUrl: r.cta_url,
  active: r.active,
  createdAt: r.created_at,
});

export const loadStorePopups = async (): Promise<StorePopup[]> => {
  const { data, error } = await supabase
    .from("store_popups")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(map);
};

export const loadActivePopup = async (): Promise<StorePopup | null> => {
  const { data, error } = await supabase
    .from("store_popups")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data ? map(data) : null;
};

export const createStorePopup = async (p: Omit<StorePopup, "id" | "createdAt">) => {
  const { error } = await supabase.from("store_popups").insert({
    title: p.title,
    message: p.message,
    image_url: p.imageUrl,
    cta_label: p.ctaLabel,
    cta_url: p.ctaUrl,
    active: p.active,
  });
  if (error) throw error;
};

export const updateStorePopup = async (id: string, p: Partial<Omit<StorePopup, "id" | "createdAt">>) => {
  const patch: TablesUpdate<"store_popups"> = {};
  if (p.title !== undefined) patch.title = p.title;
  if (p.message !== undefined) patch.message = p.message;
  if (p.imageUrl !== undefined) patch.image_url = p.imageUrl;
  if (p.ctaLabel !== undefined) patch.cta_label = p.ctaLabel;
  if (p.ctaUrl !== undefined) patch.cta_url = p.ctaUrl;
  if (p.active !== undefined) patch.active = p.active;
  const { error } = await supabase.from("store_popups").update(patch).eq("id", id);
  if (error) throw error;
};

export const deleteStorePopup = async (id: string) => {
  const { error } = await supabase.from("store_popups").delete().eq("id", id);
  if (error) throw error;
};

export const setStorePopupActive = async (id: string, active: boolean) => {
  const { error } = await supabase.from("store_popups").update({ active }).eq("id", id);
  if (error) throw error;
};
