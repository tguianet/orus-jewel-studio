import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
// mcpPlugin removido: regenerava supabase/functions/mcp com caminho absoluto Windows.
// A Edge Function em supabase/functions/mcp é mantida manualmente (imports Deno/npm).

/** Bump força cleanupOutdatedCaches após mudanças de estratégia. */
const PWA_CACHE_VERSION = "amada-amante-v20260726-pwa";

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
    VitePWA({
      // Prompt controlado pelo AppUpdatePrompt (sem auto-reload no checkout).
      registerType: "prompt",
      injectRegister: false,
      // Manifestos 100% em runtime (3 apps). Evita manifesto padrão do plugin.
      manifest: false,
      includeAssets: [
        "icons/*.png",
        "manifests/*.json",
        "placeholder.svg",
        "robots.txt",
      ],
      workbox: {
        cacheId: PWA_CACHE_VERSION,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/manifests\//,
          /^\/icons\//,
          /\/rest\/v1\//,
          /\/auth\/v1\//,
          /\/functions\/v1\//,
        ],
        // Precache só de estáticos versionados + shell.
        globPatterns: ["**/*.{js,css,html,svg,woff,woff2}"],
        // Ícones/manifestos NÃO entram no precache estático agressivo.
        globIgnores: ["**/icons/**", "**/manifests/**", "**/favicon.ico"],
        runtimeCaching: [
          {
            // HTML / navegação: rede primeiro (timeout curto) para não prender chunks antigos.
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: `${PWA_CACHE_VERSION}-html`,
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 16,
                maxAgeSeconds: 60 * 60 * 24,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Manifestos: sempre rede
            urlPattern: ({ url }) => url.pathname.startsWith("/manifests/"),
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
