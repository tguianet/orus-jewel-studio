import {
  extractLojaSlug,
  getPwaManifestConfig,
  resolvePwaKind,
  type PwaAppKind,
  type PwaManifestConfig,
} from "@/pwa/manifestConfig";

export type InstallPlatform = "android-chromium" | "ios-safari" | "desktop" | "unsupported";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

/** Áreas instaláveis. `/escolher-area` e rotas genéricas não são instaláveis. */
export type InstallableArea = Exclude<PwaAppKind, "default">;

export const PWA_INSTALL_LABELS: Record<InstallableArea, string> = {
  admin: "Instalar Admin",
  sacoleira: "Instalar Área da Sacoleira",
  loja: "Instalar esta loja",
};

export function resolveInstallArea(pathname: string): InstallableArea | null {
  if (pathname === "/escolher-area" || pathname.startsWith("/escolher-area/")) return null;
  const kind = resolvePwaKind(pathname);
  return kind === "default" ? null : kind;
}

export function installButtonLabel(pathname: string): string | null {
  const area = resolveInstallArea(pathname);
  return area ? PWA_INSTALL_LABELS[area] : null;
}

export function isStandalone(win: Window = window): boolean {
  const nav = win.navigator as Navigator & { standalone?: boolean };
  if (nav?.standalone === true) return true;
  try {
    return win.matchMedia?.("(display-mode: standalone)")?.matches === true
      || win.matchMedia?.("(display-mode: fullscreen)")?.matches === true
      || win.matchMedia?.("(display-mode: minimal-ui)")?.matches === true;
  } catch {
    return false;
  }
}

export function detectInstallPlatform(ua: string, maxTouchPoints = 0): InstallPlatform {
  const s = String(ua || "");
  const isIOS = /iphone|ipad|ipod/i.test(s)
    || (/macintosh/i.test(s) && maxTouchPoints > 1);
  if (isIOS) return "ios-safari";
  if (/android/i.test(s)) return "android-chromium";
  if (/chrome|chromium|edg\//i.test(s)) return "desktop";
  return "unsupported";
}

/** iOS não expõe beforeinstallprompt: precisa de instrução manual. */
export function needsManualInstructions(platform: InstallPlatform): boolean {
  return platform === "ios-safari" || platform === "unsupported";
}

export function shouldShowInstallButton(opts: {
  pathname: string;
  standalone: boolean;
  installed: boolean;
  canPrompt: boolean;
  platform: InstallPlatform;
}): boolean {
  if (!resolveInstallArea(opts.pathname)) return false;
  if (opts.standalone || opts.installed) return false;
  if (opts.canPrompt) return true;
  return needsManualInstructions(opts.platform);
}

export type ManualInstallSteps = { title: string; steps: string[] };

export function manualInstallSteps(
  platform: InstallPlatform,
  label = "o app",
): ManualInstallSteps {
  if (platform === "ios-safari") {
    return {
      title: `Instalar ${label} no iPhone/iPad`,
      steps: [
        "Abra esta página no navegador Safari.",
        "Toque no botão Compartilhar (quadrado com seta para cima).",
        'Role a lista e toque em "Adicionar à Tela de Início".',
        'Confirme tocando em "Adicionar".',
      ],
    };
  }
  return {
    title: `Instalar ${label}`,
    steps: [
      "Abra o menu do navegador (⋮ ou ⋯).",
      'Escolha "Instalar aplicativo" ou "Adicionar à tela inicial".',
      "Confirme a instalação.",
    ],
  };
}

// --- Compat helpers (instalação + manifesto + testes legados) ---

export type PwaInstallArea = InstallableArea;
export type BeforeInstallPromptEventLike = BeforeInstallPromptEvent;

export function getAppVersion(): string {
  const fromEnv = (import.meta.env.VITE_APP_VERSION as string | undefined)?.trim();
  return fromEnv || "20260726a";
}

export function isStandaloneMode(
  win: Window & { navigator: Navigator & { standalone?: boolean } } = window as Window & {
    navigator: Navigator & { standalone?: boolean };
  },
): boolean {
  return isStandalone(win);
}

export function isIosDevice(ua = typeof navigator !== "undefined" ? navigator.userAgent : ""): boolean {
  const maxTouchPoints =
    typeof navigator !== "undefined" ? (navigator.maxTouchPoints ?? 0) : 0;
  const platform = detectInstallPlatform(ua, maxTouchPoints);
  return platform === "ios-safari";
}

export function isAndroidDevice(ua = typeof navigator !== "undefined" ? navigator.userAgent : ""): boolean {
  return /android/i.test(ua);
}

export function isInstallPromptAvailable(deferred: BeforeInstallPromptEventLike | null): boolean {
  return Boolean(deferred && typeof deferred.prompt === "function");
}

export function getCurrentPwaArea(pathname = typeof window !== "undefined" ? window.location.pathname : "/"): PwaAppKind {
  return resolvePwaKind(pathname);
}

export function getCurrentPwaManifest(
  pathname = typeof window !== "undefined" ? window.location.pathname : "/",
): PwaManifestConfig {
  return getPwaManifestConfig(pathname);
}

/** Manifesto instalável presente no documento (área admin/sacoleira/loja). */
export function isPwaManifestLoaded(doc: Document = document): boolean {
  const link = doc.getElementById("pwa-manifest") as HTMLLinkElement | null;
  if (!link?.href) return false;
  return getCurrentPwaArea() !== "default";
}

export function getInstallButtonLabel(area: PwaAppKind): string {
  if (area === "admin" || area === "sacoleira" || area === "loja") {
    return PWA_INSTALL_LABELS[area];
  }
  return "Instalar app";
}

export function getInstallFallbackMessage(opts: {
  standalone: boolean;
  ios: boolean;
  android: boolean;
  promptAvailable: boolean;
}): string | null {
  if (opts.standalone) return null;
  if (opts.promptAvailable) return null;
  if (opts.ios) {
    return "Abra no Safari, toque em Compartilhar e depois em Adicionar à Tela de Início.";
  }
  if (opts.android) {
    return "Abra o menu do navegador e escolha Instalar app ou Adicionar à tela inicial.";
  }
  return "Abra o menu do navegador e escolha Instalar app ou Adicionar à tela inicial.";
}

export function shouldShowInstallCta(opts: {
  area: PwaAppKind;
  standalone: boolean;
  promptAvailable: boolean;
  manifestLoaded: boolean;
  installed: boolean;
}): boolean {
  if (opts.installed || opts.standalone) return false;
  if (opts.area === "default") return false;
  if (!opts.manifestLoaded) return false;
  return opts.promptAvailable;
}

export function shouldShowInstallInstructions(opts: {
  area: PwaAppKind;
  standalone: boolean;
  promptAvailable: boolean;
  manifestLoaded: boolean;
  installed: boolean;
}): boolean {
  if (opts.installed || opts.standalone) return false;
  if (opts.area === "default") return false;
  if (!opts.manifestLoaded) return false;
  return !opts.promptAvailable;
}

export function extractInstallAreaSlug(pathname: string): string | null {
  return extractLojaSlug(pathname);
}

export const PWA_MANIFEST_APPLIED_EVENT = "amada-pwa-manifest-applied";
