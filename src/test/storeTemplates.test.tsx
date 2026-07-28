import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  DEFAULT_STORE_TEMPLATE_KEY,
  normalizeStoreTemplateKey,
} from "@/components/store/templates/types";
import {
  listActiveStoreTemplates,
  getStoreTemplateMeta,
} from "@/components/store/templates/templateRegistry";
import { StoreTemplateRenderer } from "@/components/store/templates/StoreTemplateRenderer";
import {
  CONFIRM_MESSAGE,
  StoreTemplatePickerSection,
} from "@/components/seller/StoreTemplatePickerSection";
import { defaultTheme } from "@/lib/storeTheme";
import type { CloudStoreProduct } from "@/lib/cloudStore";

const loadPreview = vi.fn();
const updateTemplate = vi.fn();

vi.mock("@/lib/cloudStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/cloudStore")>();
  return {
    ...actual,
    loadStoreProductsForTemplatePreview: (...args: unknown[]) => loadPreview(...args),
  };
});

vi.mock("@/lib/storeTheme", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/storeTheme")>();
  return {
    ...actual,
    updateStoreTemplateKey: (...args: unknown[]) => updateTemplate(...args),
  };
});

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { toast } from "sonner";

const sampleProduct = (partial: Partial<CloudStoreProduct> & Pick<CloudStoreProduct, "id" | "name">): CloudStoreProduct => ({
  code: "C1",
  category: "Anéis",
  description: "",
  suggestedPrice: 100,
  stock: 5,
  minOrder: 1,
  image: "https://cdn/p.jpg",
  images: ["https://cdn/p.jpg"],
  active: true,
  resellerPrice: 199,
  sellerStoreId: "store-1",
  ...partial,
});

describe("store templates — normalize e registry", () => {
  it("normaliza elegance, boutique e minimal", () => {
    expect(normalizeStoreTemplateKey("elegance")).toBe("elegance");
    expect(normalizeStoreTemplateKey("BOUTIQUE")).toBe("boutique");
    expect(normalizeStoreTemplateKey(" minimal ")).toBe("minimal");
  });

  it("fallback para elegance em inválido ou ausente", () => {
    expect(normalizeStoreTemplateKey(undefined)).toBe(DEFAULT_STORE_TEMPLATE_KEY);
    expect(normalizeStoreTemplateKey(null)).toBe("elegance");
    expect(normalizeStoreTemplateKey("")).toBe("elegance");
    expect(normalizeStoreTemplateKey("neon-cyber")).toBe("elegance");
  });

  it("loja antiga sem template_key usa elegance", () => {
    expect(normalizeStoreTemplateKey(({} as { template_key?: string }).template_key)).toBe(
      "elegance",
    );
  });

  it("catálogo tem exatamente os 3 templates ativos", () => {
    const list = listActiveStoreTemplates();
    expect(list.map((t) => t.key).sort()).toEqual(["boutique", "elegance", "minimal"]);
    expect(getStoreTemplateMeta("boutique").name).toBe("Boutique");
  });
});

describe("loadStoreProductsForTemplatePreview — limite", () => {
  it("helper limita entre 8 e 12 e reutiliza loadStoreProducts", () => {
    const cloud = readFileSync(join(process.cwd(), "src/lib/cloudStore.ts"), "utf8");
    expect(cloud).toContain("loadStoreProductsForTemplatePreview");
    expect(cloud).toContain("STORE_TEMPLATE_PREVIEW_PRODUCT_LIMIT = 12");
    expect(cloud).toContain("await loadStoreProducts(sellerStoreId)");
    expect(cloud).toContain("Math.min(Math.max(limit, 8), 12)");
  });
});

