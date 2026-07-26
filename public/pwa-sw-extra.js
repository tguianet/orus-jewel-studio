/* Extra SW handlers for Amada Amante multi-app PWA.
 * Loaded via workbox.importScripts — does not widen navigation scope
 * (manifest scope controls standalone window capture).
 */
const LOJA_MANIFEST_CACHE = "amada-pwa-loja-manifests-v1";
const LOJA_MANIFEST_RE = /^\/loja\/([^/]+)\/manifest\.webmanifest$/;

function defaultLojaManifest(slug) {
  const name = slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ") || "Amada Amante";
  const short =
    name.length <= 12 ? name : `${name.slice(0, 11).trimEnd()}…`;
  return {
    id: `/loja/${slug}`,
    name,
    short_name: short,
    description: `Loja virtual ${name}`,
    start_url: `/loja/${slug}`,
    scope: `/loja/${slug}/`,
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#C1186E",
    lang: "pt-BR",
    dir: "ltr",
    icons: [
      {
        src: "/icons/loja-192.png?v=20260726a",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/loja-512.png?v=20260726a",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/loja-maskable-512.png?v=20260726a",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const match = url.pathname.match(LOJA_MANIFEST_RE);
  if (!match) return;

  const slug = match[1];
  event.respondWith(
    (async () => {
      try {
        const cache = await caches.open(LOJA_MANIFEST_CACHE);
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const byPath = await cache.match(url.pathname);
        if (byPath) return byPath;
      } catch {
        /* ignore */
      }

      const body = JSON.stringify(defaultLojaManifest(slug));
      return new Response(body, {
        status: 200,
        headers: {
          "Content-Type": "application/manifest+json; charset=utf-8",
          "Cache-Control": "no-cache",
        },
      });
    })(),
  );
});
