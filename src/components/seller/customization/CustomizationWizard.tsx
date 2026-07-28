import { CustomizationStepIndicator } from "./CustomizationStepIndicator";
import { ModelStep } from "./ModelStep";
import { IdentityStep } from "./IdentityStep";
import { CoverStep } from "./CoverStep";
import { ContactStep } from "./ContactStep";
import { ReviewStep } from "./ReviewStep";
import type { CustomizationStepId } from "./customizationCopy";
import type { StoreTheme } from "@/lib/storeTheme";
import type { StoreTemplateKey } from "@/components/store/templates/types";

type Props = {
  step: CustomizationStepId;
  onStepChange: (step: CustomizationStepId) => void;
  storeId: string;
  storeName: string;
  storeSlug: string;
  name: string;
  onNameChange: (value: string) => void;
  phone: string;
  onPhoneChange: (value: string) => void;
  theme: StoreTheme;
  onThemeChange: (theme: StoreTheme) => void;
  templateKey: string;
  onTemplateKeyChange: (key: StoreTemplateKey) => void;
  uploading: "banner" | "logo" | null;
  onUploadLogo: (file?: File | null) => void;
  onUploadBanner: (file?: File | null) => void;
  onRemoveBanner: (index: number) => void;
  onPersistTheme: (theme: StoreTheme) => Promise<void>;
  saving: boolean;
  onSave: () => void;
};

export function CustomizationWizard({
  step,
  onStepChange,
  storeId,
  storeName,
  storeSlug,
  name,
  onNameChange,
  phone,
  onPhoneChange,
  theme,
  onThemeChange,
  templateKey,
  onTemplateKeyChange,
  uploading,
  onUploadLogo,
  onUploadBanner,
  onRemoveBanner,
  onPersistTheme,
  saving,
  onSave,
}: Props) {
  const go = (next: CustomizationStepId) => onStepChange(next);

  return (
    <div className="space-y-2 overflow-x-hidden" data-testid="customization-wizard">
      <CustomizationStepIndicator
        current={step}
        onGoTo={(s) => {
          if (s <= step) go(s);
        }}
      />

      {step === 1 && (
        <ModelStep
          storeId={storeId}
          storeName={name || storeName}
          storeSlug={storeSlug}
          phone={phone}
          theme={theme}
          templateKey={templateKey}
          onTemplateKeyChange={onTemplateKeyChange}
          onContinue={() => go(2)}
        />
      )}

      {step === 2 && (
        <IdentityStep
          name={name}
          onNameChange={onNameChange}
          theme={theme}
          onThemeChange={onThemeChange}
          uploadingLogo={uploading === "logo"}
          onUploadLogo={onUploadLogo}
          onContinue={() => go(3)}
          onBack={() => go(1)}
        />
      )}

      {step === 3 && (
        <CoverStep
          theme={theme}
          onThemeChange={onThemeChange}
          uploadingBanner={uploading === "banner"}
          onUploadBanner={onUploadBanner}
          onRemoveBanner={onRemoveBanner}
          onPersistTheme={onPersistTheme}
          onContinue={() => go(4)}
          onBack={() => go(2)}
        />
      )}

      {step === 4 && (
        <ContactStep
          phone={phone}
          onPhoneChange={onPhoneChange}
          theme={theme}
          onThemeChange={onThemeChange}
          onContinue={() => go(5)}
          onBack={() => go(3)}
        />
      )}

      {step === 5 && (
        <ReviewStep
          storeId={storeId}
          storeName={name || storeName}
          storeSlug={storeSlug}
          phone={phone}
          theme={theme}
          templateKey={templateKey}
          saving={saving}
          onSave={onSave}
          onBack={() => go(4)}
          onGoToStep={(s) => go(s)}
        />
      )}
    </div>
  );
}
