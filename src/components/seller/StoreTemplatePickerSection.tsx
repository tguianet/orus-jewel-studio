import { useEffect, useMemo, useState } from "react";
import { Check, Eye, Loader2, Monitor, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StoreTemplateRenderer } from "@/components/store/templates/StoreTemplateRenderer";
import {
  listActiveStoreTemplates,
  getStoreTemplateMeta,
} from "@/components/store/templates/templateRegistry";
import {
  normalizeStoreTemplateKey,
  type StoreTemplateKey,
} from "@/components/store/templates/types";
import {
  updateStoreTemplateKey,
  type StoreTheme,
  defaultTheme,
  DEFAULT_BANNER,
} from "@/lib/storeTheme";
import { normalizeError, showAppError } from "@/lib/errors";
import {
  loadStoreProductsForTemplatePreview,
  type CloudStoreProduct,
} from "@/lib/cloudStore";
import type { Sacoleira } from "@/types/commerce";
import heroImg from "@/assets/hero-jewelry.jpg";

const CONFIRM_MESSAGE =
  "Deseja aplicar este modelo à sua loja? Seus produtos e configurações serão mantidos.";

type Props = {
  storeId: string;
  storeName: string;
  storeSlug: string;
  phone?: string | null;
  theme: StoreTheme;
  templateKey: string;
  onTemplateKeyChange: (key: StoreTemplateKey) => void;
};

