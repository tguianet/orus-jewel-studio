import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { StoreTemplateRenderer } from "@/components/store/templates/StoreTemplateRenderer";
import { defaultTheme } from "@/lib/storeTheme";
import type { StoreHeroSlide } from "@/lib/storeHeroSlides";
import type { CloudStoreProduct } from "@/lib/cloudStore";

const store = {
  id: "s1",
  profileId: "",
  parentId: null,
  name: "Loja",
  storeName: "Loja Demo",
  storeSlug: "loja-demo",
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
};

const heroSlides: StoreHeroSlide[] = [
  {
    id: "campaign-1",
    kind: "campaign",
    imageUrl: "https://cdn/campaign-desktop.jpg",
    mobileImageUrl: "https://cdn/campaign-mobile.jpg",
    title: "Brilho da Rede",
    subtitle: "Oferta oficial",
    buttonText: "Ver agora",
    buttonUrl: "https://amadaamante.com.br",
  },
  {
    id: "seller-1",
    kind: "seller",
    imageUrl: "https://cdn/own.jpg",
  },
];

const baseProps = {
  store,
  theme: defaultTheme,
  banners: heroSlides.map((s) => s.imageUrl),
  heroSlides,
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

describe("campanhas globais nos templates", () => {
  it.each(["elegance", "boutique", "minimal"] as const)(
    "template %s exibe selo oficial e campanha primeiro",
    async (key) => {
      render(
        <MemoryRouter>
          <StoreTemplateRenderer {...baseProps} templateKey={key} />
        </MemoryRouter>,
      );
      expect(await screen.findByTestId(`store-template-${key}`)).toBeTruthy();
      expect(await screen.findByTestId("store-hero-banner-layer")).toBeTruthy();
      expect(screen.getByTestId("official-campaign-badge").textContent).toMatch(
        /Campanha oficial Amada Amante/i,
      );
      const imgs = screen.getAllByRole("img");
      const campaignImg = imgs.find((img) => img.getAttribute("data-campaign") === "true");
      expect(campaignImg).toBeTruthy();
    },
  );

  it("desktop vs celular: preferMobile usa mobile_image_url", async () => {
    render(
      <MemoryRouter>
        <StoreTemplateRenderer
          {...baseProps}
          templateKey="minimal"
          previewMode
          previewViewport="mobile"
        />
      </MemoryRouter>,
    );
    await screen.findByTestId("store-template-minimal");
    const campaignImg = screen
      .getAllByRole("img")
      .find((img) => img.getAttribute("data-campaign") === "true");
    expect(campaignImg?.getAttribute("src")).toBe("https://cdn/campaign-mobile.jpg");
  });
});