describe("StoreTemplateRenderer", () => {
  const baseProps = {
    store: {
      id: "s1",
      profileId: "",
      parentId: null,
      name: "Loja",
      storeName: "Loja",
      storeSlug: "loja",
      email: "",
      phone: "",
      status: "approved" as const,
      tier: "padrão",
      totalSpent: 0,
      ordersCount: 0,
      walletAvailable: 0,
      walletPending: 0,
      directReferrals: 0,
      networkSize: 0,
    },
    theme: defaultTheme,
    banners: ["https://cdn/banner.jpg"],
    products: [] as CloudStoreProduct[],
    filteredProducts: [] as CloudStoreProduct[],
    categories: ["Todos"],
    collections: [] as string[],
    activeCategory: "Todos",
    onActiveCategoryChange: () => {},
    query: "",
    productsLoading: false,
    productsError: null as string | null,
  };

  it("renderiza template elegance e fallback de inválido", async () => {
    const { rerender } = render(
      <MemoryRouter>
        <StoreTemplateRenderer {...baseProps} templateKey="elegance" />
      </MemoryRouter>,
    );
    expect(await screen.findByTestId("store-template-elegance")).toBeTruthy();

    rerender(
      <MemoryRouter>
        <StoreTemplateRenderer {...baseProps} templateKey="invalid-x" />
      </MemoryRouter>,
    );
    expect(await screen.findByTestId("store-template-elegance")).toBeTruthy();
  });

  it("lazy carrega boutique e minimal", async () => {
    const { rerender } = render(
      <MemoryRouter>
        <StoreTemplateRenderer {...baseProps} templateKey="boutique" />
      </MemoryRouter>,
    );
    expect(await screen.findByTestId("store-template-boutique")).toBeTruthy();
    rerender(
      <MemoryRouter>
        <StoreTemplateRenderer {...baseProps} templateKey="minimal" />
      </MemoryRouter>,
    );
    expect(await screen.findByTestId("store-template-minimal")).toBeTruthy();
  });
});

