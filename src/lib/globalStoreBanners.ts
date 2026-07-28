import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import { uploadMarketingBannerFile } from "@/lib/marketingBanners";

export type GlobalStoreBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  mobileImageUrl: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
  isActive: boolean;
  isMandatory: boolean;
  position: number;
  startsAt: string | null;
  endsAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GlobalStoreBannerLifecycle =
  | "active"
  | "scheduled"
  | "ended"
  | "paused";

export type GlobalStoreBannerInput = {
  id?: string | null;
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  mobileImageUrl?: string | null;
  buttonText?: string | null;
  buttonUrl?: string | null;
  isActive?: boolean;
  isMandatory?: boolean;
  position?: number;
  startsAt?: string | null;
  endsAt?: string | null;
};

type Row = Tables<"global_store_banners">;

const CACHE_TTL_MS = 45_000;
let activeCache: { at: number; rows: GlobalStoreBanner[] } | null = null;

export const GLOBAL_CAMPAIGN_NOTICE_SELLER =
  "Campanhas oficiais da Amada Amante podem aparecer automaticamente na sua loja.";

export const ALLOWED_BANNER_MIME = ["image/png", "image/jpeg", "image/jpg", "image/webp"] as const;
export const MAX_BANNER_BYTES = 5 * 1024 * 1024;

export function isSafeBannerButtonUrl(url: string | null | undefined): boolean {
  const v = String(url || "").trim();
  if (!v) return true;
  const lower = v.toLowerCase();
  if (/^(javascript|data|vbscript|file):/i.test(lower)) return false;
  return /^https?:\/\//i.test(v);
}

export function assertSafeBannerButtonUrl(url: string | null | undefined): void {
  if (!isSafeBannerButtonUrl(url)) {
    throw new Error("Link do botão inválido. Use http:// ou https://.");
  }
}

export function validateBannerImageFile(file: File): void {
  const type = (file.type || "").toLowerCase();
  const okMime = ALLOWED_BANNER_MIME.some((m) => type === m || (m === "image/jpg" && type === "image/jpeg"));
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const okExt = ["png", "jpg", "jpeg", "webp"].includes(ext);
  if (!okMime && !okExt) {
    throw new Error("Use imagem PNG, JPG ou WEBP.");
  }
  if (file.size > MAX_BANNER_BYTES) {
    throw new Error("Imagem muito grande (máx 5MB).");
  }
}

export async function uploadGlobalCampaignImage(file: File): Promise<string> {
  validateBannerImageFile(file);
  return uploadMarketingBannerFile(file);
}

const mapRow = (r: Row): GlobalStoreBanner => ({
  id: r.id,
  title: r.title || "",
  subtitle: r.subtitle,
  imageUrl: r.image_url,
  mobileImageUrl: r.mobile_image_url,
  buttonText: r.button_text,
  buttonUrl: r.button_url,
  isActive: !!r.is_active,
  isMandatory: r.is_mandatory !== false,
  position: Number(r.position ?? 0),
  startsAt: r.starts_at,
  endsAt: r.ends_at,
  createdBy: r.created_by,
  updatedBy: r.updated_by,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

/** Regra de exibição pública (espelha RLS). */
export function isCampaignVisibleNow(
  c: Pick<GlobalStoreBanner, "isActive" | "startsAt" | "endsAt">,
  now: Date = new Date(),
): boolean {
  if (!c.isActive) return false;
  if (c.startsAt) {
    const start = new Date(c.startsAt);
    if (!Number.isNaN(start.getTime()) && start.getTime() > now.getTime()) return false;
  }
  if (c.endsAt) {
    const end = new Date(c.endsAt);
    if (!Number.isNaN(end.getTime()) && end.getTime() <= now.getTime()) return false;
  }
  return true;
}

export function getCampaignLifecycle(
  c: Pick<GlobalStoreBanner, "isActive" | "startsAt" | "endsAt">,
  now: Date = new Date(),
): GlobalStoreBannerLifecycle {
  if (!c.isActive) return "paused";
  if (c.startsAt) {
    const start = new Date(c.startsAt);
    if (!Number.isNaN(start.getTime()) && start.getTime() > now.getTime()) return "scheduled";
  }
  if (c.endsAt) {
    const end = new Date(c.endsAt);
    if (!Number.isNaN(end.getTime()) && end.getTime() <= now.getTime()) return "ended";
  }
  return "active";
}

export function sortCampaignsByPosition(list: GlobalStoreBanner[]): GlobalStoreBanner[] {
  return [...list].sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    return String(a.createdAt).localeCompare(String(b.createdAt));
  });
}

function invalidateActiveCache() {
  activeCache = null;
}