export function StoreTemplatePickerSection({
  storeId,
  storeName,
  storeSlug,
  phone,
  theme,
  templateKey,
  onTemplateKeyChange,
}: Props) {
  const current = normalizeStoreTemplateKey(templateKey);
  const templates = listActiveStoreTemplates();
  const [previewKey, setPreviewKey] = useState<StoreTemplateKey | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [saving, setSaving] = useState(false);
  const [previewProducts, setPreviewProducts] = useState<CloudStoreProduct[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [loadedForStoreId, setLoadedForStoreId] = useState<string | null>(null);

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
      templateKey: previewKey || current,
    }),
    [storeId, storeName, storeSlug, phone, previewKey, current],
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
    previewProducts.forEach((p) => p.category && set.add(p.category));
    return ["Todos", ...Array.from(set)];
  }, [previewProducts]);

  const collections = useMemo(
    () => categories.filter((c) => c !== "Todos").slice(0, 6),
    [categories],
  );

  const filteredProducts = useMemo(() => {
    if (activeCategory === "Todos") return previewProducts;
    return previewProducts.filter((p) => p.category === activeCategory);
  }, [previewProducts, activeCategory]);

  // Carrega produtos reais uma vez por loja quando a prévia abre (reutiliza loadStoreProducts).
  useEffect(() => {
    if (!previewKey) return;
    if (loadedForStoreId === storeId) return;

    let alive = true;
    setPreviewLoading(true);
    setPreviewError(null);

    void loadStoreProductsForTemplatePreview(storeId)
      .then((items) => {
        if (!alive) return;
        setPreviewProducts(items);
        setLoadedForStoreId(storeId);
        setActiveCategory("Todos");
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setPreviewProducts([]);
        setPreviewError(
          err instanceof Error ? err.message : "Não foi possível carregar os produtos da prévia.",
        );
      })
      .finally(() => {
        // Sempre encerra loading (Strict Mode cancela o efeito sem abandonar o finally).
        setPreviewLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [previewKey, storeId, loadedForStoreId]);

  useEffect(() => {
    setLoadedForStoreId(null);
    setPreviewProducts([]);
  }, [storeId]);

  const applyTemplate = async (key: StoreTemplateKey) => {
    if (key === current) {
      toast.info("Este já é o modelo atual da sua loja.");
      return;
    }
    if (!window.confirm(CONFIRM_MESSAGE)) return;
    try {
      setSaving(true);
      await updateStoreTemplateKey(storeId, key);
      // UI só atualiza após sucesso
      onTemplateKeyChange(key);
      toast.success("Modelo aplicado com sucesso.");
      setPreviewKey(null);
    } catch (err) {
      const appError = normalizeError(err, {
        operation: "update_store_template",
        entityType: "seller_store",
        entityId: storeId,
        metadata: { template_key: key },
      });
      showAppError(appError);
    } finally {
      setSaving(false);
    }
  };

  const blockPreviewNavigation = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <section
      className="rounded-xl border border-border bg-card p-6 space-y-4"
      data-testid="store-template-picker"
    >
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-display text-xl">Escolha o modelo da sua loja</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Visualize e aplique um layout pronto. Produtos, banners e cores são mantidos.
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Atual: {getStoreTemplateMeta(current).name}
        </span>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {templates.map((tpl) => {
          const active = tpl.key === current;
          return (
            <div
              key={tpl.key}
              className={`rounded-xl border overflow-hidden flex flex-col ${
                active ? "border-primary ring-2 ring-primary/25" : "border-border"
              }`}
              data-testid={`store-template-card-${tpl.key}`}
            >
              <div className="h-28" style={{ background: tpl.previewGradient }} aria-hidden />
              <div className="p-3 space-y-2 flex-1 flex flex-col">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm">{tpl.name}</p>
                  {active && (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-primary border border-primary/30 rounded-full px-2 py-0.5">
                      <Check className="h-3 w-3" /> Modelo atual
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{tpl.description}</p>
                <ul className="text-[11px] text-muted-foreground space-y-0.5">
                  {tpl.features.map((f) => (
                    <li key={f}>• {f}</li>
                  ))}
                </ul>
                <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPreviewDevice("desktop");
                      setPreviewKey(tpl.key);
                    }}
                    data-testid={`store-template-preview-${tpl.key}`}
                  >
                    <Eye className="h-3.5 w-3.5" /> Visualizar
                  </Button>
                  <Button
                    type="button"
                    variant="gold"
                    size="sm"
                    disabled={saving || active}
                    onClick={() => void applyTemplate(tpl.key)}
                    data-testid={`store-template-use-${tpl.key}`}
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Usar este modelo
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!previewKey} onOpenChange={(o) => !o && setPreviewKey(null)}>
        <DialogContent
          className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0"
          data-testid="store-template-preview-dialog"
        >
          <DialogHeader className="px-6 pt-6 pb-3 border-b border-border">
            <DialogTitle className="font-display text-2xl">
              Prévia — {previewKey ? getStoreTemplateMeta(previewKey).name : ""}
            </DialogTitle>
            <DialogDescription>
              Dados reais da sua loja. Fechar não altera o modelo publicado.
            </DialogDescription>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button
                type="button"
                size="sm"
                variant={previewDevice === "desktop" ? "gold" : "outline"}
                onClick={() => setPreviewDevice("desktop")}
              >
                <Monitor className="h-3.5 w-3.5" /> Desktop
              </Button>
              <Button
                type="button"
                size="sm"
                variant={previewDevice === "mobile" ? "gold" : "outline"}
                onClick={() => setPreviewDevice("mobile")}
              >
                <Smartphone className="h-3.5 w-3.5" /> Celular
              </Button>
              {previewKey && previewKey !== current && (
                <Button
                  type="button"
                  size="sm"
                  variant="goldOutline"
                  className="ml-auto"
                  disabled={saving}
                  onClick={() => void applyTemplate(previewKey)}
                >
                  Usar este modelo
                </Button>
              )}
            </div>
          </DialogHeader>
          <div
            className="flex-1 overflow-y-auto bg-muted/40 p-4 flex justify-center"
            data-testid="store-template-preview-scroll"
          >
            <div
              className={`mx-auto bg-background shadow-lg border overflow-x-hidden ${
                previewDevice === "mobile"
                  ? "w-[375px] max-w-[min(100%,390px)] max-h-[70vh] overflow-y-auto rounded-[1.5rem]"
                  : "w-full max-w-4xl max-h-[70vh] overflow-y-auto rounded-lg"
              }`}
              data-testid="store-template-preview-frame"
              data-preview-device={previewDevice}
              data-preview-viewport={previewDevice === "mobile" ? "375" : "desktop"}
              data-preview-inert="true"
              data-preview-loading={previewLoading ? "true" : "false"}
              data-preview-product-count={String(previewProducts.length)}
              onClickCapture={blockPreviewNavigation}
              onSubmitCapture={blockPreviewNavigation}
            >
              {previewKey && (
                <div className="pointer-events-none select-none overflow-x-hidden min-w-0 w-full">
                  <StoreTemplateRenderer
                    templateKey={previewKey}
                    store={previewStore}
                    theme={{ ...defaultTheme, ...theme }}
                    banners={banners}
                    products={previewProducts}
                    filteredProducts={filteredProducts}
                    categories={categories}
                    collections={collections}
                    activeCategory={activeCategory}
                    onActiveCategoryChange={setActiveCategory}
                    query=""
                    productsLoading={previewLoading}
                    productsError={previewError}
                    previewMode
                    previewViewport={previewDevice}
                  />
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export { CONFIRM_MESSAGE };
