// Edge Function: HTML server-side com Open Graph para crawlers (WhatsApp/Facebook/X).
// Uso: /functions/v1/og-loja?slug=minha-loja  ou  /functions/v1/og-loja/minha-loja
// Humanos são redirecionados (302) para https://amadaamante.app/loja/{slug}.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const OFFICIAL_APP_ORIGIN = "https://amadaamante.app";
const DEFAULT_OG_IMAGE = `${OFFICIAL_APP_ORIGIN}/og/amada-amante-store.jpg`;
const OG_DESCRIPTION = "Conheça minha loja Amada Amante e escolha suas joias favoritas.";

const SOCIAL_BOT_RE =
  /whatsapp|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|pinterest|skypeuripreview|googlebot|bingbot|embedly|redditbot|applebot|vkshare|w3c_validator|yandex|baiduspider/i;

function isSocialCrawler(ua: string | null): boolean {
  return SOCIAL_BOT_RE.test(String(ua ?? ""));
}

function escapeHtml(v: string): string {
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isUsableOgImageUrl(url: unknown): url is string {
  const u = String(url ?? "").trim();
  if (!/^https:\/\//i.test(u)) return false;
  if (/\.svg(\?|#|$)/i.test(u)) return false;
  if (/lovable\.app|lovableproject\.com|lovable\.dev/i.test(u)) return false;
  return true;
}

function sanitizeSlug(raw: string): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "")
    .slice(0, 80);
}

function storeUrl(slug: string): string {
  return `${OFFICIAL_APP_ORIGIN}/loja/${slug}`;
}

type StoreRow = {
  store_name?: string | null;
  status?: string | null;
  updated_at?: string | null;
  theme?: { logoUrl?: string | null; bannerUrl?: string | null } | null;
};

async function loadStore(slug: string): Promise<StoreRow | null> {
  const base = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY");
  if (!base || !key) return null;

  const url = new URL(`${base.replace(/\/$/, "")}/rest/v1/seller_stores`);
  url.searchParams.set("select", "store_name,status,updated_at,theme");
  url.searchParams.set("store_slug", `eq.${slug}`);
  url.searchParams.set("limit", "1");

  try {
    const res = await fetch(url.toString(), {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as StoreRow[];
    return rows?.[0] ?? null;
  } catch {
    return null;
  }
}

function buildHtml(slug: string, storeName: string, image: string): string {
  const url = storeUrl(slug);
  const title = `Amada Amante — ${storeName}`;
  const t = escapeHtml(title);
  const d = escapeHtml(OG_DESCRIPTION);
  const u = escapeHtml(url);
  const img = escapeHtml(image);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${t}</title>
<link rel="canonical" href="${u}" />
<meta name="description" content="${d}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Amada Amante" />
<meta property="og:title" content="${t}" />
<meta property="og:description" content="${d}" />
<meta property="og:url" content="${u}" />
<meta property="og:image" content="${img}" />
<meta property="og:image:secure_url" content="${img}" />
<meta property="og:image:type" content="image/jpeg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:locale" content="pt_BR" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${t}" />
<meta name="twitter:description" content="${d}" />
<meta name="twitter:image" content="${img}" />
<meta http-equiv="refresh" content="0;url=${u}" />
</head>
<body>
<main><h1>${t}</h1><p>${d}</p><p><a href="${u}">Abrir loja</a></p></main>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const fromPath = url.pathname.split("/").filter(Boolean).pop() ?? "";
  const slug = sanitizeSlug(url.searchParams.get("slug") ?? (fromPath === "og-loja" ? "" : fromPath));

  if (!slug) {
    return new Response("slug obrigatório", {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const ua = req.headers.get("user-agent");
  const bot = isSocialCrawler(ua);

  // Usuários reais vão direto para a loja.
  if (!bot && url.searchParams.get("debug") !== "1") {
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: storeUrl(slug), "Cache-Control": "no-store" },
    });
  }

  const store = await loadStore(slug);
  const storeName = String(store?.store_name || "").trim() || "Loja";
  const version = store?.updated_at ? Date.parse(store.updated_at) || "1" : "1";
  const theme = store?.theme ?? null;
  const candidate = isUsableOgImageUrl(theme?.logoUrl)
    ? theme?.logoUrl
    : isUsableOgImageUrl(theme?.bannerUrl)
      ? theme?.bannerUrl
      : null;
  const image = candidate ? String(candidate) : `${DEFAULT_OG_IMAGE}?v=${version}`;

  return new Response(buildHtml(slug, storeName, image), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
});
