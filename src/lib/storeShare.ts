/** Domínio oficial público — nunca URL de preview Lovable. */
export const OFFICIAL_APP_ORIGIN = "https://amadaamante.app";

export const DEFAULT_STORE_OG_IMAGE_PATH = "/og/amada-amante-store.jpg";

export const STORE_SHARE_INTRO = "✨ Separei joias incríveis para você!";
export const STORE_SHARE_BODY =
  "Conheça minha loja Amada Amante e escolha suas favoritas:";

export const STORE_OG_DESCRIPTION =
  "Conheça minha loja Amada Amante e escolha suas joias favoritas.";

const SOCIAL_BOT_RE =
  /whatsapp|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|pinterest|skypeuripreview|googlebot|bingbot|embedly|quora link preview|showyoubot|outbrain|vkshare|w3c_validator|redditbot|applebot|baiduspider|yandex/i;

export function isSocialCrawler(userAgent: string | null | undefined): boolean {
  return SOCIAL_BOT_RE.test(String(userAgent ?? ""));
}

export function officialStoreUrl(slug: string): string {
  const clean = String(slug || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
  return `${OFFICIAL_APP_ORIGIN}/loja/${encodeURIComponent(clean).replace(/%2F/gi, "")}`;
}

/** Mensagem exata do WhatsApp (URL na última linha). */
export function buildStoreWhatsAppMessage(slug: string): string {
  const url = officialStoreUrl(slug);
  return `${STORE_SHARE_INTRO}\n\n${STORE_SHARE_BODY}\n\n${url}`;
}

export function buildWhatsAppShareHref(slug: string): string {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(buildStoreWhatsAppMessage(slug))}`;
}

export function storeOgTitle(storeName: string): string {
  const name = String(storeName || "").trim() || "Loja";
  return `Amada Amante — ${name}`;
}

export function isUsableOgImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const u = String(url).trim();
  if (!/^https:\/\//i.test(u)) return false;
  if (/\.svg(\?|#|$)/i.test(u)) return false;
  if (/lovable\.app|lovableproject\.com|lovable\.dev/i.test(u)) return false;
  return true;
}

export function defaultStoreOgImageUrl(origin = OFFICIAL_APP_ORIGIN, version?: string | number | null): string {
  const base = `${origin.replace(/\/$/, "")}${DEFAULT_STORE_OG_IMAGE_PATH}`;
  if (version == null || version === "") return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}v=${encodeURIComponent(String(version))}`;
}

export function resolveStoreOgImageUrl(opts: {
  logoUrl?: string | null;
  bannerUrl?: string | null;
  origin?: string;
  version?: string | number | null;
}): string {
  const origin = opts.origin || OFFICIAL_APP_ORIGIN;
  if (isUsableOgImageUrl(opts.logoUrl)) {
    const u = String(opts.logoUrl);
    if (opts.version != null && opts.version !== "" && !/[?&]v=/.test(u)) {
      return `${u}${u.includes("?") ? "&" : "?"}v=${encodeURIComponent(String(opts.version))}`;
    }
    return u;
  }
  if (isUsableOgImageUrl(opts.bannerUrl)) {
    const u = String(opts.bannerUrl);
    if (opts.version != null && opts.version !== "" && !/[?&]v=/.test(u)) {
      return `${u}${u.includes("?") ? "&" : "?"}v=${encodeURIComponent(String(opts.version))}`;
    }
    return u;
  }
  return defaultStoreOgImageUrl(origin, opts.version ?? "1");
}

export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type StoreOgPayload = {
  slug: string;
  storeName: string;
  imageUrl: string;
  description?: string;
};

/** HTML mínimo com tags OG — para crawlers que não executam JS. */
export function buildStoreOgHtml(payload: StoreOgPayload): string {
  const url = officialStoreUrl(payload.slug);
  const title = storeOgTitle(payload.storeName);
  const description = payload.description || STORE_OG_DESCRIPTION;
  const image = payload.imageUrl;
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const u = escapeHtml(url);
  const img = escapeHtml(image);
  const name = escapeHtml(payload.storeName || "Loja");

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
  <main>
    <h1>${t}</h1>
    <p>${d}</p>
    <p><a href="${u}">Abrir loja ${name}</a></p>
  </main>
</body>
</html>`;
}

export function extractLojaSlugFromPath(pathname: string): string | null {
  const m = String(pathname || "").match(/^\/loja\/([^/]+)\/?/);
  const slug = m?.[1] ? decodeURIComponent(m[1]) : null;
  if (!slug || slug === "manifest.webmanifest") return null;
  return slug;
}
