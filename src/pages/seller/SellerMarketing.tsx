import { useEffect, useState } from "react";
import { Check, Download, Instagram, Loader2, Plus, Trash2 } from "lucide-react";
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
import { CatalogProduct, loadCatalogForStore } from "@/lib/cloudStore";
import { formatBRL } from "@/lib/mockData";
import { MarketingBanner, loadMarketingBanners } from "@/lib/marketingBanners";

const SIZE = 1080;

const drawInstagramTile = async (opts: {
  imageUrl: string;
  productName: string;
  price: string;
  storeName: string;
  primary: string;
  secondary: string;
}): Promise<Blob> => {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;

  // background
  const grad = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  grad.addColorStop(0, opts.secondary);
  grad.addColorStop(1, "#ffffff");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // load image
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = opts.imageUrl;
  }).catch(() => null);

  // photo area (square inset)
  const pad = 80;
  const photoSize = SIZE - pad * 2 - 220;
  const px = pad;
  const py = pad;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(px, py, photoSize, photoSize);

  if (img) {
    // cover-fit
    const ratio = Math.max(photoSize / img.width, photoSize / img.height);
    const w = img.width * ratio;
    const h = img.height * ratio;
    ctx.save();
    ctx.beginPath();
    ctx.rect(px, py, photoSize, photoSize);
    ctx.clip();
    ctx.drawImage(img, px + (photoSize - w) / 2, py + (photoSize - h) / 2, w, h);
    ctx.restore();
  }

  // accent bar
  ctx.fillStyle = opts.primary;
  ctx.fillRect(px, py + photoSize + 24, photoSize, 6);

  // product name
  ctx.fillStyle = "#1a1410";
  ctx.font = "600 44px 'Helvetica Neue', Arial, sans-serif";
  ctx.textBaseline = "top";
  const nameY = py + photoSize + 50;
  const maxW = photoSize;
  const words = opts.productName.split(" ");
  let line = "";
  let y = nameY;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, px, y);
      y += 52;
      line = w;
    } else line = test;
  }
  if (line) ctx.fillText(line, px, y);

  // price
  ctx.fillStyle = opts.primary;
  ctx.font = "700 64px 'Helvetica Neue', Arial, sans-serif";
  ctx.fillText(opts.price, px, y + 70);

  // store name footer
  ctx.fillStyle = "#1a1410";
  ctx.font = "500 28px 'Helvetica Neue', Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(opts.storeName.toUpperCase(), SIZE - pad, SIZE - pad - 28);

  return new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.92));
};

const SellerMarketing = () => {
  const { profile } = useAuth();
  const [store, setStore] = useState<StoreCustomization | null>(null);
  const [theme, setTheme] = useState<StoreTheme>(defaultTheme);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [generating, setGenerating] = useState<string | null>(null);
  const [adminBanners, setAdminBanners] = useState<MarketingBanner[]>([]);

  useEffect(() => {
    (async () => {
      const [s, ab] = await Promise.all([
        loadCurrentSellerStore(profile?.storeId || undefined),
        loadMarketingBanners(true),
      ]);
      setAdminBanners(ab);
      if (s) {
        setStore(s);
        setTheme({ ...defaultTheme, ...s.theme });
        const list = await loadCatalogForStore(s.id);
        setProducts(list.filter((p) => p.selected));
      }
      setLoading(false);
    })();
  }, [profile?.storeId]);

  const bannerList = theme.bannerUrls && theme.bannerUrls.length
    ? theme.bannerUrls
    : (theme.bannerUrl ? [theme.bannerUrl] : []);

  const addAdminBanner = async (b: MarketingBanner) => {
    if (!store) return;
    if (bannerList.includes(b.imageUrl)) return toast.info("Esse banner já está na sua loja.");
    try {
      setUploading(b.id);
      const list = [...bannerList, b.imageUrl];
      const nextTheme: StoreTheme = { ...theme, bannerUrl: list[0], bannerUrls: list };
      setTheme(nextTheme);
      await saveStoreCustomization(store.id, { theme: nextTheme });
      toast.success("Banner adicionado à sua loja!");
    } catch {
      toast.error("Falha ao adicionar.");
    } finally {
      setUploading(null);
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

  const downloadInstagramImage = async (p: CatalogProduct) => {
    if (!store) return;
    try {
      setGenerating(p.id);
      const blob = await drawInstagramTile({
        imageUrl: p.image,
        productName: p.name,
        price: formatBRL(p.resellerPrice || p.suggestedPrice),
        storeName: store.storeName,
        primary: theme.primaryColor || defaultTheme.primaryColor!,
        secondary: theme.secondaryColor || defaultTheme.secondaryColor!,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `instagram-${p.code || p.id}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Imagem baixada!");
    } catch {
      toast.error("Não foi possível gerar a imagem.");
    } finally {
      setGenerating(null);
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

  return (
    <SellerLayout>
      <PageHeader
        eyebrow="Divulgação"
        title="Marketing"
        description="Escolha banners da rede para a sua loja e baixe imagens prontas para o Instagram Shop."
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
                <img src={url} alt={`Banner ${i + 1}`} className="w-full h-full object-cover" />
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

      {/* Galeria de banners do admin */}
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
        {adminBanners.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhum banner disponível no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {adminBanners.map((b) => {
              const inStore = bannerList.includes(b.imageUrl);
              return (
                <div key={b.id} className="rounded-lg border border-border bg-muted/30 overflow-hidden">
                  <div className="aspect-[16/5] bg-muted">
                    <img src={b.imageUrl} alt={b.title || "Banner"} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium truncate">{b.title || "Banner"}</p>
                    {inStore ? (
                      <Button variant="outline" size="sm" disabled>
                        <Check className="h-3.5 w-3.5" /> Na loja
                      </Button>
                    ) : (
                      <Button
                        variant="gold"
                        size="sm"
                        onClick={() => addAdminBanner(b)}
                        disabled={uploading === b.id}
                      >
                        {uploading === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
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


      {/* Instagram section */}
      <section className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-xl flex items-center gap-2">
            <Instagram className="h-5 w-5 text-primary" /> Imagens para o Instagram
          </h3>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            1080 × 1080 px
          </span>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          Baixe imagens prontas dos seus produtos com preço e marca, no formato ideal para o feed e o Instagram Shop.
        </p>

        {products.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Adicione produtos à sua loja para gerar imagens.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map((p) => (
              <div key={p.id} className="rounded-lg border border-border bg-muted/30 overflow-hidden flex flex-col">
                <div className="aspect-square bg-muted">
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-3 space-y-1 flex-1 flex flex-col">
                  <p className="text-sm font-medium line-clamp-2">{p.name}</p>
                  <p className="text-sm text-primary font-semibold">
                    {formatBRL(p.resellerPrice || p.suggestedPrice)}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-auto"
                    onClick={() => downloadInstagramImage(p)}
                    disabled={generating === p.id}
                  >
                    {generating === p.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    Baixar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </SellerLayout>
  );
};

export default SellerMarketing;
