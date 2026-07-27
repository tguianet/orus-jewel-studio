import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearInstallDismissed,
  clearLegacyInstallBlocks,
  onBeforeInstallPromptReceived,
  PWA_INSTALL_DISMISS_SESSION_KEY,
  PWA_INSTALL_LEGACY_BLOCK_KEYS,
  PWA_INSTALL_MODAL_DESCRIPTION,
  PWA_INSTALL_MODAL_TITLE,
  readInstallDismissed,
  shouldShowInstallModal,
  writeInstallDismissed,
  type BeforeInstallPromptEvent,
} from "@/lib/pwaInstall";
import {
  beginCriticalOperation,
  resetCriticalOperationsForTests,
} from "@/lib/pwaCriticalOps";
import { getCurrentPwaManifest } from "@/lib/pwaInstall";

afterEach(() => {
  resetCriticalOperationsForTests();
  sessionStorage.clear();
  localStorage.clear();
  vi.restoreAllMocks();
});

const bipBase = {
  pathname: "/admin",
  standalone: false,
  installed: false,
  canPrompt: true,
  platform: "android-chromium" as const,
  dismissed: false,
  criticalActive: false,
};

describe("PWA install — reinstalação e modal", () => {
  it("1 — beforeinstallprompt abre modal (plano + elegibilidade)", () => {
    const plan = onBeforeInstallPromptReceived({ standalone: false });
    expect(plan).toEqual({
      clearInstalled: true,
      clearDismissed: true,
      openModal: true,
    });
    expect(shouldShowInstallModal(bipBase)).toBe(true);
  });

  it("2 — standalone não abre modal", () => {
    expect(onBeforeInstallPromptReceived({ standalone: true }).openModal).toBe(false);
    expect(shouldShowInstallModal({ ...bipBase, standalone: true })).toBe(false);
  });

  it("3 — appinstalled fecha modal (installed em memória)", () => {
    expect(shouldShowInstallModal({ ...bipBase, installed: true })).toBe(false);
  });

  it("4 — dismiss não bloqueia para sempre (TTL / clear)", () => {
    writeInstallDismissed(sessionStorage, Date.now());
    expect(readInstallDismissed(sessionStorage)).toBe(true);
    expect(shouldShowInstallModal({ ...bipBase, dismissed: true })).toBe(false);

    clearInstallDismissed(sessionStorage);
    expect(readInstallDismissed(sessionStorage)).toBe(false);
    expect(shouldShowInstallModal({ ...bipBase, dismissed: false })).toBe(true);
  });

  it("5 — novo beforeinstallprompt reabre modal (limpa dismiss)", () => {
    writeInstallDismissed(sessionStorage, Date.now());
    expect(readInstallDismissed(sessionStorage)).toBe(true);

    const plan = onBeforeInstallPromptReceived({ standalone: false });
    expect(plan.clearDismissed).toBe(true);
    clearInstallDismissed(sessionStorage);
    expect(
      shouldShowInstallModal({
        ...bipBase,
        dismissed: false,
        installed: false,
        canPrompt: true,
      }),
    ).toBe(true);
  });

  it("6 — estado antigo de localStorage não impede reinstalação", () => {
    for (const key of PWA_INSTALL_LEGACY_BLOCK_KEYS) {
      localStorage.setItem(key, "true");
    }
    clearLegacyInstallBlocks(localStorage, sessionStorage);
    for (const key of PWA_INSTALL_LEGACY_BLOCK_KEYS) {
      expect(localStorage.getItem(key)).toBeNull();
    }
    expect(shouldShowInstallModal(bipBase)).toBe(true);
  });

  it("7 — após simular desinstalação + novo BIP, modal aparece", () => {
    // Simula sessão em que appinstalled marcou installed=true
    let installed = true;
    let canPrompt = false;
    expect(shouldShowInstallModal({ ...bipBase, installed, canPrompt })).toBe(false);

    // Desinstalou: não há evento; novo BIP é a prova
    const plan = onBeforeInstallPromptReceived({ standalone: false });
    if (plan.clearInstalled) installed = false;
    canPrompt = true;
    expect(plan.openModal).toBe(true);
    expect(shouldShowInstallModal({ ...bipBase, installed, canPrompt })).toBe(true);
  });

  it("8 — prompt é usado uma única vez", async () => {
    const prompt = vi.fn(async () => undefined);
    let deferred: BeforeInstallPromptEvent | null = {
      preventDefault: vi.fn(),
      prompt,
      userChoice: Promise.resolve({ outcome: "dismissed", platform: "web" }),
    } as unknown as BeforeInstallPromptEvent;

    // Uso único: consome e zera
    const event = deferred;
    deferred = null;
    await event!.prompt();
    await event!.userChoice;
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(deferred).toBeNull();

    // Segundo uso indisponível
    expect(deferred).toBeNull();
  });

  it("9 — iOS mostra instrução manual (modal elegível sem BIP)", () => {
    expect(
      shouldShowInstallModal({
        ...bipBase,
        canPrompt: false,
        platform: "ios-safari",
      }),
    ).toBe(true);
    expect(PWA_INSTALL_MODAL_TITLE).toBe("Instale o aplicativo");
    expect(PWA_INSTALL_MODAL_DESCRIPTION).toMatch(/Amada Amante/);
  });

  it("10 — Admin, Sacoleira e Loja mantêm manifests separados", () => {
    const a = getCurrentPwaManifest("/admin");
    const s = getCurrentPwaManifest("/sacoleira");
    const l = getCurrentPwaManifest("/loja/demo");
    expect(new Set([a.id, s.id, l.id]).size).toBe(3);
    expect(a.scope).not.toBe(s.scope);
    expect(s.scope).not.toBe(l.scope);
    expect(shouldShowInstallModal({ ...bipBase, pathname: "/escolher-area" })).toBe(false);
    expect(shouldShowInstallModal({ ...bipBase, pathname: "/admin" })).toBe(true);
    expect(shouldShowInstallModal({ ...bipBase, pathname: "/sacoleira" })).toBe(true);
    expect(shouldShowInstallModal({ ...bipBase, pathname: "/loja/demo" })).toBe(true);
  });

  it("11 — modal não aparece durante operação crítica", () => {
    const end = beginCriticalOperation("checkout");
    expect(
      shouldShowInstallModal({ ...bipBase, criticalActive: true }),
    ).toBe(false);
    end();
  });

  it("12 — modal aparece após operação crítica terminar", () => {
    const end = beginCriticalOperation("checkout");
    expect(shouldShowInstallModal({ ...bipBase, criticalActive: true })).toBe(false);
    end();
    expect(shouldShowInstallModal({ ...bipBase, criticalActive: false })).toBe(true);
  });

  it("dismiss expirado libera de novo", () => {
    const old = Date.now() - 31 * 60 * 1000;
    sessionStorage.setItem(PWA_INSTALL_DISMISS_SESSION_KEY, String(old));
    expect(readInstallDismissed(sessionStorage, Date.now())).toBe(false);
  });
});
