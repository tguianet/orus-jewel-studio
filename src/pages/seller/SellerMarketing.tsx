import { useEffect, useMemo, useState } from "react";
import { Check, Download, Loader2, Plus, Trash2 } from "lucide-react";
import { SellerLayout } from "@/layouts/SellerLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  StoreCustomization,
  StoreTheme,
  defaultTheme,
  loadCurrentSellerStore,
  saveStoreCustomization,
} from "@/lib/storeTheme";
import {
  ImageFormat,
  MarketingBanner,
  loadImageFormats,
  loadMarketingBanners,
} from "@/lib/marketingBanners";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const BANNER_SLUG = "banner-loja";

const SellerMarketing = () => {
  const { profile } = useAuth();
  const [store, setStore] = useState<StoreCustomization | null>(null);
  const [theme, setTheme] = useState<StoreTheme>(defaultTheme);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [adminBanners, setAdminBanners] = useState<MarketingBanner[]>([]);
  const [formats, setFormats] = useState<ImageFormat[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    (async () => {
      const [s, ab, fmts] = await Promise.all([
        loadCurrentSellerStore(profile?.storeId || undefined),
        loadMarketingBanners({ onlyActive: true }),
        loadImageFormats(true),
      ]);
      setAdminBanners(ab);
      setFormats(fmts);
      if (s) {
        setStore(s);
        setTheme({ ...defaultTheme, ...s.theme });
      }
      setLoading(false);
    })();
  }, [profile?.storeId]);

  const bannerFormat = useMemo(() => formats.find((f) => f.slug === BANNER_SLUG) || null, [formats]);

  // Categorias de redes sociais (todas exceto o banner-loja)
  const socialFormats = useMemo(
    () => formats.filter((f) => f.slug !== BANNER_SLUG),
    [formats]
  );

  // Banners-loja disponíveis (galeria do admin)
  const storeBanners = useMemo(
    () => adminBanners.filter((b) => bannerFormat && b.formatId === bannerFormat.id),
    [adminBanners, bannerFormat]
  );

  // garante uma aba ativa válida
  useEffect(() => {
    if (!activeTab && socialFormats.length > 0) {
      setActiveTab(socialFormats[0].id);
    }
  }, [socialFormats, activeTab]);

  const tabImages = useMemo(
    () => adminBanners.filter((b) => b.formatId === activeTab),
    [adminBanners, activeTab]
  );

  const bannerList = theme.bannerUrls && theme.bannerUrls.length
    ? theme.bannerUrls
    : (theme.bannerUrl ? [theme.bannerUrl] : []);

  const addAdminBanner = async (b: MarketingBanner) => {
    if (!store) return;
    if (bannerList.includes(b.imageUrl)) return toast.info("Esse banner já está na sua loja.");
    try {
      setAdding(b.id);
      const list = [...bannerList, b.imageUrl];
      const nextTheme: StoreTheme = { ...theme, bannerUrl: list[0], bannerUrls: list };
      setTheme(nextTheme);
      await saveStoreCustomization(store.id, { theme: nextTheme });
      toast.success("Banner adicionado à sua loja!");
    } catch {
      toast.error("Falha ao adicionar.");
    } finally {
      setAdding(null);
    }
  };

  const removeBanner = async (idx: number) => {
    if (!store) return;
    const list = [...bannerList];
    list.splice(idx, 1);
    const nextTheme: StoreTheme = { ...theme, bannerUrl: list[0], bannerUrls: list };
    setTheme(nextTheme);
    try {
      await saveStoreCustomization(store.id, { theme: nextTheme });
      toast.success("Banner removido da loja.");
    } catch {
      toast.error("Falha ao remover.");
    }
  };

  const downloadImage = async (b: MarketingBanner) => {
    try {
      setDownloading(b.id);
      const res = await fetch(b.imageUrl);
      const blob = await res.blob();
      const ext = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safe = (b.title || "imagem").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      a.download = `${safe || "imagem"}-${b.id.slice(0, 6)}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Imagem baixada!");
    } catch {
      toast.error("Não foi possível baixar.");
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <SellerLayout>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
        </div>
      </SellerLayout>
    );
  }

  if (!store) {
    return (
      <SellerLayout>
        <PageHeader title="Marketing" description="Nenhuma loja aprovada encontrada." />
      </SellerLayout>
    );
  }

  const currentFormat = socialFormats.find((f) => f.id === activeTab);

  return (
    <SellerLayout>
      <PageHeader
        eyebrow="Divulgação"
        title="Marketing"
        description="Escolha banners da rede para a sua loja e baixe imagens prontas para suas redes sociais."
      />

      {/* Banners atualmente na loja */}
      <section className="rounded-xl border border-border bg-card p-6 space-y-4 mb-6">
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-xl">Banners da minha loja</h3>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {bannerList.length} ativo{bannerList.length === 1 ? "" : "s"} · rotativo
          </span>
        </div>
        {bannerList.length === 0 ? (
          <div className="aspect-[16/5] rounded-lg border border-dashed border-border bg-muted flex items-center justify-center text-xs text-muted-foreground">
            Nenhum banner ativo. Escolha um abaixo.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {bannerList.map((url, i) => (
              <div key={url + i} className="relative group aspect-[16/9] rounded-lg overflow-hidden border border-border bg-muted">
                <img src={url} alt={`Banner ${i + 1}`} className="w-full h-full object-cover cursor-zoom-in" onClick={() => setPreviewImage({ url, title: `Banner ${i + 1}` })} />
                <span className="absolute top-2 left-2 text-[10px] px-2 py-1 rounded bg-background/85 border border-border">
                  #{i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeBanner(i)}
                  className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/90 border border-border opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:text-destructive"
                  aria-label="Remover banner"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Galeria de banners de loja do admin */}
      <section className="rounded-xl border border-border bg-card p-6 space-y-4 mb-8">
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-xl">Banners disponíveis</h3>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Publicados pela administração
          </span>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          Adicione um ou mais banners da rede à sua loja. Eles aparecerão no carrossel da home automaticamente.
        </p>
        {storeBanners.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhum banner disponível no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {storeBanners.map((b) => {
              const inStore = bannerList.includes(b.imageUrl);
              return (
                <div key={b.id} className="rounded-lg border border-border bg-muted/30 overflow-hidden">
                  <div className="aspect-[16/5] bg-muted">
                    <img src={b.imageUrl} alt={b.title || "Banner"} className="w-full h-full object-cover cursor-zoom-in" onClick={() => setPreviewImage({ url: b.imageUrl, title: b.title || "Banner" })} />
                  </div>
                  <div className="p-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium truncate">{b.title || "Banner"}</p>
                    {inStore ? (
                      <Button variant="outline" size="sm" disabled>
                        <Check className="h-3.5 w-3.5" /> Na loja
                      </Button>
                    ) : (
                      <Button variant="gold" size="sm" onClick={() => addAdminBanner(b)} disabled={adding === b.id}>
                        {adding === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        Adicionar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Imagens para redes sociais — separadas por formato/categoria */}
      <section className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-xl">Imagens para redes sociais</h3>
          {currentFormat && (
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {currentFormat.width} × {currentFormat.height} px
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          Baixe as imagens publicadas pela administração para postar nas suas redes.
        </p>

        {socialFormats.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            A administração ainda não cadastrou formatos de redes sociais.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {socialFormats.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveTab(f.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs border transition-colors",
                    activeTab === f.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  {f.name}
                  <span className="ml-1.5 text-[10px] opacity-70">{f.width}×{f.height}</span>
                </button>
              ))}
            </div>

            {tabImages.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Nenhuma imagem disponível neste formato.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {tabImages.map((b) => (
                  <div key={b.id} className="rounded-lg border border-border bg-muted/30 overflow-hidden flex flex-col">
                    <div
                      className="bg-muted"
                      style={{ aspectRatio: currentFormat ? `${currentFormat.width} / ${currentFormat.height}` : "1 / 1" }}
                    >
                      <img src={b.imageUrl} alt={b.title || "Imagem"} className="w-full h-full object-cover cursor-zoom-in" onClick={() => setPreviewImage({ url: b.imageUrl, title: b.title || "Imagem" })} />
                    </div>
                    <div className="p-3 space-y-2 flex-1 flex flex-col">
                      <p className="text-sm font-medium line-clamp-2">{b.title || "Sem título"}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-auto"
                        onClick={() => downloadImage(b)}
                        disabled={downloading === b.id}
                      >
                        {downloading === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                        Baixar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </SellerLayout>
  );
};

export default SellerMarketing;
