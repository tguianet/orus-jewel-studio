import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { defaultTheme } from "@/lib/storeTheme";
import {
  CUSTOMIZATION_STEPS,
  DESCRIPTION_SUGGESTIONS,
  READY_COLOR_PRESETS,
} from "@/components/seller/customization/customizationCopy";

const storeThemeMocks = vi.hoisted(() => ({
  loadCurrentSellerStore: vi.fn(),
  saveStoreCustomization: vi.fn(),
  uploadStoreAsset: vi.fn(),
  updateStoreTemplateKey: vi.fn(),
}));

vi.mock("@/lib/storeTheme", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/storeTheme")>();
  return {
    ...actual,
    loadCurrentSellerStore: (...args: unknown[]) => storeThemeMocks.loadCurrentSellerStore(...args),
    saveStoreCustomization: (...args: unknown[]) => storeThemeMocks.saveStoreCustomization(...args),
    uploadStoreAsset: (...args: unknown[]) => storeThemeMocks.uploadStoreAsset(...args),
    updateStoreTemplateKey: (...args: unknown[]) => storeThemeMocks.updateStoreTemplateKey(...args),
  };
});

vi.mock("@/lib/cloudStore", () => ({
  loadStoreProductsForTemplatePreview: vi.fn().mockResolvedValue([]),
  STORE_TEMPLATE_PREVIEW_PRODUCT_LIMIT: 12,
}));

