import { describe, expect, it } from "vitest";
import {
  detectInstallPlatform,
  installButtonLabel,
  manualInstallSteps,
  needsManualInstructions,
  PWA_INSTALL_LABELS,
  resolveInstallArea,
  shouldShowInstallButton,
  isStandalone,
} from "@/lib/pwaInstall";
import { isCriticalOperationPath, shouldConfirmBeforeUpdate } from "@/lib/pwaUpdate";

const base = {
  standalone: false,
  installed: false,
  canPrompt: true,
  platform: "android-chromium" as const,
};

describe("PWA install — área e rótulo", () => {
  it("resolve área por rota", () => {
    expect(resolveInstallArea("/admin/pedidos")).toBe("admin");
    expect(resolveInstallArea("/sacoleira/loja")).toBe("sacoleira");
    expect(resolveInstallArea("/loja/loja-tiago")).toBe("loja");
  });

  it("não instala em /escolher-area nem rotas genéricas", () => {
    expect(resolveInstallArea("/escolher-area")).toBeNull();
    expect(resolveInstallArea("/")).toBeNull();
    expect(installButtonLabel("/escolher-area")).toBeNull();
  });

  it("usa rótulo por área", () => {
    expect(installButtonLabel("/admin")).toBe(PWA_INSTALL_LABELS.admin);
    expect(installButtonLabel("/sacoleira")).toBe("Instalar Área da Sacoleira");
    expect(installButtonLabel("/loja/x")).toBe("Instalar esta loja");
  });
});

describe("PWA install — plataformas", () => {
  it("detecta iOS (inclusive iPad desktop-mode)", () => {
    expect(detectInstallPlatform("iPhone; CPU iPhone OS 17_0 like Mac OS X")).toBe("ios-safari");
    expect(detectInstallPlatform("Macintosh; Intel Mac OS X", 5)).toBe("ios-safari");
  });

  it("detecta Android e desktop", () => {
    expect(detectInstallPlatform("Linux; Android 14; Chrome/120")).toBe("android-chromium");
    expect(detectInstallPlatform("Windows NT 10.0; Chrome/120")).toBe("desktop");
  });

  it("iOS exige instrução manual", () => {
    expect(needsManualInstructions("ios-safari")).toBe(true);
    expect(needsManualInstructions("android-chromium")).toBe(false);
    expect(manualInstallSteps("ios-safari").steps.join(" ")).toContain("Tela de Início");
  });
});

describe("PWA install — visibilidade do botão", () => {
  it("mostra quando há prompt disponível", () => {
    expect(shouldShowInstallButton({ ...base, pathname: "/admin" })).toBe(true);
  });

  it("esconde quando já instalado ou standalone", () => {
    expect(shouldShowInstallButton({ ...base, pathname: "/admin", installed: true })).toBe(false);
    expect(shouldShowInstallButton({ ...base, pathname: "/admin", standalone: true })).toBe(false);
  });

  it("mostra no iOS mesmo sem beforeinstallprompt", () => {
    expect(
      shouldShowInstallButton({
        ...base,
        pathname: "/loja/x",
        canPrompt: false,
        platform: "ios-safari",
      }),
    ).toBe(true);
  });

  it("esconde em /escolher-area", () => {
    expect(shouldShowInstallButton({ ...base, pathname: "/escolher-area" })).toBe(false);
  });
});

describe("standalone", () => {
  it("detecta navigator.standalone", () => {
    const win = {
      navigator: { standalone: true },
      matchMedia: () => ({ matches: false }),
    } as unknown as Window;
    expect(isStandalone(win)).toBe(true);
  });

  it("detecta display-mode standalone", () => {
    const win = {
      navigator: {},
      matchMedia: (q: string) => ({ matches: q.includes("standalone") }),
    } as unknown as Window;
    expect(isStandalone(win)).toBe(true);
  });

  it("false em navegador comum", () => {
    const win = {
      navigator: {},
      matchMedia: () => ({ matches: false }),
    } as unknown as Window;
    expect(isStandalone(win)).toBe(false);
  });
});

describe("PWA update — operações críticas", () => {
  it("identifica rotas críticas", () => {
    expect(isCriticalOperationPath("/loja/x/checkout")).toBe(true);
    expect(isCriticalOperationPath("/sacoleira/saques")).toBe(true);
    expect(isCriticalOperationPath("/admin/devolucoes")).toBe(true);
    expect(isCriticalOperationPath("/admin/pedidos")).toBe(false);
  });

  it("exige confirmação apenas com formulário preenchido", () => {
    expect(shouldConfirmBeforeUpdate({ pathname: "/sacoleira/saques", hasFilledForm: true })).toBe(true);
    expect(shouldConfirmBeforeUpdate({ pathname: "/sacoleira/saques", hasFilledForm: false })).toBe(false);
    expect(shouldConfirmBeforeUpdate({ pathname: "/admin", hasFilledForm: true })).toBe(false);
  });
});
