import { useEffect, useState } from "react";
import { Check, ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ADMIN_BANNER_ADDED_TOAST,
  ADMIN_BANNER_DUPLICATE_TOAST,
  ADMIN_BANNERS_EMPTY_MESSAGE,
  appendAdminBannerToTheme,
  isAdminBannerAlreadyInStore,
  loadAvailableStoreBanners,
  type ImageFormat,
  type MarketingBanner,
} from "@/lib/marketingBanners";
import type { StoreTheme } from "@/lib/storeTheme";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme: StoreTheme;
  onThemeChange: (next: StoreTheme) => void;
  onPersist: (next: StoreTheme) => Promise<void>;
};

export function AdminBannerPickerDialog({
  open,
  onOpenChange,
  theme,
  onThemeChange,
  onPersist,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banners, setBanners] = useState<MarketingBanner[]>([]);
  const [format, setFormat] = useState<ImageFormat | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    loadAvailableStoreBanners().then((res) => {
      if (!mounted) return;
      setBanners(res.banners);
      setFormat(res.format);
      setError(res.error);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [open]);

  const handleUseBanner = async (banner: MarketingBanner) => {
    if (isAdminBannerAlreadyInStore(theme, banner.imageUrl)) {
      toast.info(ADMIN_BANNER_DUPLICATE_TOAST);
      return;
    }
    const result = appendAdminBannerToTheme(theme, banner.imageUrl);
    if (!result.ok) {
      toast.info(ADMIN_BANNER_DUPLICATE_TOAST);
      return;
    }
    try {
      setAddingId(banner.id);
      onThemeChange(result.theme);
      await onPersist(result.theme);
      toast.success(ADMIN_BANNER_ADDED_TOAST);
    } catch {
      toast.error("Não foi possível adicionar o banner.");
    } finally {
      setAddingId(null);
    }
  };

  const sizeLabel = format ? `${format.width} × ${format.height} px` : "Banner da loja";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[85vh] overflow-y-auto"
        data-testid="admin-banner-picker-dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Escolha um banner pronto</DialogTitle>
          <DialogDescription>
            Selecione um dos banners disponibilizados pela Amada Amante.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div
            className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"
            data-testid="admin-banner-picker-loading"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando banners…
          </div>
        )}

        {!loading && error && (
          <div
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            data-testid="admin-banner-picker-error"
          >
            {error}
          </div>
        )}

        {!loading && !error && banners.length === 0 && (
          <div
            className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground"
            data-testid="admin-banner-picker-empty"
          >
            {ADMIN_BANNERS_EMPTY_MESSAGE}
          </div>
        )}

        {!loading && !error && banners.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="admin-banner-picker-grid">
            {banners.map((b) => {
              const used = isAdminBannerAlreadyInStore(theme, b.imageUrl);
              return (
                <div
                  key={b.id}
                  className="rounded-xl border border-border bg-card overflow-hidden flex flex-col"
                  data-testid={`admin-banner-option-${b.id}`}
                >
                  <div className="aspect-[16/5] bg-muted">
                    <img
                      src={b.imageUrl}
                      alt={b.title || "Banner"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3 space-y-2 flex-1 flex flex-col">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{b.title || "Banner"}</p>
                      {(b.description || format?.description) && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {b.description || format?.description}
                        </p>
                      )}
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                        {sizeLabel}
                      </p>
                    </div>
                    {used ? (
                      <Button variant="outline" size="sm" className="mt-auto w-full" disabled>
                        <Check className="h-3.5 w-3.5" />
                        Já na loja
                      </Button>
                    ) : (
                      <Button
                        variant="gold"
                        size="sm"
                        className="mt-auto w-full"
                        disabled={addingId === b.id}
                        onClick={() => void handleUseBanner(b)}
                        data-testid={`admin-banner-use-${b.id}`}
                      >
                        {addingId === b.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ImageIcon className="h-3.5 w-3.5" />
                        )}
                        Usar este banner
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
