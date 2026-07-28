import { useRef, useState } from "react";
import { ImageIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminBannerPickerDialog } from "@/components/seller/AdminBannerPickerDialog";
import { PREDEFINED_STORE_BANNERS_BUTTON_LABEL } from "@/lib/marketingBanners";
import { DEFAULT_BANNER, type StoreTheme } from "@/lib/storeTheme";
import { CUSTOMIZATION_STEPS } from "./customizationCopy";

type Props = {
  theme: StoreTheme;
  onThemeChange: (theme: StoreTheme) => void;
  uploadingBanner: boolean;
  onUploadBanner: (file?: File | null) => void;
  onRemoveBanner: (index: number) => void;
  onPersistTheme: (theme: StoreTheme) => Promise<void>;
  onContinue: () => void;
  onBack: () => void;
};

export function CoverStep({
  theme,
  onThemeChange,
  uploadingBanner,
  onUploadBanner,
  onRemoveBanner,
  onPersistTheme,
  onContinue,
  onBack,
}: Props) {
  const bannerRef = useRef<HTMLInputElement>(null);
  const [adminBannerPickerOpen, setAdminBannerPickerOpen] = useState(false);
  const bannerList =
    theme.bannerUrls && theme.bannerUrls.length
      ? theme.bannerUrls
      : theme.bannerUrl
        ? [theme.bannerUrl]
        : [];
  const primaryBanner = bannerList[0] || DEFAULT_BANNER;
  const meta = CUSTOMIZATION_STEPS[2];

  return (
    <section className="space-y-5" data-testid="customization-step-cover">
      <div>
        <h2 className="font-display text-2xl">{meta.title}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Use uma imagem horizontal. O sistema ajustará automaticamente.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="aspect-[16/7] rounded-lg overflow-hidden border border-border bg-muted">
          <img
            src={primaryBanner}
            alt="Imagem principal da loja"
            className="w-full h-full object-cover"
          />
        </div>

        {bannerList.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {bannerList.map((url, i) => (
              <div key={url + i} className="relative group aspect-[16/9] rounded-lg overflow-hidden border border-border bg-muted">
                <img src={url} alt={`Banner ${i + 1}`} className="w-full h-full object-cover" />
                <span className="absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0.5 rounded bg-background/80 border border-border">
                  #{i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveBanner(i)}
                  className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-background/90 border border-border opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:text-destructive"
                  aria-label="Remover banner"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          ref={bannerRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            onUploadBanner(e.target.files?.[0]);
            if (bannerRef.current) bannerRef.current.value = "";
          }}
        />

        <div className="space-y-2" data-testid="customization-banner-actions">
          <Button
            type="button"
            variant="outline"
            className="w-full min-h-11"
            onClick={() => bannerRef.current?.click()}
            disabled={uploadingBanner}
            data-testid="customization-add-banner"
          >
            {uploadingBanner ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {bannerList.length ? "Trocar imagem" : "Adicionar banner"}
          </Button>
          <Button
            type="button"
            variant="goldOutline"
            className="w-full h-auto min-h-10 whitespace-normal py-2.5 text-center leading-snug"
            onClick={() => setAdminBannerPickerOpen(true)}
            data-testid="customization-predefined-banners"
            aria-label={PREDEFINED_STORE_BANNERS_BUTTON_LABEL}
          >
            <ImageIcon className="h-4 w-4 shrink-0" />
            <span>{PREDEFINED_STORE_BANNERS_BUTTON_LABEL}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full min-h-11"
            onClick={() => bannerRef.current?.click()}
            disabled={uploadingBanner}
            data-testid="customization-upload-own-banner"
          >
            Enviar minha imagem
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Ou escolha um banner pronto acima.
          </p>
        </div>

        <AdminBannerPickerDialog
          open={adminBannerPickerOpen}
          onOpenChange={setAdminBannerPickerOpen}
          theme={theme}
          onThemeChange={onThemeChange}
          onPersist={onPersistTheme}
        />
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-2">
        <Button type="button" variant="outline" size="lg" className="w-full min-h-12" onClick={onBack}>
          Voltar
        </Button>
        <Button
          type="button"
          variant="gold"
          size="lg"
          className="w-full min-h-12 text-base"
          onClick={onContinue}
          data-testid="customization-continue"
        >
          Continuar
        </Button>
      </div>
    </section>
  );
}
