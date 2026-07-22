import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
// mcpPlugin removido: regenerava supabase/functions/mcp com caminho absoluto Windows.
// A Edge Function em supabase/functions/mcp é mantida manualmente (imports Deno/npm).

const PWA_CACHE_VERSION = "amada-amante-v20260722c";

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
      registerType: "autoUpdate",
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
        navigateFallbackDenylist: [/^\/api\//, /^\/manifests\//, /^\/icons\//],
        globPatterns: ["**/*.{js,css,html,svg,woff,woff2}"],
        // Ícones/manifestos NÃO entram no precache estático agressivo (evita "LO" preso).
        globIgnores: ["**/icons/**", "**/manifests/**", "**/favicon.ico"],
        runtimeCaching: [
          {
            // Manifestos: sempre rede (nunca cache-first)
            urlPattern: ({ url }) => url.pathname.startsWith("/manifests/"),
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
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: `${PWA_CACHE_VERSION}-supabase`,
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 64,
                maxAgeSeconds: 60 * 60,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Demais imagens (não /icons/)
            urlPattern: ({ url }) =>
              /\.(?:png|jpg|jpeg|svg|gif|webp)$/i.test(url.pathname) &&
              !url.pathname.startsWith("/icons/"),
            handler: "CacheFirst",
            options: {
              cacheName: `${PWA_CACHE_VERSION}-images`,
              expiration: {
                maxEntries: 128,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
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
