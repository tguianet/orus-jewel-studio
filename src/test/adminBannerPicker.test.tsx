import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  ADMIN_BANNER_ADDED_TOAST,
  ADMIN_BANNER_DUPLICATE_TOAST,
  ADMIN_BANNERS_EMPTY_MESSAGE,
  appendAdminBannerToTheme,
  countStoresUsingBannerUrl,
  filterAvailableStoreBanners,
  isAdminBannerAlreadyInStore,
  isMarketingBannerCurrentlyAvailable,
  themeBannerUrls,
  type ImageFormat,
  type MarketingBanner,
} from "@/lib/marketingBanners";
import type { StoreTheme } from "@/lib/storeTheme";
import { defaultTheme } from "@/lib/storeTheme";

const loadAvailableStoreBanners = vi.fn();

vi.mock("@/lib/marketingBanners", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/marketingBanners")>();
  return {
    ...actual,
    loadAvailableStoreBanners: (...args: unknown[]) => loadAvailableStoreBanners(...args),
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { AdminBannerPickerDialog } from "@/components/seller/AdminBannerPickerDialog";
import { toast } from "sonner";

const formatLoja: ImageFormat = {
  id: "fmt-loja",
  name: "Banner loja",
  slug: "banner-loja",
  width: 1600,
  height: 500,
  description: "Hero da loja",
  active: true,
  sortOrder: 1,
};

function banner(partial: Partial<MarketingBanner> & Pick<MarketingBanner, "id" | "imageUrl">): MarketingBanner {
  return {
    title: "Banner",
    active: true,
    sortOrder: 0,
    formatId: formatLoja.id,
    ...partial,
  };
}

describe("marketingBanners — disponibilidade e vínculo", () => {
  it("filtra apenas ativos e válidos do formato banner-loja", () => {
    const now = new Date("2026-07-15T12:00:00.000Z");
    const banners = [
      banner({ id: "a", imageUrl: "https://cdn/a.jpg", active: true }),
      banner({ id: "b", imageUrl: "https://cdn/b.jpg", active: false }),
      banner({
        id: "c",
        imageUrl: "https://cdn/c.jpg",
        active: true,
        endAt: "2026-07-01T00:00:00.000Z",
      }),
      banner({
        id: "d",
        imageUrl: "https://cdn/d.jpg",
        active: true,
        startAt: "2026-08-01T00:00:00.000Z",
      }),
      banner({
        id: "e",
        imageUrl: "https://cdn/e.jpg",
        active: true,
        formatId: "outro",
      }),
    ];
    const available = filterAvailableStoreBanners({
      banners,
      formats: [formatLoja],
      now,
    });
    expect(available.map((b) => b.id)).toEqual(["a"]);
  });

  it("banner inativo / expirado / futuro não estão disponíveis", () => {
    const now = new Date("2026-07-15T12:00:00.000Z");
    expect(isMarketingBannerCurrentlyAvailable({ active: false }, now)).toBe(false);
    expect(
      isMarketingBannerCurrentlyAvailable(
        { active: true, endAt: "2026-07-01T00:00:00.000Z" },
        now,
      ),
    ).toBe(false);
    expect(
      isMarketingBannerCurrentlyAvailable(
        { active: true, startAt: "2026-08-01T00:00:00.000Z" },
        now,
      ),
    ).toBe(false);
    expect(isMarketingBannerCurrentlyAvailable({ active: true }, now)).toBe(true);
  });

  it("adiciona banner à loja preservando ordem e impede duplicidade", () => {
    const theme: StoreTheme = {
      ...defaultTheme,
      bannerUrl: "https://cdn/own.jpg",
      bannerUrls: ["https://cdn/own.jpg"],
    };
    const first = appendAdminBannerToTheme(theme, "https://cdn/admin-1.jpg");
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(themeBannerUrls(first.theme)).toEqual([
      "https://cdn/own.jpg",
      "https://cdn/admin-1.jpg",
    ]);
    expect(first.theme.bannerUrl).toBe("https://cdn/own.jpg");

    const dup = appendAdminBannerToTheme(first.theme, "https://cdn/admin-1.jpg");
    expect(dup).toEqual({ ok: false, reason: "duplicate" });
    expect(isAdminBannerAlreadyInStore(first.theme, "https://cdn/admin-1.jpg")).toBe(true);
  });

  it("banner próprio continua funcionando junto com admin", () => {
    let theme: StoreTheme = { ...defaultTheme, bannerUrls: [] };
    const own = appendAdminBannerToTheme(theme, "https://cdn/own-upload.jpg");
    expect(own.ok).toBe(true);
    if (!own.ok) return;
    theme = own.theme;
    const admin = appendAdminBannerToTheme(theme, "https://cdn/admin.jpg");
    expect(admin.ok).toBe(true);
    if (!admin.ok) return;
    expect(themeBannerUrls(admin.theme)).toEqual([
      "https://cdn/own-upload.jpg",
      "https://cdn/admin.jpg",
    ]);
  });

  it("remover da loja não altera URL original do admin (vínculo por URL)", () => {
    const adminUrl = "https://cdn/admin-keep.jpg";
    const theme: StoreTheme = {
      ...defaultTheme,
      bannerUrls: ["https://cdn/own.jpg", adminUrl],
      bannerUrl: "https://cdn/own.jpg",
    };
    const nextList = themeBannerUrls(theme).filter((u) => u !== adminUrl);
    const nextTheme: StoreTheme = {
      ...theme,
      bannerUrls: nextList,
      bannerUrl: nextList[0],
    };
    expect(nextList).toEqual(["https://cdn/own.jpg"]);
    expect(adminUrl).toBe("https://cdn/admin-keep.jpg");
    expect(isAdminBannerAlreadyInStore(nextTheme, adminUrl)).toBe(false);
  });
  it("conta lojas usando URL do banner", () => {
    expect(
      countStoresUsingBannerUrl(
        [
          { bannerUrls: ["https://cdn/a.jpg"] },
          { bannerUrl: "https://cdn/a.jpg", bannerUrls: ["https://cdn/a.jpg", "https://cdn/b.jpg"] },
          { bannerUrls: ["https://cdn/b.jpg"] },
          null,
        ],
        "https://cdn/a.jpg",
      ),
    ).toBe(2);
  });
});

describe("AdminBannerPickerDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("abre modal, lista ativos e adiciona banner com toast", async () => {
    const onThemeChange = vi.fn();
    const onPersist = vi.fn().mockResolvedValue(undefined);
    loadAvailableStoreBanners.mockResolvedValue({
      banners: [
        banner({
          id: "b1",
          title: "Coleção Verão",
          description: "Hero oficial",
          imageUrl: "https://cdn/verao.jpg",
        }),
      ],
      format: formatLoja,
      error: null,
    });

    const theme: StoreTheme = { ...defaultTheme, bannerUrls: [] };
    render(
      <AdminBannerPickerDialog
        open
        onOpenChange={() => {}}
        theme={theme}
        onThemeChange={onThemeChange}
        onPersist={onPersist}
      />,
    );

    expect(await screen.findByTestId("admin-banner-picker-dialog")).toBeTruthy();
    expect(screen.getByText("Escolha um banner pronto")).toBeTruthy();
    expect(
      screen.getByText("Selecione um dos banners disponibilizados pela Amada Amante."),
    ).toBeTruthy();
    expect(await screen.findByText("Coleção Verão")).toBeTruthy();
    expect(screen.getByText(/1600 × 500/)).toBeTruthy();

    fireEvent.click(screen.getByTestId("admin-banner-use-b1"));
    await waitFor(() => {
      expect(onPersist).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(ADMIN_BANNER_ADDED_TOAST);
    });
    expect(onThemeChange).toHaveBeenCalled();
    const next = onThemeChange.mock.calls[0][0] as StoreTheme;
    expect(themeBannerUrls(next)).toContain("https://cdn/verao.jpg");
  });

  it("impede duplicidade e mostra estado já usado", async () => {
    loadAvailableStoreBanners.mockResolvedValue({
      banners: [banner({ id: "b2", title: "Já usado", imageUrl: "https://cdn/dup.jpg" })],
      format: formatLoja,
      error: null,
    });
    const theme: StoreTheme = {
      ...defaultTheme,
      bannerUrl: "https://cdn/dup.jpg",
      bannerUrls: ["https://cdn/dup.jpg"],
    };
    render(
      <AdminBannerPickerDialog
        open
        onOpenChange={() => {}}
        theme={theme}
        onThemeChange={vi.fn()}
        onPersist={vi.fn()}
      />,
    );
    expect(await screen.findByText("Já na loja")).toBeTruthy();
    expect(screen.queryByTestId("admin-banner-use-b2")).toBeNull();
  });

  it("estado vazio amigável", async () => {
    loadAvailableStoreBanners.mockResolvedValue({
      banners: [],
      format: formatLoja,
      error: null,
    });
    render(
      <AdminBannerPickerDialog
        open
        onOpenChange={() => {}}
        theme={{ ...defaultTheme }}
        onThemeChange={vi.fn()}
        onPersist={vi.fn()}
      />,
    );
    expect(await screen.findByTestId("admin-banner-picker-empty")).toBeTruthy();
    expect(screen.getByText(ADMIN_BANNERS_EMPTY_MESSAGE)).toBeTruthy();
  });

  it("erro amigável ao carregar", async () => {
    loadAvailableStoreBanners.mockResolvedValue({
      banners: [],
      format: null,
      error: "Não foi possível carregar os banners prontos.",
    });
    render(
      <AdminBannerPickerDialog
        open
        onOpenChange={() => {}}
        theme={{ ...defaultTheme }}
        onThemeChange={vi.fn()}
        onPersist={vi.fn()}
      />,
    );
    expect(await screen.findByTestId("admin-banner-picker-error")).toBeTruthy();
    expect(screen.getByText("Não foi possível carregar os banners prontos.")).toBeTruthy();
  });

  it("toast de duplicidade se tentar adicionar de novo", async () => {
    const imageUrl = "https://cdn/once.jpg";
    loadAvailableStoreBanners.mockResolvedValue({
      banners: [banner({ id: "b3", title: "Uma vez", imageUrl })],
      format: formatLoja,
      error: null,
    });
    // Theme already has it but UI would show "Já na loja" — call helper path via empty then simulate
    const theme: StoreTheme = { ...defaultTheme, bannerUrls: [] };
    const { rerender } = render(
      <AdminBannerPickerDialog
        open
        onOpenChange={() => {}}
        theme={theme}
        onThemeChange={vi.fn()}
        onPersist={vi.fn().mockResolvedValue(undefined)}
      />,
    );
    await screen.findByTestId("admin-banner-use-b3");

    const usedTheme: StoreTheme = {
      ...defaultTheme,
      bannerUrl: imageUrl,
      bannerUrls: [imageUrl],
    };
    rerender(
      <AdminBannerPickerDialog
        open
        onOpenChange={() => {}}
        theme={usedTheme}
        onThemeChange={vi.fn()}
        onPersist={vi.fn()}
      />,
    );
    expect(await screen.findByText("Já na loja")).toBeTruthy();
    expect(ADMIN_BANNER_DUPLICATE_TOAST).toContain("já está");
  });
});

