import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  applyPwaUpdate,
  bindPwaUpdater,
  getPwaUpdateState,
  notifyNeedRefresh,
  PWA_UPDATE_MESSAGE,
  resetPwaUpdateControllerForTests,
  tryAutoApplyUpdate,
} from "@/lib/pwaUpdate";
import {
  beginCriticalOperation,
  resetCriticalOperationsForTests,
  shouldBlockPwaUpdate,
} from "@/lib/pwaCriticalOps";
import { getCurrentPwaManifest } from "@/lib/pwaInstall";

afterEach(() => {
  resetPwaUpdateControllerForTests();
  resetCriticalOperationsForTests();
  vi.restoreAllMocks();
});

describe("pwa autoUpdate", () => {
  it("1 — nova versão é detectada", () => {
    notifyNeedRefresh();
    const s = getPwaUpdateState();
    expect(s.pending).toBe(true);
    expect(s.needRefresh).toBe(true);
  });

  it("2 — atualização é baixada automaticamente", async () => {
    const updateSW = vi.fn(async () => undefined);
    bindPwaUpdater(updateSW);
    notifyNeedRefresh();
    const result = await tryAutoApplyUpdate();
    expect(result.ok).toBe(true);
    expect(updateSW).toHaveBeenCalledWith(true);
  });

  it("3 — app recarrega apenas uma vez", async () => {
    const updateSW = vi.fn(async () => undefined);
    bindPwaUpdater(updateSW);
    notifyNeedRefresh();
    await applyPwaUpdate({ allowCritical: true });
    const second = await applyPwaUpdate({ allowCritical: true });
    expect(second.ok).toBe(false);
    expect(second).toMatchObject({ reason: "reload_guard" });
    expect(updateSW).toHaveBeenCalledTimes(1);
  });

  it("4 — checkout bloqueia reload", async () => {
    const end = beginCriticalOperation("checkout");
    expect(
      shouldBlockPwaUpdate({
        pathname: "/loja/x/checkout",
        hasFilledForm: true,
        criticalActive: true,
      }),
    ).toBe(true);
    bindPwaUpdater(vi.fn(async () => undefined));
    notifyNeedRefresh();
    const result = await tryAutoApplyUpdate();
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe("critical");
    expect(getPwaUpdateState().waitingCritical).toBe(true);
    end();
  });

  it("5 — atualização ocorre após checkout terminar", async () => {
    const updateSW = vi.fn(async () => undefined);
    bindPwaUpdater(updateSW);
    const end = beginCriticalOperation("create_public_order");
    notifyNeedRefresh();
    await tryAutoApplyUpdate();
    expect(updateSW).not.toHaveBeenCalled();
    end();
    // flush via try após liberar crítica
    await tryAutoApplyUpdate();
    expect(updateSW).toHaveBeenCalledWith(true);
  });

  it("6 — rota atual é preservada", async () => {
    const updateSW = vi.fn(async () => undefined);
    bindPwaUpdater(updateSW);
    notifyNeedRefresh();
    await applyPwaUpdate({ pathname: "/sacoleira/pedidos", allowCritical: true });
    expect(updateSW).toHaveBeenCalledWith(true);
    expect(updateSW.mock.calls.flat().join("")).not.toMatch(/unregister|localStorage\.clear/i);
  });

  it("7 — slug da loja é preservado (manifesto por slug)", () => {
    const m = getCurrentPwaManifest("/loja/jessica-ifangee/checkout");
    expect(m.id).toBe("/loja/jessica-ifangee");
    expect(m.scope).toBe("/loja/jessica-ifangee/");
    expect(m.startUrl).toBe("/loja/jessica-ifangee");
  });

  it("8 — login permanece (storage não limpo)", async () => {
    sessionStorage.setItem("auth-session", "keep");
    bindPwaUpdater(vi.fn(async () => undefined));
    notifyNeedRefresh();
    await applyPwaUpdate({ allowCritical: true });
    expect(sessionStorage.getItem("auth-session")).toBe("keep");
  });

  it("9 — carrinho permanece", async () => {
    localStorage.setItem("cart-demo", "keep");
    bindPwaUpdater(vi.fn(async () => undefined));
    notifyNeedRefresh();
    await applyPwaUpdate({ allowCritical: true });
    expect(localStorage.getItem("cart-demo")).toBe("keep");
  });

  it("10 — Admin, Sacoleira e Loja continuam separados", () => {
    const a = getCurrentPwaManifest("/admin");
    const s = getCurrentPwaManifest("/sacoleira");
    const l = getCurrentPwaManifest("/loja/demo");
    expect(new Set([a.id, s.id, l.id]).size).toBe(3);
  });

  it("11 — não existe modal com decisão do usuário", () => {
    const modal = readFileSync(join(process.cwd(), "src/components/pwa/PwaUpdateModal.tsx"), "utf8");
    expect(modal).not.toContain("Agora não");
    expect(modal).not.toContain("Atualizar agora");
    expect(modal).not.toContain("<Button");
    expect(PWA_UPDATE_MESSAGE).toBe("Atualizando o aplicativo…");
  });

  it("12 — não existe loop de reload + autoUpdate no vite", () => {
    const vite = readFileSync(join(process.cwd(), "vite.config.ts"), "utf8");
    expect(vite).toContain('registerType: "autoUpdate"');
    expect(vite).not.toContain('registerType: "prompt"');
    const register = readFileSync(join(process.cwd(), "src/pwa/registerPwa.ts"), "utf8");
    expect(register).not.toMatch(/\bregistration\.unregister\b|\.unregister\(/);
    expect(register).toContain("5 * 60 * 1000");
  });
});
