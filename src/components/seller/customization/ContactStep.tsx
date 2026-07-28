import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { StoreTheme } from "@/lib/storeTheme";
import {
  CUSTOMIZATION_STEPS,
  DESCRIPTION_SUGGESTIONS,
} from "./customizationCopy";

type Props = {
  phone: string;
  onPhoneChange: (value: string) => void;
  theme: StoreTheme;
  onThemeChange: (theme: StoreTheme) => void;
  onContinue: () => void;
  onBack: () => void;
};

export function ContactStep({
  phone,
  onPhoneChange,
  theme,
  onThemeChange,
  onContinue,
  onBack,
}: Props) {
  const meta = CUSTOMIZATION_STEPS[3];

  return (
    <section className="space-y-5" data-testid="customization-step-contact">
      <div>
        <h2 className="font-display text-2xl">{meta.title}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Deixe claro como falar com você e uma frase curta sobre a loja.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <Label htmlFor="wizard-whatsapp">WhatsApp</Label>
          <Input
            id="wizard-whatsapp"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="(11) 99999-9999"
            className="mt-1.5"
            data-testid="customization-whatsapp"
          />
        </div>
        <div>
          <Label htmlFor="wizard-instagram">Instagram</Label>
          <Input
            id="wizard-instagram"
            value={theme.instagram || ""}
            onChange={(e) =>
              onThemeChange({ ...theme, instagram: e.target.value.replace(/^@/, "") })
            }
            placeholder="@sualoja"
            className="mt-1.5"
            data-testid="customization-instagram"
          />
        </div>
        <div>
          <Label htmlFor="wizard-description">Apresentação</Label>
          <p className="text-xs text-muted-foreground mt-1 mb-2">
            Uma frase curta. Toque em uma sugestão se preferir.
          </p>
          <div className="flex flex-wrap gap-2 mb-2">
            {DESCRIPTION_SUGGESTIONS.map((s) => (
              <Button
                key={s.id}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onThemeChange({ ...theme, description: s.text })}
                data-testid={`customization-desc-${s.id}`}
              >
                {s.label}
              </Button>
            ))}
          </div>
          <Textarea
            id="wizard-description"
            value={theme.description || ""}
            onChange={(e) => onThemeChange({ ...theme, description: e.target.value })}
            rows={3}
            maxLength={240}
            placeholder="Conte em poucas palavras o diferencial da sua loja"
            className="mt-1.5"
            data-testid="customization-description"
          />
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
