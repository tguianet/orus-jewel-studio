import { registerSW } from "virtual:pwa-register";
import {
  bindPwaUpdater,
  notifyNeedRefresh,
  releaseReloadGuardOnBoot,
} from "@/lib/pwaUpdate";

/**
 * Registro central do Service Worker.
 * Atualização é prompt-based (não auto-reload) via AppUpdatePrompt.
 */
export function registerPwa() {
  if (typeof window === "undefined") return;

  releaseReloadGuardOnBoot();

  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      // Verifica atualizações periodicamente (a cada 60 min)
      setInterval(() => {
        void registration.update();
      }, 60 * 60 * 1000);

      // Checagem ao focar a aba
      window.addEventListener("focus", () => {
        void registration.update();
      });

      // Checagem ao voltar online
      window.addEventListener("online", () => {
        void registration.update();
      });
    },
    onNeedRefresh() {
      notifyNeedRefresh();
    },
    onOfflineReady() {
      // Shell estático pronto; dados de API nunca vêm do cache.
    },
  });

  bindPwaUpdater(updateSW);
}
