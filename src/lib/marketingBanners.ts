import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";
import type { StoreTheme } from "@/lib/storeTheme";

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
  /** Opcional — se existir no banco no futuro. */
  description?: string;
  startAt?: string | null;
  endAt?: string | null;
};

export const STORE_BANNER_FORMAT_SLUG = "banner-loja";
export const ADMIN_BANNERS_EMPTY_MESSAGE =
  "Não há banners prontos disponíveis no momento.";
export const ADMIN_BANNER_ADDED_TOAST = "Banner adicionado à sua loja.";
export const ADMIN_BANNER_DUPLICATE_TOAST = "Esse banner já está na sua loja.";

type ImageFormatRow = Tables<"image_formats">;
type MarketingBannerRow = Tables<"marketing_banners">;

export const loadImageFormats = async (onlyActive = true): Promise<ImageFormat[]> => {
  let q = supabase
    .from("image_formats")
    .select("id,name,slug,width,height,description,active,sort_order")
    .order("sort_order", { ascending: true });
  if (onlyActive) q = q.eq("active", true);
  const { data, error } = await q;
  if (error || !data) return [];
  return (data as ImageFormatRow[]).map((r) => ({
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

export const createImageFormat = async (f: {
  name: string;
  slug: string;
  width: number;
  height: number;
  description?: string;
}) => {
  const { error } = await supabase.from("image_formats").insert({
    name: f.name,
    slug: f.slug,
    width: f.width,
    height: f.height,
    description: f.description || "",
  });
  if (error) throw error;
};

export const updateImageFormat = async (
  id: string,
  patch: Partial<{
    name: string;
    slug: string;
    width: number;
    height: number;
    description: string;
    active: boolean;
    sortOrder: number;
  }>,
) => {
  const upd: TablesUpdate<"image_formats"> = {};
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

function mapBannerRow(r: MarketingBannerRow & Record<string, unknown>): MarketingBanner {
  return {
    id: r.id,
    title: r.title || "",
    imageUrl: r.image_url,
    active: r.active,
    sortOrder: r.sort_order || 0,
    formatId: r.format_id,
    description: typeof r.description === "string" ? r.description : undefined,
    startAt: (r.start_at as string | null | undefined) ?? null,
    endAt: (r.end_at as string | null | undefined) ?? null,
  };
}

export const loadMarketingBanners = async (opts?: {
  onlyActive?: boolean;
  formatId?: string | null;
}): Promise<MarketingBanner[]> => {
  const onlyActive = opts?.onlyActive ?? true;
  let q = supabase
    .from("marketing_banners")
    .select("id,title,image_url,active,sort_order,format_id")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (onlyActive) q = q.eq("active", true);
  if (opts?.formatId) q = q.eq("format_id", opts.formatId);
  const { data, error } = await q;
  if (error || !data) return [];
  return (data as MarketingBannerRow[]).map((r) =>
    mapBannerRow(r as MarketingBannerRow & Record<string, unknown>),
  );
};

/** Banner elegível para sacoleira: ativo e dentro da validade (se houver datas). */
export function isMarketingBannerCurrentlyAvailable(
  banner: Pick<MarketingBanner, "active" | "startAt" | "endAt">,
  now: Date = new Date(),
): boolean {
  if (!banner.active) return false;
  const t = now.getTime();
  if (banner.startAt) {
    const start = Date.parse(banner.startAt);
    if (Number.isFinite(start) && t < start) return false;
  }
  if (banner.endAt) {
    const end = Date.parse(banner.endAt);
    if (Number.isFinite(end) && t > end) return false;
  }
  return true;
}

export function getStoreBannerFormat(formats: ImageFormat[]): ImageFormat | null {
  return formats.find((f) => f.slug === STORE_BANNER_FORMAT_SLUG) || null;
}

export function filterAvailableStoreBanners(opts: {
  banners: MarketingBanner[];
  formats: ImageFormat[];
  now?: Date;
}): MarketingBanner[] {
  const format = getStoreBannerFormat(opts.formats);
  if (!format) {
    return opts.banners.filter(
      (b) => isMarketingBannerCurrentlyAvailable(b, opts.now) && !b.formatId,
    );
  }
  return opts.banners
    .filter((b) => b.formatId === format.id)
    .filter((b) => isMarketingBannerCurrentlyAvailable(b, opts.now));
}

export function themeBannerUrls(theme: Pick<StoreTheme, "bannerUrl" | "bannerUrls">): string[] {
  if (theme.bannerUrls && theme.bannerUrls.length) return [...theme.bannerUrls];
  if (theme.bannerUrl) return [theme.bannerUrl];
  return [];
}

export function isAdminBannerAlreadyInStore(
  theme: Pick<StoreTheme, "bannerUrl" | "bannerUrls">,
  imageUrl: string,
): boolean {
  return themeBannerUrls(theme).includes(imageUrl);
}

export type AppendAdminBannerResult =
  | { ok: true; theme: StoreTheme }
  | { ok: false; reason: "duplicate" | "empty_url" };

/** Vincula URL pública do banner admin à loja (sem copiar arquivo). */
export function appendAdminBannerToTheme(
  theme: StoreTheme,
  imageUrl: string,
): AppendAdminBannerResult {
  const url = String(imageUrl || "").trim();
  if (!url) return { ok: false, reason: "empty_url" };
  const list = themeBannerUrls(theme);
  if (list.includes(url)) return { ok: false, reason: "duplicate" };
  const next = [...list, url];
  return {
    ok: true,
    theme: { ...theme, bannerUrl: next[0], bannerUrls: next },
  };
}

export const loadAvailableStoreBanners = async (): Promise<{
  banners: MarketingBanner[];
  format: ImageFormat | null;
  error: string | null;
}> => {
  try {
    const [formats, banners] = await Promise.all([
      loadImageFormats(true),
      loadMarketingBanners({ onlyActive: true }),
    ]);
    const format = getStoreBannerFormat(formats);
    const available = filterAvailableStoreBanners({ banners, formats });
    return { banners: available, format, error: null };
  } catch {
    return {
      banners: [],
      format: null,
      error: "Não foi possível carregar os banners prontos.",
    };
  }
};

export const uploadMarketingBannerFile = async (file: File): Promise<string> => {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `marketing/banner-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("store-assets")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from("store-assets").getPublicUrl(path);
  return data.publicUrl;
};

export const createMarketingBanner = async (b: {
  title: string;
  imageUrl: string;
  formatId?: string | null;
}) => {
  const { error } = await supabase.from("marketing_banners").insert({
    title: b.title,
    image_url: b.imageUrl,
    format_id: b.formatId ?? null,
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

/** Conta lojas que referenciam a URL do banner no theme (vínculo por URL pública). */
export function countStoresUsingBannerUrl(
  themes: Array<{ bannerUrl?: string | null; bannerUrls?: string[] | null } | null | undefined>,
  imageUrl: string,
): number {
  const url = String(imageUrl || "").trim();
  if (!url) return 0;
  let n = 0;
  for (const theme of themes) {
    if (!theme) continue;
    if (themeBannerUrls(theme as Pick<StoreTheme, "bannerUrl" | "bannerUrls">).includes(url)) n += 1;
  }
  return n;
}

export const loadSellerStoreThemesForBannerUsage = async (): Promise<
  Array<{ bannerUrl?: string | null; bannerUrls?: string[] | null }>
> => {
  const { data, error } = await supabase.from("seller_stores").select("theme");
  if (error || !data) return [];
  return data.map((row) => {
    const theme = (row.theme || {}) as {
      bannerUrl?: string | null;
      bannerUrls?: string[] | null;
    };
    return theme;
  });
};

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
