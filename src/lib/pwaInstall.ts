import { resolvePwaKind, type PwaAppKind } from "@/pwa/manifestConfig";

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
