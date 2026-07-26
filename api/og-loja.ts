import {
  buildStoreOgHtml,
  OFFICIAL_APP_ORIGIN,
  resolveStoreOgImageUrl,
  STORE_OG_DESCRIPTION,
} from "../src/lib/storeShare";

type StoreRow = {
  store_name: string | null;
  store_slug: string | null;
  status: string | null;
  updated_at?: string | null;
  theme?: {
    logoUrl?: string | null;
    bannerUrl?: string | null;
    bannerUrls?: string[] | null;
  } | null;
};

type ReqRequest = {
  query?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  statusCode: number;
  setHeader: (name: string, value: string) => void;
  end: (body: string) => void;
};

function env(name: string): string {
  return String(process.env[name] || "").trim();
}

function querySlug(req: ApiRequest): string {
  const raw = req.query?.slug;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return String(value || "").trim();
}

async function loadStoreBySlug(slug: string): Promise<StoreRow | null> {
  const base = env("SUPABASE_URL") || env("VITE_SUPABASE_URL");
  const key =
    env("SUPABASE_ANON_KEY")
    || env("VITE_SUPABASE_PUBLISHABLE_KEY")
    || env("SUPABASE_PUBLISHABLE_KEY");

  if (!base || !key) return null;

  const url = new URL(`${base.replace(/\/$/, "")}/rest/v1/seller_stores`);
  url.searchParams.set("select", "store_name,store_slug,status,updated_at,theme");
  url.searchParams.set("store_slug", `eq.${slug}`);
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString(), {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) return null;
  const rows = (await res.json()) as StoreRow[];
  return rows?.[0] ?? null;
}

function sendOg(res: ApiResponse, html: string, cacheSeconds = 300) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}`,
  );
  res.setHeader("X-Robots-Tag", "noindex");
  res.end(html);
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  try {
    const raw = querySlug(req);
    const slug = decodeURIComponent(raw).replace(/^\/+|\/+$/g, "");
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug)) {
      sendOg(
        res,
        buildStoreOgHtml({
          slug: "amada-amante",
          storeName: "Amada Amante",
          imageUrl: resolveStoreOgImageUrl({ version: "fallback" }),
          description: STORE_OG_DESCRIPTION,
        }),
        60,
      );
      return;
    }

    const store = await loadStoreBySlug(slug);
    const storeName = store?.store_name?.trim() || slug;
    const theme = store?.theme || {};
    const banner =
      (Array.isArray(theme.bannerUrls) && theme.bannerUrls[0])
      || theme.bannerUrl
      || null;
    const version = store?.updated_at || Date.now();

    const imageUrl = resolveStoreOgImageUrl({
      logoUrl: theme.logoUrl,
      bannerUrl: banner,
      origin: OFFICIAL_APP_ORIGIN,
      version,
    });

    sendOg(
      res,
      buildStoreOgHtml({
        slug: store?.store_slug || slug,
        storeName,
        imageUrl,
        description: STORE_OG_DESCRIPTION,
      }),
    );
  } catch {
    const slug = querySlug(req) || "loja";
    sendOg(
      res,
      buildStoreOgHtml({
        slug,
        storeName: "Amada Amante",
        imageUrl: resolveStoreOgImageUrl({ version: "error" }),
      }),
      60,
    );
  }
}
