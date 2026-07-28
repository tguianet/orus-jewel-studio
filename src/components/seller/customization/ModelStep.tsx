import { StoreTemplatePickerSection } from "@/components/seller/StoreTemplatePickerSection";
import type { StoreTheme } from "@/lib/storeTheme";
import type { StoreTemplateKey } from "@/components/store/templates/types";
import { Button } from "@/components/ui/button";
import { CUSTOMIZATION_STEPS } from "./customizationCopy";

type Props = {
  storeId: string;
  storeName: string;
  storeSlug: string;
  phone?: string | null;
  theme: StoreTheme;
  templateKey: string;
  onTemplateKeyChange: (key: StoreTemplateKey) => void;
  onContinue: () => void;
};

export function ModelStep({
  storeId,
  storeName,
  storeSlug,
  phone,
  theme,
  templateKey,
  onTemplateKeyChange,
  onContinue,
}: Props) {
  const meta = CUSTOMIZATION_STEPS[0];

  return (
    <section className="space-y-5" data-testid="customization-step-model">
      <div>
        <h2 className="font-display text-2xl">{meta.title}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Escolha um visual pronto. Seus produtos e dados da loja são mantidos.
        </p>
      </div>

      <StoreTemplatePickerSection
        storeId={storeId}
        storeName={storeName}
        storeSlug={storeSlug}
        phone={phone}
        theme={theme}
        templateKey={templateKey}
        onTemplateKeyChange={onTemplateKeyChange}
        title="Escolha o estilo da sua loja"
        description="Toque em Visualizar para ver como fica, depois escolha o modelo."
        chooseLabel="Escolher este modelo"
        hideOuterTitle
      />

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
    </section>
  );
}
