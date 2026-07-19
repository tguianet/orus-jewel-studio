import { registerSW } from "virtual:pwa-register";

/**
 * Registra o service worker com atualização automática.
 * Quando houver nova versão, o SW assume imediatamente (skipWaiting + clientsClaim)
 * e a página recarrega para não ficar presa em cache antigo.
 */
export function registerPwa() {
  if (typeof window === "undefined") return;

  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      // Verifica atualizações periodicamente (a cada 60 min)
      setInterval(() => {
        void registration.update();
      }, 60 * 60 * 1000);
    },
    onNeedRefresh() {
      void updateSW(true);
    },
    onOfflineReady() {
      // App pronto para uso offline nas rotas em cache.
    },
  });
}
