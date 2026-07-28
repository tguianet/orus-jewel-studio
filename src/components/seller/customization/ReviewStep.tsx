import { useEffect, useMemo, useState } from "react";
import { Loader2, Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StoreTemplateRenderer } from "@/components/store/templates/StoreTemplateRenderer";
import { getStoreTemplateMeta } from "@/components/store/templates/templateRegistry";
import { normalizeStoreTemplateKey, type StoreTemplateKey } from "@/components/store/templates/types";
import {
  DEFAULT_BANNER,
  defaultTheme,
  type StoreTheme,
} from "@/lib/storeTheme";
import {
  loadStoreProductsForTemplatePreview,
  type CloudStoreProduct,
} from "@/lib/cloudStore";
import type { Sacoleira } from "@/types/commerce";
import heroImg from "@/assets/hero-jewelry.jpg";
import { OrusLogo } from "@/components/OrusLogo";
import {
  CUSTOMIZATION_STEPS,
  findReadyPresetByColors,
  templateDisplayName,
} from "./customizationCopy";

type Props = {
  storeId: string;
  storeName: string;
  storeSlug: string;
  phone: string;
  theme: StoreTheme;
  templateKey: string;
  saving: boolean;
  onSave: () => void;
  onBack: () => void;
  onGoToStep: (step: 1 | 2 | 3 | 4) => void;
};

