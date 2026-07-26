import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { resolveManualChunk } from "./src/lib/manualChunks";
// mcpPlugin removido: regenerava supabase/functions/mcp com caminho absoluto Windows.
// A Edge Function em supabase/functions/mcp é mantida manualmente (imports Deno/npm).

/** Bump força cleanupOutdatedCaches após mudanças de estratégia. */
const PWA_CACHE_VERSION = "amada-amante-v20260726-pwa-scopes";

/** Middleware: /loja/:slug/manifest.webmanifest em dev/preview. */
function lojaManifestDevPlugin() {
  const handler = (
    req: { url?: string },
    res: { setHeader: (k: string, v: string) => void; end: (b: string) => void },
    next: () => void,
  ) => {
    const raw = req.url || "";
    const path = raw.split("?")[0] || "";
    const m = path.match(/^\/loja\/([^/]+)\/manifest\.webmanifest$/);
    if (!m) {
      next();
      return;
    }
    const slug = decodeURIComponent(m[1]);
    const name = slug
      .split(/[-_]+/)
      .filter(Boolean)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ") || "Amada Amante";
    const short = name.length <= 12 ? name : `${name.slice(0, 11).trimEnd()}…`;
    const body = JSON.stringify({
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
        { src: "/icons/loja-192.png?v=20260726a", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/loja-512.png?v=20260726a", sizes: "512x512", type: "image/png", purpose: "any" },
        {
          src: "/icons/loja-maskable-512.png?v=20260726a",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    });
    res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.end(body);
  };

  return {
    name: "loja-manifest-dev",
    configureServer(server: { middlewares: { use: (fn: typeof handler) => void } }) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server: { middlewares: { use: (fn: typeof handler) => void } }) {
      server.middlewares.use(handler);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  optimizeDeps: {
    include: ["lucide-react", "react", "react-dom", "react-router-dom"],
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    lojaManifestDevPlugin(),
    VitePWA({
      // Prompt controlado pelo AppUpdatePrompt (sem auto-reload no checkout).
      registerType: "prompt",
      injectRegister: false,
      // Manifestos 100% fora do plugin (Admin/Sacoleira/Loja separados).
      manifest: false,
      includeAssets: [
        "icons/*.png",
        "manifests/*.json",
        "pwa-sw-extra.js",
        "placeholder.svg",
        "robots.txt",
      ],
      workbox: {
        cacheId: PWA_CACHE_VERSION,
        // SW unico no root: ok para assets; captura de janela vem do manifest.scope.
        importScripts: ["pwa-sw-extra.js"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/manifests\//,
          /^\/icons\//,
          /^\/loja\/[^/]+\/manifest\.webmanifest$/,
          /^\/pwa-sw-extra\.js$/,
          /\/rest\/v1\//,
          /\/auth\/v1\//,
          /\/functions\/v1\//,
        ],
        // Precache só de estáticos versionados + shell.
        globPatterns: ["**/*.{js,css,html,svg,woff,woff2}"],
        // Ícones/manifestos NÃO entram no precache estático agressivo.
        globIgnores: [
          "**/icons/**",
          "**/manifests/**",
          "**/favicon.ico",
          "**/pwa-sw-extra.js",
        ],
        runtimeCaching: [
          {
            // HTML / navegação: rede primeiro (timeout curto) para não prender chunks antigos.
            // Cache pequeno — shell SPA compartilhado; dados de loja/admin nunca aqui.
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: `${PWA_CACHE_VERSION}-html`,
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 8,
                maxAgeSeconds: 60 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Manifestos estaticos + dinamicos: sempre rede (SW extra responde loja)
            urlPattern: ({ url }) =>
              url.pathname.startsWith("/manifests/")
              || /\/loja\/[^/]+\/manifest\.webmanifest$/i.test(url.pathname),
            handler: "NetworkOnly",
          },
          {
            // Auth / REST / RPC / Functions / Realtime / GraphQL — nunca cachear dados.
            urlPattern: ({ url }) =>
              (/\.supabase\.co$/i.test(url.hostname)
                || /\.lovable\.(app|dev)$/i.test(url.hostname)
                || /lovableproject\.com$/i.test(url.hostname))
              && (/\/rest\/v1\//i.test(url.pathname)
                || /\/auth\/v1\//i.test(url.pathname)
                || /\/functions\/v1\//i.test(url.pathname)
                || /\/realtime\//i.test(url.pathname)
                || /\/graphql\/v1/i.test(url.pathname)
                || /\/rpc\//i.test(url.pathname)),
            handler: "NetworkOnly",
          },
          {
            // Storage privado / assinado — nunca cachear
            urlPattern: ({ url }) =>
              /\.supabase\.co$/i.test(url.hostname)
              && (/\/storage\/v1\/object\/authenticated\//i.test(url.pathname)
                || /\/storage\/v1\/object\/sign\//i.test(url.pathname)),
            handler: "NetworkOnly",
          },
          {
            // Imagens públicas do storage — cache limitado
            urlPattern: ({ url }) =>
              /\.supabase\.co$/i.test(url.hostname)
              && /\/storage\/v1\/object\/public\//i.test(url.pathname)
              && /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i.test(url.pathname),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: `${PWA_CACHE_VERSION}-public-images`,
              expiration: {
                maxEntries: 96,
                maxAgeSeconds: 60 * 60 * 24 * 14,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Qualquer outro endpoint Supabase / Lovable Cloud — NetworkOnly (sem cache de API)
            urlPattern: ({ url }) =>
              /\.supabase\.co$/i.test(url.hostname)
              || /\.lovable\.(app|dev)$/i.test(url.hostname)
              || /lovableproject\.com$/i.test(url.hostname),
            handler: "NetworkOnly",
          },
          {
            // Ícones PWA: rede primeiro + cache versionado
            urlPattern: ({ url }) => url.pathname.startsWith("/icons/"),
            handler: "NetworkFirst",
            options: {
              cacheName: `${PWA_CACHE_VERSION}-icons`,
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 32,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Assets JS/CSS versionados (hash no nome) — CacheFirst
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin
              && /\/assets\/.+\.(?:js|css)$/i.test(url.pathname),
            handler: "CacheFirst",
            options: {
              cacheName: `${PWA_CACHE_VERSION}-assets`,
              expiration: {
                maxEntries: 64,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Demais imagens públicas same-origin (não /icons/, não API)
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin
              && /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i.test(url.pathname)
              && !url.pathname.startsWith("/icons/"),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: `${PWA_CACHE_VERSION}-images`,
              expiration: {
                maxEntries: 128,
                maxAgeSeconds: 60 * 60 * 24 * 14,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        // skipWaiting desligado: ativação só via updateSW(true) no prompt.
        skipWaiting: false,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ].filter(Boolean),
  build: {
    rollupOptions: {
      output: {
        manualChunks: resolveManualChunk,
      },
    },
    chunkSizeWarningLimit: 600,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
}));