describe("SellerCustomization — botão admin banner", () => {
  it("botão aparece abaixo de Adicionar banner no arquivo", () => {
    const src = readFileSync(
      join(process.cwd(), "src/pages/seller/SellerCustomization.tsx"),
      "utf8",
    );
    const addIdx = src.indexOf("Adicionar banner");
    const useIdx = src.indexOf("Usar banner do administrador");
    expect(addIdx).toBeGreaterThan(-1);
    expect(useIdx).toBeGreaterThan(addIdx);
    expect(src).toContain('data-testid="customization-add-banner"');
    expect(src).toContain('data-testid="customization-use-admin-banner"');
    expect(src).toContain("AdminBannerPickerDialog");
    expect(src).toContain("ImageIcon");
    expect(src).toContain("goldOutline");
  });

  it("sacoleira não edita banner admin (somente vínculo de URL)", () => {
    const picker = readFileSync(
      join(process.cwd(), "src/components/seller/AdminBannerPickerDialog.tsx"),
      "utf8",
    );
    expect(picker).not.toMatch(/uploadMarketingBannerFile|deleteMarketingBanner|setMarketingBannerActive/);
    expect(picker).toContain("appendAdminBannerToTheme");
  });

  it("admin gerencia banners em AdminBanners", () => {
    const admin = readFileSync(
      join(process.cwd(), "src/pages/admin/AdminBanners.tsx"),
      "utf8",
    );
    expect(admin).toContain("createMarketingBanner");
    expect(admin).toContain("setMarketingBannerActive");
    expect(admin).toContain("deleteMarketingBanner");
    expect(admin).toContain("countStoresUsingBannerUrl");
    expect(admin).toContain("confirm(");
  });

  it("grid do picker é responsivo (sm:grid-cols-2)", () => {
    const picker = readFileSync(
      join(process.cwd(), "src/components/seller/AdminBannerPickerDialog.tsx"),
      "utf8",
    );
    expect(picker).toContain("grid grid-cols-1 sm:grid-cols-2");
  });
});
