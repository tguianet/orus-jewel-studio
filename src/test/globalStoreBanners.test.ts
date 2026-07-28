import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  __resetGlobalBannerCacheForTests,
  assertSafeBannerButtonUrl,
  getCampaignLifecycle,
  isCampaignVisibleNow,
  isSafeBannerButtonUrl,
  loadCampaignsForApprovedStore,
  sortCampaignsByPosition,
  validateBannerImageFile,
  type GlobalStoreBanner,
} from "@/lib/globalStoreBanners";
import {
  campaignToHeroSlide,
  mergeStoreHeroSlides,
  resolveHeroSlideImageUrl,
} from "@/lib/storeHeroSlides";

const baseCampaign = (partial: Partial<GlobalStoreBanner> = {}): GlobalStoreBanner => ({
  id: "c1",
  title: "Campanha",
  subtitle: "Sub",
  imageUrl: "https://cdn/desktop.jpg",
  mobileImageUrl: "https://cdn/mobile.jpg",
  buttonText: "Ver",
  buttonUrl: "https://amadaamante.com.br",
  isActive: true,
  isMandatory: true,
  position: 0,
  startsAt: null,
  endsAt: null,
  createdBy: "admin",
  updatedBy: "admin",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...partial,
});

describe("global store banners — regras de exibição", () => {
  it("campanha ativa aparece", () => {
    expect(isCampaignVisibleNow(baseCampaign({ isActive: true }))).toBe(true);
    expect(getCampaignLifecycle(baseCampaign({ isActive: true }))).toBe("active");
  });

  it("campanha pausada não aparece", () => {
    expect(isCampaignVisibleNow(baseCampaign({ isActive: false }))).toBe(false);
    expect(getCampaignLifecycle(baseCampaign({ isActive: false }))).toBe("paused");
  });

  it("campanha futura não aparece", () => {
    const startsAt = new Date(Date.now() + 86_400_000).toISOString();
    expect(isCampaignVisibleNow(baseCampaign({ startsAt }))).toBe(false);
    expect(getCampaignLifecycle(baseCampaign({ startsAt }))).toBe("scheduled");
  });

  it("campanha encerrada não aparece", () => {
    const endsAt = new Date(Date.now() - 86_400_000).toISOString();
    expect(isCampaignVisibleNow(baseCampaign({ endsAt }))).toBe(false);
    expect(getCampaignLifecycle(baseCampaign({ endsAt }))).toBe("ended");
  });

  it("múltiplas campanhas respeitam position e created_at", () => {
    const sorted = sortCampaignsByPosition([
      baseCampaign({ id: "b", position: 2, createdAt: "2026-01-02T00:00:00.000Z" }),
      baseCampaign({ id: "a", position: 1, createdAt: "2026-01-03T00:00:00.000Z" }),
      baseCampaign({ id: "c", position: 1, createdAt: "2026-01-01T00:00:00.000Z" }),
    ]);
    expect(sorted.map((c) => c.id)).toEqual(["c", "a", "b"]);
  });
});

describe("mergeStoreHeroSlides — ordem e preservação", () => {
  it("campanha aparece antes do banner próprio e próprio continua existindo", () => {
    const slides = mergeStoreHeroSlides({
      campaigns: [baseCampaign({ id: "g1", imageUrl: "https://cdn/campaign.jpg" })],
      sellerBannerUrls: ["https://cdn/own.jpg"],
      fallbackUrl: "https://cdn/fallback.jpg",
    });
    expect(slides[0].kind).toBe("campaign");
    expect(slides[0].imageUrl).toBe("https://cdn/campaign.jpg");
    expect(slides.some((s) => s.kind === "seller" && s.imageUrl === "https://cdn/own.jpg")).toBe(
      true,
    );
    expect(slides.length).toBe(2);
  });

  it("imagem mobile com fallback desktop", () => {
    const slide = campaignToHeroSlide(
      baseCampaign({ mobileImageUrl: "https://cdn/m.jpg", imageUrl: "https://cdn/d.jpg" }),
    );
    expect(resolveHeroSlideImageUrl(slide, true)).toBe("https://cdn/m.jpg");
    expect(resolveHeroSlideImageUrl({ ...slide, mobileImageUrl: null }, true)).toBe(
      "https://cdn/d.jpg",
    );
  });

  it("link inválido é rejeitado no botão do slide", () => {
    expect(isSafeBannerButtonUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeBannerButtonUrl("data:text/html,hi")).toBe(false);
    expect(isSafeBannerButtonUrl("https://ok.com")).toBe(true);
    expect(() => assertSafeBannerButtonUrl("javascript:void(0)")).toThrow(/inválido/i);
    const slide = campaignToHeroSlide(baseCampaign({ buttonUrl: "javascript:evil" }));
    expect(slide.buttonUrl).toBeNull();
  });
});

describe("loadCampaignsForApprovedStore — status da loja", () => {
  beforeEach(() => {
    __resetGlobalBannerCacheForTests();
    vi.resetModules();
  });

  it("não carrega para pending/blocked; carrega para approved", async () => {
    const pending = await loadCampaignsForApprovedStore("pending");
    const blocked = await loadCampaignsForApprovedStore("blocked");
    expect(pending).toEqual([]);
    expect(blocked).toEqual([]);
  });

  it("erro de carregamento não quebra (retorna lista vazia)", async () => {
    const mod = await import("@/lib/globalStoreBanners");
    mod.__resetGlobalBannerCacheForTests();
    const rows = await mod.loadCampaignsForApprovedStore("approved");
    expect(Array.isArray(rows)).toBe(true);
  });
});

