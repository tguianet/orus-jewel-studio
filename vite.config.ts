import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
// mcpPlugin removido: regenerava supabase/functions/mcp com caminho absoluto Windows.
// A Edge Function em supabase/functions/mcp é mantida manualmente (imports Deno/npm).

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
      // Atualiza o SW automaticamente sem travar o usuário em versão antiga
      registerType: "autoUpdate",
      // Registro manual via virtual:pwa-register (evita double-register)
      injectRegister: false,
      // Manifestos gerenciados em runtime (3 apps no mesmo domínio)
      manifest: false,
      includeAssets: [
        "icons/*.png",
        "manifests/*.json",
        "placeholder.svg",
        "robots.txt",
      ],
      workbox: {
        // SPA: qualquer navegação cai no index.html (rotas internas após F5)
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/manifests\//, /^\/icons\//],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2,webmanifest,json}"],
        // Não cacheia agressivamente a API do Supabase
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api",
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
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "orus-images",
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