export function ReviewStep({
  storeId,
  storeName,
  storeSlug,
  phone,
  theme,
  templateKey,
  saving,
  onSave,
  onBack,
  onGoToStep,
}: Props) {
  const meta = CUSTOMIZATION_STEPS[4];
  const key = normalizeStoreTemplateKey(templateKey) as StoreTemplateKey;
  const [device, setDevice] = useState<"desktop" | "mobile">("mobile");
  const [products, setProducts] = useState<CloudStoreProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [activeCategory, setActiveCategory] = useState("Todos");

  useEffect(() => {
    let alive = true;
    setLoadingProducts(true);
    void loadStoreProductsForTemplatePreview(storeId)
      .then((items) => {
        if (!alive) return;
        setProducts(items);
      })
      .catch(() => {
        if (!alive) return;
        setProducts([]);
      })
      .finally(() => {
        if (alive) setLoadingProducts(false);
      });
    return () => {
      alive = false;
    };
  }, [storeId]);

  const previewStore = useMemo<Sacoleira>(
    () => ({
      id: storeId,
      profileId: "",
      parentId: null,
      name: storeName,
      storeName,
      storeSlug,
      email: "",
      phone: phone || "",
      status: "approved",
      tier: "padrão",
      totalSpent: 0,
      ordersCount: 0,
      walletAvailable: 0,
      walletPending: 0,
      directReferrals: 0,
      networkSize: 0,
      templateKey: key,
    }),
    [storeId, storeName, storeSlug, phone, key],
  );

  const banners = useMemo(() => {
    const t = { ...defaultTheme, ...theme };
    const list = [
      ...((t.bannerUrls || []).filter(Boolean)),
      ...(t.bannerUrl && !(t.bannerUrls || []).includes(t.bannerUrl) ? [t.bannerUrl] : []),
    ];
    if (!list.length) list.push(DEFAULT_BANNER || heroImg);
    return list;
  }, [theme]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.category && set.add(p.category));
    return ["Todos", ...Array.from(set)];
  }, [products]);

  const collections = useMemo(
    () => categories.filter((c) => c !== "Todos").slice(0, 6),
    [categories],
  );

  const filteredProducts = useMemo(() => {
    if (activeCategory === "Todos") return products;
    return products.filter((p) => p.category === activeCategory);
  }, [products, activeCategory]);

  const colorLabel =
    findReadyPresetByColors(theme.primaryColor, theme.secondaryColor)?.name
    || theme.primaryColor
    || "Padrão";

  const blockNav = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <section className="space-y-5" data-testid="customization-step-review">
      <div>
        <h2 className="font-display text-2xl">{meta.title}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Veja como ficou e salve quando estiver pronta.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={device === "mobile" ? "gold" : "outline"}
            onClick={() => setDevice("mobile")}
            data-testid="customization-preview-mobile"
          >
            <Smartphone className="h-3.5 w-3.5" /> Celular
          </Button>
          <Button
            type="button"
            size="sm"
            variant={device === "desktop" ? "gold" : "outline"}
            onClick={() => setDevice("desktop")}
            data-testid="customization-preview-desktop"
          >
            <Monitor className="h-3.5 w-3.5" /> Computador
          </Button>
        </div>

        <div
          className="overflow-x-hidden bg-muted/40 rounded-lg p-3 flex justify-center"
          data-testid="customization-review-preview"
        >
          <div
            className={`bg-background shadow border overflow-x-hidden ${
              device === "mobile"
                ? "w-[min(100%,375px)] max-w-[390px] max-h-[70vh] overflow-y-auto rounded-[1.25rem]"
                : "w-full max-w-4xl max-h-[70vh] overflow-y-auto rounded-lg"
            }`}
            data-preview-device={device}
            onClickCapture={blockNav}
            onSubmitCapture={blockNav}
          >
            <div className="pointer-events-none select-none overflow-x-hidden min-w-0 w-full">
              <StoreTemplateRenderer
                templateKey={key}
                store={previewStore}
                theme={{ ...defaultTheme, ...theme }}
                banners={banners}
                products={products}
                filteredProducts={filteredProducts}
                categories={categories}
                collections={collections}
                activeCategory={activeCategory}
                onActiveCategoryChange={setActiveCategory}
                query=""
                productsLoading={loadingProducts}
                productsError={null}
                previewMode
                previewViewport={device}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-3" data-testid="customization-review-summary">
        <h3 className="font-display text-xl">Resumo</h3>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground text-xs">Modelo</dt>
            <dd className="font-medium">{templateDisplayName(key)} · {getStoreTemplateMeta(key).name}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Nome</dt>
            <dd className="font-medium">{storeName || "—"}</dd>
          </div>
          <div className="flex items-center gap-2">
            <div>
              <dt className="text-muted-foreground text-xs">Logo</dt>
              <dd className="font-medium">{theme.logoUrl ? "Enviada" : "Padrão"}</dd>
            </div>
            <div className="h-10 w-10 rounded border border-border overflow-hidden bg-muted">
              {theme.logoUrl ? (
                <img src={theme.logoUrl} alt="" className="h-full w-full object-contain" />
              ) : (
                <OrusLogo showWord={false} size="sm" />
              )}
            </div>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Cor</dt>
            <dd className="font-medium flex items-center gap-2">
              <span className="h-4 w-4 rounded-full border border-border" style={{ background: theme.primaryColor || "#d4a747" }} />
              {colorLabel}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Banner</dt>
            <dd className="font-medium">{banners.length ? `${banners.length} imagem(ns)` : "Padrão"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">WhatsApp</dt>
            <dd className="font-medium">{phone || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Instagram</dt>
            <dd className="font-medium">{theme.instagram ? `@${theme.instagram}` : "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground text-xs">Apresentação</dt>
            <dd className="font-medium">{theme.description || "—"}</dd>
          </div>
        </dl>
        <Button type="button" variant="outline" size="sm" onClick={() => onGoToStep(1)}>
          Voltar e ajustar
        </Button>
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-2">
        <Button type="button" variant="outline" size="lg" className="w-full min-h-12" onClick={onBack} disabled={saving}>
          Voltar
        </Button>
        <Button
          type="button"
          variant="gold"
          size="lg"
          className="w-full min-h-12 text-base"
          onClick={onSave}
          disabled={saving}
          data-testid="customization-save"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Salvar minha loja
        </Button>
      </div>
    </section>
  );
}