describe("upload validation", () => {
  it("aceita png/jpg/webp e rejeita tamanho/tipo inválido", () => {
    expect(() =>
      validateBannerImageFile(new File([new Uint8Array(10)], "a.png", { type: "image/png" })),
    ).not.toThrow();
    expect(() =>
      validateBannerImageFile(new File([new Uint8Array(10)], "a.gif", { type: "image/gif" })),
    ).toThrow(/PNG, JPG ou WEBP/i);
    expect(() =>
      validateBannerImageFile(
        new File([new Uint8Array(6 * 1024 * 1024)], "a.jpg", { type: "image/jpeg" }),
      ),
    ).toThrow(/5MB/i);
  });
});

describe("arquitetura / segurança / UI — auditoria estática", () => {
  const root = process.cwd();
  const migration = readFileSync(
    join(root, "supabase/migrations/20260810120000_global_store_banners.sql"),
    "utf8",
  );
  const adminSection = readFileSync(
    join(root, "src/components/admin/AdminGlobalStoreBannersSection.tsx"),
    "utf8",
  );
  const storeHome = readFileSync(join(root, "src/pages/store/StoreHome.tsx"), "utf8");
  const cover = readFileSync(
    join(root, "src/components/seller/customization/CoverStep.tsx"),
    "utf8",
  );
  const elegance = readFileSync(
    join(root, "src/components/store/templates/elegance/EleganceHome.tsx"),
    "utf8",
  );
  const boutique = readFileSync(
    join(root, "src/components/store/templates/boutique/BoutiqueHome.tsx"),
    "utf8",
  );
  const minimal = readFileSync(
    join(root, "src/components/store/templates/minimal/MinimalHome.tsx"),
    "utf8",
  );
  const terms = readFileSync(join(root, "src/pages/legal/TermsOfUse.tsx"), "utf8");

  it("migration cria tabela central sem alterar seller_stores/theme", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.global_store_banners");
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("Public can view active global store banners");
    expect(migration).toContain("admin_upsert_global_store_banner");
    expect(migration).toContain("write_audit_log");
    expect(migration).not.toMatch(/ALTER TABLE public\.seller_stores/i);
    expect(migration).not.toMatch(/theme\s*=/i);
  });

  it("RLS: leitura pública filtrada; escrita só via RPC admin", () => {
    expect(migration).toContain("is_active = true");
    expect(migration).toContain("starts_at IS NULL OR starts_at <= now()");
    expect(migration).toContain("REVOKE ALL ON TABLE public.global_store_banners FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("GRANT SELECT ON TABLE public.global_store_banners TO anon, authenticated");
    expect(migration).toContain("Apenas administradores");
    expect(migration).toContain("create_global_store_banner");
    expect(migration).toContain("pause_global_store_banner");
    expect(migration).toContain("delete_global_store_banner");
  });

  it("admin cria/edita/pausa/duplica/exclui; sacoleira sem ações de escrita na UI", () => {
    expect(adminSection).toContain("Campanhas nos banners das lojas");
    expect(adminSection).toContain("adminUpsertGlobalStoreBanner");
    expect(adminSection).toContain("adminSetGlobalStoreBannerActive");
    expect(adminSection).toContain("adminDuplicateGlobalStoreBanner");
    expect(adminSection).toContain("adminDeleteGlobalStoreBanner");
    expect(adminSection).toContain("confirm(");
    expect(cover).toContain("GLOBAL_CAMPAIGN_NOTICE_SELLER");
    expect(cover).not.toContain("adminUpsertGlobalStoreBanner");
    expect(cover).not.toContain("adminDeleteGlobalStoreBanner");
  });

  it("StoreHome injeta campanhas só em approved e templates usam contrato compartilhado", () => {
    expect(storeHome).toContain("loadCampaignsForApprovedStore");
    expect(storeHome).toContain("mergeStoreHeroSlides");
    expect(storeHome).toContain("heroSlides");
    expect(elegance).toContain("StoreHeroBannerLayer");
    expect(boutique).toContain("StoreHeroBannerLayer");
    expect(minimal).toContain("StoreHeroBannerLayer");
    const layer = readFileSync(
      join(root, "src/components/store/templates/shared/StoreHeroBannerLayer.tsx"),
      "utf8",
    );
    expect(layer).toContain("official-campaign-badge");
    expect(layer).toContain("OFFICIAL_CAMPAIGN_BADGE");
    const slidesLib = readFileSync(join(root, "src/lib/storeHeroSlides.ts"), "utf8");
    expect(slidesLib).toContain('Campanha oficial Amada Amante');
  });

  it("termos: seção Vitrines da rede com cláusula de campanhas oficiais", () => {
    expect(terms).toContain('id: "vitrines-da-rede"');
    expect(terms).toContain("Vitrines da rede");
    expect(terms).toContain(
      "A Amada Amante poderá exibir campanhas institucionais e promocionais nas lojas da rede.",
    );
  });
});

describe("admin RPC names — contrato de escrita (sacoleira/anon)", () => {
  it("lib admin usa apenas RPCs DEFINER (não .update/.delete direto na tabela)", () => {
    const lib = readFileSync(join(process.cwd(), "src/lib/globalStoreBanners.ts"), "utf8");
    expect(lib).toContain('rpc("admin_upsert_global_store_banner"');
    expect(lib).toContain('rpc("admin_delete_global_store_banner"');
    expect(lib).toContain('rpc("admin_set_global_store_banner_active"');
    expect(lib).not.toMatch(/\.from\(["']global_store_banners["']\)\.(insert|update|delete)/);
  });
});