vi.mock("@/layouts/SellerLayout", () => ({
  SellerLayout: ({ children }: { children: ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ profile: { storeId: "store-1" } }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/components/store/templates/StoreTemplateRenderer", () => ({
  StoreTemplateRenderer: () => <div data-testid="mock-template-renderer">preview</div>,
}));

import SellerCustomization from "@/pages/seller/SellerCustomization";
import { toast } from "sonner";

async function goToStep(n: number) {
  for (let i = 1; i < n; i++) {
    fireEvent.click(await screen.findByTestId("customization-continue"));
  }
}

describe("customization wizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeThemeMocks.loadCurrentSellerStore.mockResolvedValue({
      id: "store-1",
      storeName: "Loja Ana",
      storeSlug: "loja-ana",
      contactPhone: "11999990000",
      theme: { ...defaultTheme, description: "Texto antigo", instagram: "ana" },
      templateKey: "elegance",
    });
    storeThemeMocks.saveStoreCustomization.mockResolvedValue(undefined);
    storeThemeMocks.updateStoreTemplateKey.mockResolvedValue(undefined);
  });

  it("tem 5 etapas com títulos definidos", () => {
    expect(CUSTOMIZATION_STEPS).toHaveLength(5);
    expect(CUSTOMIZATION_STEPS.map((s) => s.short)).toEqual([
      "Modelo",
      "Identidade",
      "Capa",
      "Contato",
      "Revisão",
    ]);
  });

  it("navega entre etapas com Continuar e Voltar", async () => {
    render(
      <MemoryRouter>
        <SellerCustomization />
      </MemoryRouter>,
    );
    expect(await screen.findByTestId("customization-step-model")).toBeTruthy();
    fireEvent.click(screen.getByTestId("customization-continue"));
    expect(await screen.findByTestId("customization-step-identity")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(await screen.findByTestId("customization-step-model")).toBeTruthy();
  });

  it("preserva nome ao voltar da identidade", async () => {
    render(
      <MemoryRouter>
        <SellerCustomization />
      </MemoryRouter>,
    );
    await goToStep(2);
    const nameInput = await screen.findByTestId("customization-store-name");
    fireEvent.change(nameInput, { target: { value: "Joias da Ana" } });
    fireEvent.click(screen.getByTestId("customization-continue"));
    expect(await screen.findByTestId("customization-step-cover")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect((await screen.findByTestId("customization-store-name") as HTMLInputElement).value).toBe(
      "Joias da Ana",
    );
  });

  it("escolhe cor pronta e permite cor personalizada", async () => {
    render(
      <MemoryRouter>
        <SellerCustomization />
      </MemoryRouter>,
    );
    await goToStep(2);
    const preset = READY_COLOR_PRESETS[0];
    fireEvent.click(screen.getByTestId(`customization-color-${preset.id}`));
    fireEvent.click(screen.getByTestId("customization-custom-color-toggle"));
    expect(await screen.findByTestId("customization-custom-color")).toBeTruthy();
  });

  it("preenche apresentação com sugestões", async () => {
    render(
      <MemoryRouter>
        <SellerCustomization />
      </MemoryRouter>,
    );
    await goToStep(4);
    fireEvent.click(screen.getByTestId("customization-desc-elegant"));
    const desc = await screen.findByTestId("customization-description");
    expect((desc as HTMLTextAreaElement).value).toBe(DESCRIPTION_SUGGESTIONS[0].text);
  });

  it("edita WhatsApp e Instagram", async () => {
    render(
      <MemoryRouter>
        <SellerCustomization />
      </MemoryRouter>,
    );
    await goToStep(4);
    fireEvent.change(screen.getByTestId("customization-whatsapp"), {
      target: { value: "11988887777" },
    });
    fireEvent.change(screen.getByTestId("customization-instagram"), {
      target: { value: "@novaloja" },
    });
    expect((screen.getByTestId("customization-whatsapp") as HTMLInputElement).value).toBe(
      "11988887777",
    );
    expect((screen.getByTestId("customization-instagram") as HTMLInputElement).value).toBe(
      "novaloja",
    );
  });

  it("mostra revisão com preview celular/computador e salva", async () => {
    render(
      <MemoryRouter>
        <SellerCustomization />
      </MemoryRouter>,
    );
    await goToStep(5);
    expect(await screen.findByTestId("customization-step-review")).toBeTruthy();
    expect(screen.getByTestId("customization-review-summary")).toBeTruthy();
    fireEvent.click(screen.getByTestId("customization-preview-desktop"));
    fireEvent.click(screen.getByTestId("customization-preview-mobile"));
    fireEvent.click(screen.getByTestId("customization-save"));
    await waitFor(() => {
      expect(storeThemeMocks.saveStoreCustomization).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalled();
    });
  });

  it("mostra erro de salvamento", async () => {
    storeThemeMocks.saveStoreCustomization.mockRejectedValueOnce(new Error("fail"));
    render(
      <MemoryRouter>
        <SellerCustomization />
      </MemoryRouter>,
    );
    await goToStep(5);
    fireEvent.click(await screen.findByTestId("customization-save"));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it("configurações avançadas começam fechadas", async () => {
    render(
      <MemoryRouter>
        <SellerCustomization />
      </MemoryRouter>,
    );
    const adv = await screen.findByTestId("customization-advanced");
    expect(adv).toBeInstanceOf(HTMLDetailsElement);
    expect((adv as HTMLDetailsElement).open).toBe(false);
    expect(within(adv).getByText(/Use apenas se quiser personalizar/i)).toBeTruthy();
  });

  it("root do wizard evita overflow horizontal", async () => {
    render(
      <MemoryRouter>
        <SellerCustomization />
      </MemoryRouter>,
    );
    const wizard = await screen.findByTestId("customization-wizard");
    expect(wizard.className).toMatch(/overflow-x-hidden/);
  });

  it("indicador desktop lista as 5 etapas", async () => {
    render(
      <MemoryRouter>
        <SellerCustomization />
      </MemoryRouter>,
    );
    expect(await screen.findByTestId("customization-step-indicator")).toBeTruthy();
    expect(screen.getByTestId("customization-step-tab-1")).toBeTruthy();
    expect(screen.getByTestId("customization-step-tab-5")).toBeTruthy();
  });

  it("etapa capa expõe ações de banner", async () => {
    render(
      <MemoryRouter>
        <SellerCustomization />
      </MemoryRouter>,
    );
    await goToStep(3);
    expect(await screen.findByTestId("customization-banner-actions")).toBeTruthy();
    expect(screen.getByTestId("customization-add-banner")).toBeTruthy();
    expect(screen.getByTestId("customization-predefined-banners")).toBeTruthy();
    expect(screen.getByTestId("customization-upload-own-banner")).toBeTruthy();
  });

  it("SellerCustomization orquestra wizard sem seções numeradas antigas", () => {
    const src = readFileSync(
      join(process.cwd(), "src/pages/seller/SellerCustomization.tsx"),
      "utf8",
    );
    expect(src).toContain("CustomizationWizard");
    expect(src).toContain("AdvancedSettingsSection");
    expect(src).not.toContain("12. Seções visíveis");
    expect(src).not.toContain("11. Paleta global de cores");
  });
});
