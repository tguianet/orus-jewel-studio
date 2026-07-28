import { useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { SellerLayout } from "@/layouts/SellerLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  StoreCustomization,
  StoreTheme,
  defaultTheme,
  loadCurrentSellerStore,
  saveStoreCustomization,
  uploadStoreAsset,
} from "@/lib/storeTheme";
import { useAuth } from "@/contexts/AuthContext";
import type { StoreTemplateKey } from "@/components/store/templates/types";
import { normalizeStoreTemplateKey } from "@/components/store/templates/types";
import { CustomizationWizard } from "@/components/seller/customization/CustomizationWizard";
import { AdvancedSettingsSection } from "@/components/seller/customization/AdvancedSettingsSection";
import type { CustomizationStepId } from "@/components/seller/customization/customizationCopy";

const SellerCustomization = () => {
  const { profile } = useAuth();
  const [store, setStore] = useState<StoreCustomization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"banner" | "logo" | null>(null);
  const [step, setStep] = useState<CustomizationStepId>(1);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [theme, setTheme] = useState<StoreTheme>(defaultTheme);
  const [templateKey, setTemplateKey] = useState<StoreTemplateKey>("elegance");

  useEffect(() => {
    loadCurrentSellerStore(profile?.storeId || undefined).then((s) => {
      if (s) {
        setStore(s);
        setName(s.storeName);
        setSlug(s.storeSlug);
        setPhone(s.contactPhone || "");
        setTheme({ ...defaultTheme, ...s.theme });
        setTemplateKey(normalizeStoreTemplateKey(s.templateKey));
      }
      setLoading(false);
    });
  }, [profile?.storeId]);

  const handleUpload = async (kind: "banner" | "logo", file?: File | null) => {
    if (!file || !store) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo grande demais (máx 5MB).");
      return;
    }
    try {
      setUploading(kind);
      const url = await uploadStoreAsset(store.id, kind, file);
      let nextTheme: StoreTheme = theme;
      setTheme((t) => {
        if (kind === "logo") {
          nextTheme = { ...t, logoUrl: url };
        } else {
          const list = [...(t.bannerUrls || (t.bannerUrl ? [t.bannerUrl] : []))];
          list.push(url);
          nextTheme = { ...t, bannerUrl: list[0], bannerUrls: list };
        }
        return nextTheme;
      });
      try {
        await saveStoreCustomization(store.id, { theme: nextTheme });
        toast.success(`${kind === "banner" ? "Imagem" : "Logo"} salva na loja.`);
      } catch {
        toast.error("Enviado, mas falhou ao salvar. Clique em Salvar minha loja.");
      }
    } catch {
      toast.error("Falha no upload.");
    } finally {
      setUploading(null);
    }
  };

  const removeBanner = async (idx: number) => {
    const list = [...(theme.bannerUrls || (theme.bannerUrl ? [theme.bannerUrl] : []))];
    list.splice(idx, 1);
    const nextTheme: StoreTheme = { ...theme, bannerUrl: list[0], bannerUrls: list };
    setTheme(nextTheme);
    if (!store) return;
    try {
      await saveStoreCustomization(store.id, { theme: nextTheme });
      toast.success("Banner removido.");
    } catch {
      toast.error("Falha ao remover banner.");
    }
  };

  const handleSave = async () => {
    if (!store) return;
    try {
      setSaving(true);
      await saveStoreCustomization(store.id, {
        storeName: name.trim(),
        storeSlug: slug.trim(),
        contactPhone: phone.trim(),
        theme,
      });
      toast.success("Loja salva com sucesso!");
    } catch {
      toast.error("Não foi possível salvar.");
    } finally {
      setSaving(false);
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
        <PageHeader title="Personalizar loja" description="Nenhuma loja aprovada encontrada." />
      </SellerLayout>
    );
  }

  return (
    <SellerLayout>
      <PageHeader
        eyebrow="Sua loja"
        title="Personalizar loja"
        description="Siga as etapas para deixar a loja com a sua cara. Sem termos técnicos."
        actions={
          <Link to={`/loja/${store.storeSlug}`} target="_blank">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4" /> Abrir loja
            </Button>
          </Link>
        }
      />

      <div className="space-y-6 max-w-3xl overflow-x-hidden">
        <CustomizationWizard
          step={step}
          onStepChange={setStep}
          storeId={store.id}
          storeName={store.storeName}
          storeSlug={slug || store.storeSlug}
          name={name}
          onNameChange={setName}
          phone={phone}
          onPhoneChange={setPhone}
          theme={theme}
          onThemeChange={setTheme}
          templateKey={templateKey}
          onTemplateKeyChange={setTemplateKey}
          uploading={uploading}
          onUploadLogo={(file) => void handleUpload("logo", file)}
          onUploadBanner={(file) => void handleUpload("banner", file)}
          onRemoveBanner={(idx) => void removeBanner(idx)}
          onPersistTheme={async (next) => {
            await saveStoreCustomization(store.id, { theme: next });
          }}
          saving={saving}
          onSave={() => void handleSave()}
        />

        <AdvancedSettingsSection
          name={name}
          slug={slug}
          onSlugChange={setSlug}
          theme={theme}
          onThemeChange={setTheme}
        />
      </div>
    </SellerLayout>
  );
};

export default SellerCustomization;