describe("StoreTemplatePickerSection — prévia e update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    updateTemplate.mockResolvedValue("minimal");
    loadPreview.mockResolvedValue([
      sampleProduct({ id: "p1", name: "Anel Real" }),
      sampleProduct({ id: "p2", name: "Brinco Real", category: "Brincos" }),
    ]);
  });

  it("preview carrega produtos reais da loja", async () => {
    render(
      <MemoryRouter>
        <StoreTemplatePickerSection
          storeId="store-1"
          storeName="Loja Teste"
          storeSlug="loja-teste"
          theme={{ ...defaultTheme, bannerUrls: ["https://cdn/b.jpg"] }}
          templateKey="elegance"
          onTemplateKeyChange={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId("store-template-preview-boutique"));
    expect(await screen.findByTestId("store-template-preview-dialog")).toBeTruthy();
    await waitFor(() => {
      expect(loadPreview).toHaveBeenCalledWith("store-1");
    });
    await waitFor(() => {
      const frame = screen.getByTestId("store-template-preview-frame");
      expect(frame.getAttribute("data-preview-loading")).toBe("false");
      expect(frame.getAttribute("data-preview-product-count")).toBe("2");
    });
    expect(screen.getByTestId("store-template-preview-frame").getAttribute("data-preview-inert")).toBe(
      "true",
    );
  });

  it("preview com loja sem produtos mostra vazio real", async () => {
    loadPreview.mockResolvedValue([]);
    render(
      <MemoryRouter>
        <StoreTemplatePickerSection
          storeId="store-empty"
          storeName="Vazia"
          storeSlug="vazia"
          theme={defaultTheme}
          templateKey="elegance"
          onTemplateKeyChange={vi.fn()}
        />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId("store-template-preview-minimal"));
    await waitFor(() => expect(loadPreview).toHaveBeenCalledWith("store-empty"));
    await waitFor(() => {
      const frame = screen.getByTestId("store-template-preview-frame");
      expect(frame.getAttribute("data-preview-loading")).toBe("false");
      expect(frame.getAttribute("data-preview-product-count")).toBe("0");
    });
  });

  it("preview não salva template e não usa carrinho", async () => {
    const onChange = vi.fn();
    const pickerSrc = readFileSync(
      join(process.cwd(), "src/components/seller/StoreTemplatePickerSection.tsx"),
      "utf8",
    );
    expect(pickerSrc).toContain("pointer-events-none");
    expect(pickerSrc).toContain("data-preview-inert");
    expect(pickerSrc).not.toContain("useCart");
    expect(pickerSrc).not.toContain("addItem");

    render(
      <MemoryRouter>
        <StoreTemplatePickerSection
          storeId="store-1"
          storeName="Loja"
          storeSlug="loja"
          theme={defaultTheme}
          templateKey="elegance"
          onTemplateKeyChange={onChange}
        />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId("store-template-preview-boutique"));
    await screen.findByTestId("store-template-preview-dialog");
    expect(updateTemplate).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("confirmação atualiza apenas template_key após sucesso", async () => {
    const onChange = vi.fn();
    render(
      <MemoryRouter>
        <StoreTemplatePickerSection
          storeId="store-1"
          storeName="Loja"
          storeSlug="loja"
          theme={defaultTheme}
          templateKey="elegance"
          onTemplateKeyChange={onChange}
        />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId("store-template-use-minimal"));
    expect(window.confirm).toHaveBeenCalledWith(CONFIRM_MESSAGE);
    await waitFor(() => {
      expect(updateTemplate).toHaveBeenCalledWith("store-1", "minimal");
      expect(onChange).toHaveBeenCalledWith("minimal");
      expect(toast.success).toHaveBeenCalled();
    });
    expect(updateTemplate.mock.calls[0]).toEqual(["store-1", "minimal"]);
  });

  it("falha no update preserva template anterior na UI", async () => {
    updateTemplate.mockRejectedValue(new Error("fail"));
    const onChange = vi.fn();
    render(
      <MemoryRouter>
        <StoreTemplatePickerSection
          storeId="store-1"
          storeName="Loja"
          storeSlug="loja"
          theme={defaultTheme}
          templateKey="elegance"
          onTemplateKeyChange={onChange}
        />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId("store-template-use-boutique"));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText("Modelo atual")).toBeTruthy();
  });

  it("cancelamento da confirmação não persiste", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const onChange = vi.fn();
    render(
      <MemoryRouter>
        <StoreTemplatePickerSection
          storeId="store-1"
          storeName="Loja"
          storeSlug="loja"
          theme={defaultTheme}
          templateKey="elegance"
          onTemplateKeyChange={onChange}
        />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId("store-template-use-boutique"));
    expect(updateTemplate).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("updateStoreTemplateKey — contrato", () => {
  it("função só atualiza template_key e valida retorno", () => {
    const src = readFileSync(join(process.cwd(), "src/lib/storeTheme.ts"), "utf8");
    expect(src).toMatch(/\.update\(\{\s*template_key:\s*key\s*\}/);
    expect(src).toContain('.select("template_key")');
    expect(src).toContain('.eq("id", storeId)');
    expect(src).toContain("Template inválido");
    expect(src).toContain("sem permissão");
  });
});

describe("store templates — wiring e migration", () => {
  it("migration completa com constraint e grants esperados", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/20260808120000_store_template_key.sql"),
      "utf8",
    );
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS template_key text NOT NULL DEFAULT 'elegance'");
    expect(sql).toContain("WHERE template_key IS NULL");
    expect(sql).toContain("seller_stores_template_key_check");
    expect(sql).toContain("CHECK (template_key IN ('elegance', 'boutique', 'minimal'))");
    expect(sql).toContain("GRANT SELECT (template_key) ON public.seller_stores TO anon");
    expect(sql).toContain("GRANT SELECT (template_key) ON public.seller_stores TO authenticated");
    expect(sql).not.toContain("DROP POLICY");
    expect(sql).not.toContain("GRANT UPDATE");
    expect(sql).not.toContain("GRANT ALL");
    expect(sql).not.toContain("protect_seller_stores");
    expect(sql).not.toContain("store_slug");
    expect(sql).not.toContain("owner_user_id");
    expect(sql).not.toContain("reseller_id");
  });

  it("StoreHome usa renderer e picker carrega produtos", () => {
    const home = readFileSync(join(process.cwd(), "src/pages/store/StoreHome.tsx"), "utf8");
    const picker = readFileSync(
      join(process.cwd(), "src/components/seller/StoreTemplatePickerSection.tsx"),
      "utf8",
    );
    expect(home).toContain("StoreTemplateRenderer");
    expect(picker).toContain("loadStoreProductsForTemplatePreview");
    expect(picker).toContain("previewMode");
  });

  it("carrinho, checkout e PWA autoUpdate intactos", () => {
    const cart = readFileSync(join(process.cwd(), "src/pages/store/StoreCart.tsx"), "utf8");
    const checkout = readFileSync(join(process.cwd(), "src/pages/store/StoreCheckout.tsx"), "utf8");
    const vite = readFileSync(join(process.cwd(), "vite.config.ts"), "utf8");
    expect(cart).not.toContain("StoreTemplateRenderer");
    expect(checkout).not.toContain("StoreTemplateRenderer");
    expect(vite).toContain('registerType: "autoUpdate"');
  });

  it("renderer usa lazy loading dos três templates", () => {
    const renderer = readFileSync(
      join(process.cwd(), "src/components/store/templates/StoreTemplateRenderer.tsx"),
      "utf8",
    );
    expect(renderer).toContain("lazy(");
    expect(renderer).toContain("Suspense");
  });
});

describe("store templates — prévia mobile responsiva", () => {
  const readTpl = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

  beforeEach(() => {
    vi.clearAllMocks();
    loadPreview.mockResolvedValue([sampleProduct({ id: "p1", name: "Anel Real" })]);
  });

  it("preview mobile usa viewport limitada entre 360 e 390", async () => {
    const picker = readTpl("src/components/seller/StoreTemplatePickerSection.tsx");
    expect(picker).toContain("w-[375px]");
    expect(picker).toContain("max-w-[min(100%,390px)]");
    expect(picker).toContain('data-preview-viewport={previewDevice === "mobile" ? "375" : "desktop"}');
    expect(picker).toContain("previewViewport={previewDevice}");

    render(
      <MemoryRouter>
        <StoreTemplatePickerSection
          storeId="store-1"
          storeName="Loja"
          storeSlug="loja"
          theme={defaultTheme}
          templateKey="elegance"
          onTemplateKeyChange={vi.fn()}
        />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId("store-template-preview-elegance"));
    await screen.findByTestId("store-template-preview-dialog");
    fireEvent.click(screen.getByRole("button", { name: /Celular/i }));
    const frame = screen.getByTestId("store-template-preview-frame");
    expect(frame.getAttribute("data-preview-device")).toBe("mobile");
    expect(frame.getAttribute("data-preview-viewport")).toBe("375");
    const vp = Number(frame.getAttribute("data-preview-viewport"));
    expect(vp).toBeGreaterThanOrEqual(360);
    expect(vp).toBeLessThanOrEqual(390);
  });

  it("não existe overflow horizontal no frame da prévia; @container só na prévia", () => {
    const picker = readTpl("src/components/seller/StoreTemplatePickerSection.tsx");
    const renderer = readTpl("src/components/store/templates/StoreTemplateRenderer.tsx");
    expect(picker).toContain("overflow-x-hidden");
    expect(renderer).toContain("overflow-x-hidden");
    expect(renderer).toContain("@container");
    expect(renderer).toContain("previewMode");
    // Loja pública não fica presa em @container
    expect(renderer).toContain(': "w-full min-w-0"');
  });

  it("materiais empilham na prévia celular; loja pública mantém md:grid-cols-3", () => {
    const elegance = readTpl("src/components/store/templates/elegance/EleganceHome.tsx");
    expect(elegance).toContain("store-materials-grid");
    expect(elegance).toContain('narrowPreview ? "grid grid-cols-1 gap-5" : "grid md:grid-cols-3 gap-5"');
    // Vitrine pública: 3 colunas no celular (visual original)
    expect(elegance).toContain("grid grid-cols-3 gap-2 sm:hidden");
  });

  it("textos dos templates não usam break-all", () => {
    for (const rel of [
      "src/components/store/templates/elegance/EleganceHome.tsx",
      "src/components/store/templates/boutique/BoutiqueHome.tsx",
      "src/components/store/templates/minimal/MinimalHome.tsx",
    ]) {
      expect(readTpl(rel)).not.toContain("break-all");
    }
  });

  it("Elegance restaura media queries da loja; prévia usa narrowPreview", () => {
    const renderer = readTpl("src/components/store/templates/StoreTemplateRenderer.tsx");
    expect(renderer).toContain("@container");
    expect(renderer).toContain("min-w-0");

    const elegance = readTpl("src/components/store/templates/elegance/EleganceHome.tsx");
    expect(elegance).toContain("grid grid-cols-3 gap-2 sm:hidden");
    expect(elegance).toContain("hidden sm:grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4");
    expect(elegance).toContain("min-h-[520px]");
    expect(elegance).toContain("narrowPreview");
    expect(elegance).not.toContain("@sm:");
    expect(elegance).not.toContain("@md:");

    const boutique = readTpl("src/components/store/templates/boutique/BoutiqueHome.tsx");
    expect(boutique).toContain("narrowPreview");
    expect(boutique).toContain("grid-cols-2 sm:grid-cols-3 lg:grid-cols-4");

    const minimal = readTpl("src/components/store/templates/minimal/MinimalHome.tsx");
    expect(minimal).toContain("narrowPreview");
    expect(minimal).toContain("grid-cols-2 lg:grid-cols-3");

    const card = readTpl("src/components/store/templates/shared/StoreProductCard.tsx");
    expect(card).toContain("forceMobile");
    expect(card).toContain("sm:hidden");
    expect(card).toContain("hidden sm:block");
  });

  it("desktop permanece com frame larga e device desktop", async () => {
    const picker = readTpl("src/components/seller/StoreTemplatePickerSection.tsx");
    expect(picker).toContain("max-w-4xl");

    render(
      <MemoryRouter>
        <StoreTemplatePickerSection
          storeId="store-1"
          storeName="Loja"
          storeSlug="loja"
          theme={defaultTheme}
          templateKey="elegance"
          onTemplateKeyChange={vi.fn()}
        />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId("store-template-preview-boutique"));
    await screen.findByTestId("store-template-preview-dialog");
    const frame = screen.getByTestId("store-template-preview-frame");
    expect(frame.getAttribute("data-preview-device")).toBe("desktop");
    expect(frame.getAttribute("data-preview-viewport")).toBe("desktop");
  });

  it("preview continua sem permitir cliques e fechar não salva template", async () => {
    const onChange = vi.fn();
    render(
      <MemoryRouter>
        <StoreTemplatePickerSection
          storeId="store-1"
          storeName="Loja"
          storeSlug="loja"
          theme={defaultTheme}
          templateKey="elegance"
          onTemplateKeyChange={onChange}
        />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId("store-template-preview-minimal"));
    const dialog = await screen.findByTestId("store-template-preview-dialog");
    const frame = screen.getByTestId("store-template-preview-frame");
    expect(frame.getAttribute("data-preview-inert")).toBe("true");
    fireEvent.click(frame);
    expect(updateTemplate).not.toHaveBeenCalled();

    fireEvent.keyDown(dialog, { key: "Escape", code: "Escape" });
    await waitFor(() => {
      expect(screen.queryByTestId("store-template-preview-dialog")).toBeNull();
    });
    expect(updateTemplate).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });
});
