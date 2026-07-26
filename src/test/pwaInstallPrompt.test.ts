import { describe, expect, it, vi } from "vitest";
import {
  isInstallPromptAvailable,
  shouldShowInstallCta,
  type BeforeInstallPromptEventLike,
} from "@/lib/pwaInstall";

describe("pwaInstallPrompt", () => {
  it("A — beforeinstallprompt é capturado (preventDefault + store)", () => {
    const prompt = vi.fn(async () => undefined);
    const event = {
      preventDefault: vi.fn(),
      prompt,
      userChoice: Promise.resolve({ outcome: "accepted" as const, platform: "web" }),
    };
    event.preventDefault();
    let deferred: BeforeInstallPromptEventLike | null = event as unknown as BeforeInstallPromptEventLike;
    expect(event.preventDefault).toHaveBeenCalled();
    expect(isInstallPromptAvailable(deferred)).toBe(true);

    // D — prompt só após clique (não no load)
    expect(prompt).not.toHaveBeenCalled();
    void deferred.prompt();
    expect(prompt).toHaveBeenCalledTimes(1);

    // E — limpa depois do uso
    deferred = null;
    expect(isInstallPromptAvailable(deferred)).toBe(false);
  });

  it("B — botão aparece quando instalável", () => {
    expect(
      shouldShowInstallCta({
        area: "sacoleira",
        standalone: false,
        promptAvailable: true,
        manifestLoaded: true,
        installed: false,
      }),
    ).toBe(true);
  });

  it("F — appinstalled esconde o botão", () => {
    expect(
      shouldShowInstallCta({
        area: "admin",
        standalone: false,
        promptAvailable: true,
        manifestLoaded: true,
        installed: true,
      }),
    ).toBe(false);
  });

  it("não promete instalação sem evento", () => {
    expect(isInstallPromptAvailable(null)).toBe(false);
    expect(
      shouldShowInstallCta({
        area: "loja",
        standalone: false,
        promptAvailable: false,
        manifestLoaded: true,
        installed: false,
      }),
    ).toBe(false);
  });
});
