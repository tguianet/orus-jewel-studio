import { registerSW } from "virtual:pwa-register";

/**
 * Registra o service worker com atualização automática.
 * skipWaiting + clientsClaim (vite.config) + reload quando há nova versão.
 */
export function registerPwa() {
  if (typeof window === "undefined") return;

  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      // Verifica atualizações periodicamente (a cada 30 min)
      setInterval(() => {
        void registration.update();
      }, 30 * 60 * 1000);

      // Checagem imediata ao focar a aba
      window.addEventListener("focus", () => {
        void registration.update();
      });
    },
    onNeedRefresh() {
      void updateSW(true);
    },
    onOfflineReady() {
      // App pronto para uso offline nas rotas em cache.
    },
  });
}
