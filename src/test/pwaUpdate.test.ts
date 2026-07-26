import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyPwaUpdate,
  beginControlledReload,
  bindPwaUpdater,
  clearReloadGuard,
  dismissPwaUpdate,
  getOfflineBlockMessage,
  getPwaUpdateState,
  isApiUrl,
  isPublicCacheableImageUrl,
  notifyNeedRefresh,
  PWA_CACHE_STRATEGY_SUMMARY,
  PWA_RELOAD_GUARD_KEY,
  requiresOnlineForPath,
  resetPwaUpdateControllerForTests,
  shouldConfirmBeforeUpdate,
  shouldExcludeFromDataRuntimeCache,
} from "@/lib/pwaUpdate";

afterEach(() => {
  resetPwaUpdateControllerForTests();
  vi.restoreAllMocks();
});

describe("PWA update + cache helpers", () => {
  it("A — nova versão detectada", () => {
    expect(getPwaUpdateState().needRefresh).toBe(false);
    notifyNeedRefresh();
    expect(getPwaUpdateState().needRefresh).toBe(true);
    expect(getPwaUpdateState().dismissed).toBe(false);
  });

  it("B — atualizar agora chama updateSW", async () => {
    const updateSW = vi.fn(async () => undefined);
    bindPwaUpdater(updateSW);
    notifyNeedRefresh();
    const result = await applyPwaUpdate();
    expect(result).toEqual({ ok: true });
    expect(updateSW).toHaveBeenCalledTimes(1);
    expect(updateSW).toHaveBeenCalledWith(true);
  });

  it("C — botão Depois fecha aviso", () => {
    notifyNeedRefresh();
    dismissPwaUpdate();
    const s = getPwaUpdateState();
    expect(s.needRefresh).toBe(false);
    expect(s.dismissed).toBe(true);
  });

  it("D — não ocorre reload infinito", async () => {
    const updateSW = vi.fn(async () => undefined);
    bindPwaUpdater(updateSW);

    expect(beginControlledReload()).toBe(true);
    expect(beginControlledReload()).toBe(false);

    clearReloadGuard();
    notifyNeedRefresh();
    await applyPwaUpdate();
    const second = await applyPwaUpdate();
    expect(second).toEqual({ ok: false, reason: "reload_guard" });
    expect(updateSW).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(PWA_RELOAD_GUARD_KEY)).toBe("1");
  });

  it("E — checkout preenchido mostra confirmação", () => {
    expect(
      shouldConfirmBeforeUpdate({
        pathname: "/loja/demo/checkout",
        hasFilledForm: true,
      }),
    ).toBe(true);
    expect(
      shouldConfirmBeforeUpdate({
        pathname: "/loja/demo/checkout",
        hasFilledForm: false,
      }),
    ).toBe(false);
    expect(
      shouldConfirmBeforeUpdate({
        pathname: "/loja/demo",
        hasFilledForm: true,
      }),
    ).toBe(false);
  });

  it("F — modo offline bloqueia operações sensíveis", () => {
    expect(requiresOnlineForPath("/admin/pedidos")).toBe(true);
    expect(requiresOnlineForPath("/sacoleira/financeiro")).toBe(true);
    expect(requiresOnlineForPath("/loja/x/checkout")).toBe(true);
    expect(requiresOnlineForPath("/loja/x")).toBe(false);
    expect(getOfflineBlockMessage()).toBe(
      "Você está offline. Conecte-se para continuar.",
    );
  });

  it("G — URLs de API não entram no runtimeCaching de dados", () => {
    const apiUrls = [
      "https://abc.supabase.co/rest/v1/orders",
      "https://abc.supabase.co/rest/v1/rpc/create_public_order",
      "https://abc.supabase.co/auth/v1/token",
      "https://abc.supabase.co/functions/v1/mcp",
      "https://abc.supabase.co/realtime/v1/websocket",
      "https://foo.lovable.app/api/anything",
    ];
    for (const url of apiUrls) {
      expect(isApiUrl(url), url).toBe(true);
      expect(shouldExcludeFromDataRuntimeCache(url), url).toBe(true);
      expect(isPublicCacheableImageUrl(url), url).toBe(false);
    }
    expect(PWA_CACHE_STRATEGY_SUMMARY.apiRestRpcAuth).toBe("NetworkOnly");
    expect(PWA_CACHE_STRATEGY_SUMMARY.supabaseOther).toBe("NetworkOnly");
  });

  it("H — imagens públicas entram no cache permitido", () => {
    const publicImg =
      "https://abc.supabase.co/storage/v1/object/public/products/ring.png";
    expect(isPublicCacheableImageUrl(publicImg)).toBe(true);
    expect(isApiUrl(publicImg)).toBe(false);
    expect(shouldExcludeFromDataRuntimeCache(publicImg)).toBe(false);

    const privateImg =
      "https://abc.supabase.co/storage/v1/object/authenticated/private/doc.png";
    expect(isPublicCacheableImageUrl(privateImg)).toBe(false);
    expect(isApiUrl(privateImg)).toBe(true);

    expect(isPublicCacheableImageUrl("/assets/hero.webp")).toBe(true);
    expect(PWA_CACHE_STRATEGY_SUMMARY.publicImages).toBe("StaleWhileRevalidate");
  });
});
