import { describe, expect, it } from "vitest";
import {
  getCurrentPwaArea,
  getInstallButtonLabel,
  getInstallFallbackMessage,
  isAndroidDevice,
  isIosDevice,
  isStandaloneMode,
  shouldShowInstallCta,
  shouldShowInstallInstructions,
} from "@/lib/pwaInstall";

describe("pwaStandaloneDetection", () => {
  it("C — botão não aparece em standalone", () => {
    expect(
      shouldShowInstallCta({
        area: "admin",
        standalone: true,
        promptAvailable: true,
        manifestLoaded: true,
        installed: false,
      }),
    ).toBe(false);
  });

  it("detecta standalone via matchMedia", () => {
    const win = {
      matchMedia: (q: string) => ({
        matches: q.includes("standalone"),
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }),
      navigator: {},
    } as unknown as Window & { navigator: Navigator & { standalone?: boolean } };
    expect(isStandaloneMode(win)).toBe(true);
  });

  it("J — iOS mostra instrução manual", () => {
    expect(isIosDevice("iPhone; CPU iPhone OS 17")).toBe(true);
    expect(isAndroidDevice("Android 14")).toBe(true);
    const msg = getInstallFallbackMessage({
      standalone: false,
      ios: true,
      android: false,
      promptAvailable: false,
    });
    expect(msg).toMatch(/Safari/i);
    expect(msg).toMatch(/Adicionar à Tela de Início/i);
  });

  it("Android fallback", () => {
    const msg = getInstallFallbackMessage({
      standalone: false,
      ios: false,
      android: true,
      promptAvailable: false,
    });
    expect(msg).toMatch(/Instalar app|tela inicial/i);
  });

  it("não mostra instruções em standalone", () => {
    expect(
      getInstallFallbackMessage({
        standalone: true,
        ios: true,
        android: false,
        promptAvailable: false,
      }),
    ).toBeNull();
    expect(
      shouldShowInstallInstructions({
        area: "loja",
        standalone: true,
        promptAvailable: false,
        manifestLoaded: true,
        installed: false,
      }),
    ).toBe(false);
  });

  it("áreas e labels", () => {
    expect(getCurrentPwaArea("/admin/pedidos")).toBe("admin");
    expect(getCurrentPwaArea("/sacoleira/loja")).toBe("sacoleira");
    expect(getCurrentPwaArea("/loja/jessica")).toBe("loja");
    expect(getInstallButtonLabel("admin")).toBe("Instalar Admin");
    expect(getInstallButtonLabel("sacoleira")).toBe("Instalar Área da Sacoleira");
    expect(getInstallButtonLabel("loja")).toBe("Instalar esta loja");
  });
});
