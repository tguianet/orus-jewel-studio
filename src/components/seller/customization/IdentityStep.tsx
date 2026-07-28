import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { OrusLogo } from "@/components/OrusLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StoreTheme } from "@/lib/storeTheme";
import { defaultTheme } from "@/lib/storeTheme";
import {
  CUSTOMIZATION_STEPS,
  READY_COLOR_PRESETS,
  findReadyPresetByColors,
} from "./customizationCopy";

type Props = {
  name: string;
  onNameChange: (value: string) => void;
  theme: StoreTheme;
  onThemeChange: (theme: StoreTheme) => void;
  uploadingLogo: boolean;
  onUploadLogo: (file?: File | null) => void;
  onContinue: () => void;
  onBack: () => void;
};

export function IdentityStep({
  name,
  onNameChange,
  theme,
  onThemeChange,
  uploadingLogo,
  onUploadLogo,
  onContinue,
  onBack,
}: Props) {
  const logoRef = useRef<HTMLInputElement>(null);
  const primary = theme.primaryColor || defaultTheme.primaryColor!;
  const matched = findReadyPresetByColors(theme.primaryColor, theme.secondaryColor);
  const [showCustomColor, setShowCustomColor] = useState(!matched && !!theme.primaryColor);

  const meta = CUSTOMIZATION_STEPS[1];

  return (
    <section className="space-y-5" data-testid="customization-step-identity">
      <div>
        <h2 className="font-display text-2xl">{meta.title}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Nome, logo e uma cor principal — o essencial para a loja parecer sua.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <Label htmlFor="wizard-store-name">Nome da loja</Label>
          <Input
            id="wizard-store-name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            maxLength={60}
            className="mt-1.5"
            placeholder="Ex.: Joias da Ana"
            data-testid="customization-store-name"
          />
        </div>

        <div>
          <Label>Logo</Label>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <div className="h-24 w-24 rounded-xl overflow-hidden border border-border bg-muted flex items-center justify-center">
              {theme.logoUrl ? (
                <img src={theme.logoUrl} alt="Logo da loja" className="w-full h-full object-contain" />
              ) : (
                <OrusLogo showWord={false} size="lg" />
              )}
            </div>
            <input
              ref={logoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onUploadLogo(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => logoRef.current?.click()}
              disabled={uploadingLogo}
              data-testid="customization-upload-logo"
            >
              {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              {theme.logoUrl ? "Trocar logo" : "Enviar logo"}
            </Button>
          </div>
        </div>

        <div>
          <Label>Cor principal</Label>
          <p className="text-xs text-muted-foreground mt-1 mb-3">
            Escolha uma combinação pronta. Ela destaca botões e detalhes da loja.
          </p>
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3">
            {READY_COLOR_PRESETS.map((preset) => {
              const active = matched?.id === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setShowCustomColor(false);
                    onThemeChange({
                      ...theme,
                      primaryColor: preset.primary,
                      secondaryColor: preset.secondary,
                    });
                  }}
                  className={`text-left rounded-xl border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "border-border hover:border-primary/40"
                  }`}
                  data-testid={`customization-color-${preset.id}`}
                  aria-pressed={active}
                >
                  <div className="flex h-10 rounded-md overflow-hidden mb-2 border border-border/60">
                    {preset.swatches.map((c) => (
                      <span key={c} className="flex-1" style={{ background: c }} />
                    ))}
                  </div>
                  <p className="text-sm font-medium">{preset.name}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-3">
            {!showCustomColor ? (
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setShowCustomColor(true)}
                data-testid="customization-custom-color-toggle"
              >
                Escolher outra cor
              </Button>
            ) : (
              <div className="rounded-lg border border-border p-3 space-y-2" data-testid="customization-custom-color">
                <Label htmlFor="wizard-custom-primary">Sua cor</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="wizard-custom-primary"
                    type="color"
                    value={primary}
                    onChange={(e) => onThemeChange({ ...theme, primaryColor: e.target.value })}
                    className="h-11 w-14 p-1"
                  />
                  <Input
                    value={primary}
                    onChange={(e) => onThemeChange({ ...theme, primaryColor: e.target.value })}
                    aria-label="Código da cor"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
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
