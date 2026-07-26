import { registerSW } from "virtual:pwa-register";
import {
  bindControllerChangeReload,
  bindPwaUpdater,
  notifyNeedRefresh,
  releaseReloadGuardOnBoot,
  tryAutoApplyUpdate,
} from "@/lib/pwaUpdate";

const UPDATE_CHECK_MS = 5 * 60 * 1000;

/**
 * Registro central do Service Worker — autoUpdate.
 * - Verifica ao abrir (immediate) e a cada 5 minutos
 * - Ativa automaticamente; reload 1x com gate de operação crítica
 * - Sem remoção do service worker; não limpa login/carrinho
 */
export function registerPwa() {
  if (typeof window === "undefined") return;

  releaseReloadGuardOnBoot();
  bindControllerChangeReload();

  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      const check = () => {
        void registration.update();
      };

      setInterval(check, UPDATE_CHECK_MS);

      window.addEventListener("focus", check);
      window.addEventListener("online", check);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") check();
      });
    },
    onNeedRefresh() {
      notifyNeedRefresh();
      void tryAutoApplyUpdate();
    },
    onOfflineReady() {
      // Shell estático pronto; APIs/auth/RPC nunca vêm do cache.
    },
  });

  bindPwaUpdater(updateSW);
}
