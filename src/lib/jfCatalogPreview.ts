/** Phase 1: anonymous GET requests only; never shares the Orus auth session. */
const JF_ORIGIN = "https://wbvnvmyhqshzacgjexec.supabase.co";
const PAGE_SIZE = 100;
export type JfPreviewConfig = { enabled: boolean; publicKey: string };
type Variant = { id: string; size: string; stock: number; active: boolean };
export type JfCatalogRow = {
  id: string; name: string; sku: string | null; stock: number;
  product_images: { url: string; sort_order: number | null }[];
  product_variants: Variant[];
};
export type JfPreviewProduct = {
  sourceId: string; name: string; sku: string; stock: number;
  image: string | null; variants: Variant[];
};

function validateConfig(config: JfPreviewConfig) {
  if (!config.enabled) throw new Error("Prévia JF desativada neste ambiente.");
  if (config.publicKey.startsWith("sb_publishable_")) return;
  // Only legacy anon JWTs are allowed. Privileged keys must never enter a browser build.
  try {
    const payload = config.publicKey.split(".")[1];
    const claims = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    if (claims.role === "anon") return;
  } catch { /* invalid or missing public key */ }
  throw new Error("Configure somente a chave pública da JF Metais.");
}

export function mapJfPreviewProduct(row: JfCatalogRow): JfPreviewProduct {
  const variants = row.product_variants.filter((v) => v.active);
  const stock = (value: number) => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
  return {
    sourceId: row.id, name: row.name, sku: row.sku || "",
    stock: variants.length ? variants.reduce((sum, v) => sum + stock(v.stock), 0) : stock(row.stock),
    image: [...row.product_images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0]?.url || null,
    variants: variants.map((v) => ({ ...v, stock: stock(v.stock) })),
  };
}

export async function loadJfCatalogPreview(
  config: JfPreviewConfig,
  page = 0,
  request: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<{ products: JfPreviewProduct[]; hasMore: boolean }> {
  validateConfig(config);
  if (!Number.isInteger(page) || page < 0) throw new Error("Página inválida.");
  const url = new URL("/rest/v1/products", JF_ORIGIN);
  url.search = new URLSearchParams({
    select: "id,name,sku,stock,product_images(url,sort_order),product_variants(id,size,stock,active)",
    active: "eq.true", catalog_origin: "eq.jf_metais", order: "id.asc",
    offset: String(page * PAGE_SIZE), limit: String(PAGE_SIZE + 1),
  }).toString();
  const headers: Record<string, string> = { apikey: config.publicKey, Accept: "application/json" };
  if (!config.publicKey.startsWith("sb_publishable_")) headers.Authorization = `Bearer ${config.publicKey}`;
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, 15000);
  try {
    const response = await request(url, {
      method: "GET", headers, credentials: "omit", cache: "no-store", signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Não foi possível consultar a JF Metais (${response.status}).`);
    const rows: JfCatalogRow[] = await response.json();
    if (!Array.isArray(rows)) throw new Error("Resposta inválida da JF Metais.");
    return { products: rows.slice(0, PAGE_SIZE).map(mapJfPreviewProduct), hasMore: rows.length > PAGE_SIZE };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
