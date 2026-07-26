import {
  extractLojaSlugFromPath,
  isSocialCrawler,
} from "./src/lib/storeShare";

/**
 * Intercepta crawlers (WhatsApp/Facebook/Twitter…) em /loja/:slug
 * e devolve HTML com Open Graph via /api/og-loja — sem depender de JS do SPA.
 */
export const config = {
  matcher: ["/loja/:slug", "/loja/:slug/:path*"],
};

export default async function middleware(request: Request): Promise<Response | undefined> {
  const ua = request.headers.get("user-agent");
  if (!isSocialCrawler(ua)) {
    return undefined;
  }

  const url = new URL(request.url);
  const slug = extractLojaSlugFromPath(url.pathname);
  if (!slug) return undefined;

  // Evita loop se o crawler pedir o endpoint da API.
  if (url.pathname.startsWith("/api/")) return undefined;

  const ogUrl = new URL("/api/og-loja", url.origin);
  ogUrl.searchParams.set("slug", slug);

  try {
    const upstream = await fetch(ogUrl.toString(), {
      headers: {
        Accept: "text/html",
        "User-Agent": ua || "AmadaAmante-OG-Middleware",
      },
    });
    const html = await upstream.text();
    return new Response(html, {
      status: upstream.ok ? 200 : 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control":
          upstream.headers.get("Cache-Control")
          || "public, max-age=300, s-maxage=300",
      },
    });
  } catch {
    // Em falha, deixa o SPA responder (preview pode degradar, mas a loja abre).
    return undefined;
  }
}