/** Uma consulta global por carregamento da loja (RLS filtra ativas no período). */
export async function loadActiveGlobalStoreBanners(opts?: {
  bypassCache?: boolean;
}): Promise<GlobalStoreBanner[]> {
  const now = Date.now();
  if (!opts?.bypassCache && activeCache && now - activeCache.at < CACHE_TTL_MS) {
    return activeCache.rows;
  }
  try {
    const { data, error } = await supabase
      .from("global_store_banners")
      .select("*")
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    const rows = sortCampaignsByPosition((data || []).map(mapRow)).filter((c) =>
      isCampaignVisibleNow(c),
    );
    // Dedup por id
    const seen = new Set<string>();
    const unique = rows.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
    activeCache = { at: now, rows: unique };
    return unique;
  } catch {
    return [];
  }
}

/** Só para lojas aprovadas; erros nunca quebram a loja. */
export async function loadCampaignsForApprovedStore(
  storeStatus: string | null | undefined,
): Promise<GlobalStoreBanner[]> {
  if (String(storeStatus || "").toLowerCase() !== "approved") return [];
  try {
    return await loadActiveGlobalStoreBanners();
  } catch {
    return [];
  }
}

export async function adminListGlobalStoreBanners(): Promise<GlobalStoreBanner[]> {
  const { data, error } = await supabase.rpc("admin_list_global_store_banners");
  if (error) throw error;
  return sortCampaignsByPosition((data || []).map(mapRow));
}

function toPayload(input: GlobalStoreBannerInput): Json {
  assertSafeBannerButtonUrl(input.buttonUrl);
  if (!isSafeBannerButtonUrl(input.imageUrl) && !String(input.imageUrl || "").startsWith("/")) {
    throw new Error("URL da imagem inválida.");
  }
  if (input.mobileImageUrl && !isSafeBannerButtonUrl(input.mobileImageUrl) && !input.mobileImageUrl.startsWith("/")) {
    throw new Error("URL da imagem mobile inválida.");
  }
  return {
    id: input.id || null,
    title: input.title.trim(),
    subtitle: input.subtitle?.trim() || null,
    image_url: input.imageUrl.trim(),
    mobile_image_url: input.mobileImageUrl?.trim() || null,
    button_text: input.buttonText?.trim() || null,
    button_url: input.buttonUrl?.trim() || null,
    is_active: input.isActive ?? false,
    is_mandatory: input.isMandatory ?? true,
    position: input.position ?? 0,
    starts_at: input.startsAt || null,
    ends_at: input.endsAt || null,
  };
}

export async function adminUpsertGlobalStoreBanner(
  input: GlobalStoreBannerInput,
): Promise<GlobalStoreBanner> {
  const { data, error } = await supabase.rpc("admin_upsert_global_store_banner", {
    p_payload: toPayload(input),
  });
  if (error) throw error;
  invalidateActiveCache();
  return mapRow(data as Row);
}

export async function adminSetGlobalStoreBannerActive(
  id: string,
  isActive: boolean,
): Promise<GlobalStoreBanner> {
  const { data, error } = await supabase.rpc("admin_set_global_store_banner_active", {
    p_id: id,
    p_is_active: isActive,
  });
  if (error) throw error;
  invalidateActiveCache();
  return mapRow(data as Row);
}

export async function adminDeleteGlobalStoreBanner(id: string): Promise<void> {
  const { error } = await supabase.rpc("admin_delete_global_store_banner", {
    p_id: id,
  });
  if (error) throw error;
  invalidateActiveCache();
}

export async function adminDuplicateGlobalStoreBanner(id: string): Promise<GlobalStoreBanner> {
  const { data, error } = await supabase.rpc("admin_duplicate_global_store_banner", {
    p_id: id,
  });
  if (error) throw error;
  invalidateActiveCache();
  return mapRow(data as Row);
}

/** Remove arquivo do storage só se nenhuma campanha (nem banners de marketing) referenciar. */
export async function maybeDeleteOrphanCampaignImage(url: string | null | undefined): Promise<void> {
  const u = String(url || "").trim();
  if (!u || !u.includes("/store-assets/")) return;
  try {
    const { data: campaigns } = await supabase
      .from("global_store_banners")
      .select("id")
      .or(`image_url.eq.${u},mobile_image_url.eq.${u}`)
      .limit(1);
    if (campaigns && campaigns.length > 0) return;

    const marker = "/store-assets/";
    const idx = u.indexOf(marker);
    if (idx < 0) return;
    const path = decodeURIComponent(u.slice(idx + marker.length));
    if (!path.startsWith("marketing/")) return;
    await supabase.storage.from("store-assets").remove([path]);
  } catch {
    /* não bloquear fluxo admin */
  }
}

export function groupCampaignsByLifecycle(list: GlobalStoreBanner[]): Record<
  GlobalStoreBannerLifecycle,
  GlobalStoreBanner[]
> {
  const groups: Record<GlobalStoreBannerLifecycle, GlobalStoreBanner[]> = {
    active: [],
    scheduled: [],
    ended: [],
    paused: [],
  };
  for (const c of list) {
    groups[getCampaignLifecycle(c)].push(c);
  }
  return groups;
}

/** Para testes unitários do cache. */
export function __resetGlobalBannerCacheForTests() {
  activeCache = null;
}
