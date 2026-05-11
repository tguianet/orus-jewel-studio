import { useEffect, useRef, useState } from "react";
import { Check, ExternalLink, ImagePlus, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { SellerLayout } from "@/layouts/SellerLayout";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { OrusLogo } from "@/components/OrusLogo";
import { toast } from "sonner";
import {
  DEFAULT_BANNER,
  StoreCustomization,
  StoreTheme,
  defaultTheme,
  loadCurrentSellerStore,
  saveStoreCustomization,
  uploadStoreAsset,
} from "@/lib/storeTheme";

type Palette = { name: string; primary: string; secondary: string; custom?: boolean };

const defaultPalettes: Palette[] = [
  { name: "Dourado clássico", primary: "#d4a747", secondary: "#f5e6c8" },
  { name: "Rosé elegante", primary: "#d4877a", secondary: "#f5d6cb" },
  { name: "Champanhe", primary: "#e8c97a", secondary: "#f8efd7" },
  { name: "Preto & nude", primary: "#c8b59c", secondary: "#e8dcc8" },
];

const CUSTOM_PALETTES_KEY = "aura:customPalettes";
const loadCustomPalettes = (): Palette[] => {
  try {
    const raw = localStorage.getItem(CUSTOM_PALETTES_KEY);
    return raw ? (JSON.parse(raw) as Palette[]) : [];
  } catch {
    return [];
  }
};
const saveCustomPalettes = (list: Palette[]) => {
  localStorage.setItem(CUSTOM_PALETTES_KEY, JSON.stringify(list));
};

import { useAuth } from "@/contexts/AuthContext";

const SellerCustomization = () => {
  const { profile } = useAuth();
  const [store, setStore] = useState<StoreCustomization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"banner" | "logo" | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [theme, setTheme] = useState<StoreTheme>(defaultTheme);
  const [customPalettes, setCustomPalettes] = useState<Palette[]>(() => loadCustomPalettes());
  const [newPaletteName, setNewPaletteName] = useState("");

  const bannerRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCurrentSellerStore(profile?.storeId || undefined).then((s) => {
      if (s) {
        setStore(s);
        setName(s.storeName);
        setSlug(s.storeSlug);
        setPhone(s.contactPhone || "");
        setTheme({ ...defaultTheme, ...s.theme });
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
      setTheme((t) => {
        if (kind === "logo") return { ...t, logoUrl: url };
        const list = [...(t.bannerUrls || (t.bannerUrl ? [t.bannerUrl] : []))];
        list.push(url);
        return { ...t, bannerUrl: list[0], bannerUrls: list };
      });
      toast.success(`${kind === "banner" ? "Banner" : "Logo"} enviado.`);
    } catch (e) {
      toast.error("Falha no upload.");
    } finally {
      setUploading(null);
    }
  };

  const removeBanner = (idx: number) => {
    setTheme((t) => {
      const list = [...(t.bannerUrls || (t.bannerUrl ? [t.bannerUrl] : []))];
      list.splice(idx, 1);
      return { ...t, bannerUrl: list[0], bannerUrls: list };
    });
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
      toast.success("Personalização salva!");
    } catch {
      toast.error("Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  const bannerList = (theme.bannerUrls && theme.bannerUrls.length ? theme.bannerUrls : (theme.bannerUrl ? [theme.bannerUrl] : []));
  const banner = bannerList[0] || DEFAULT_BANNER;
  const primary = theme.primaryColor || defaultTheme.primaryColor!;
  const secondary = theme.secondaryColor || defaultTheme.secondaryColor!;

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
        eyebrow="Identidade"
        title="Personalizar loja"
        description="Deixe sua loja virtual com a sua cara — banner, logo, cores e dados de contato."
        actions={
          <Link to={`/loja/${store.storeSlug}`} target="_blank">
            <Button variant="outline" size="sm"><ExternalLink className="h-4 w-4" /> Ver loja</Button>
          </Link>
        }
      />

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Form */}
        <div className="space-y-5">
          {/* Banner */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-xl">Banners da loja</h3>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">1600 × 500 px · rotativo</span>
            </div>
            <p className="text-xs text-muted-foreground -mt-1">
              Envie 2 ou mais imagens para criar um banner rotativo automático na sua loja.
            </p>
            {bannerList.length === 0 ? (
              <div className="aspect-[16/5] rounded-lg overflow-hidden border border-border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                Nenhum banner enviado
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {bannerList.map((url, i) => (
                  <div key={url + i} className="relative group aspect-[16/9] rounded-lg overflow-hidden border border-border bg-muted">
                    <img src={url} alt={`Banner ${i + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0.5 rounded bg-background/80 border border-border">
                      #{i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeBanner(i)}
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
              onChange={(e) => { handleUpload("banner", e.target.files?.[0]); if (bannerRef.current) bannerRef.current.value = ""; }}
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => bannerRef.current?.click()}
              disabled={uploading === "banner"}
            >
              {uploading === "banner" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Adicionar banner
            </Button>
          </div>

          {/* Logo */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-xl">Logo</h3>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">400 × 400 px</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-24 w-24 rounded-xl overflow-hidden border border-border bg-muted flex items-center justify-center">
                {theme.logoUrl ? (
                  <img src={theme.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <OrusLogo showWord={false} size="lg" />
                )}
              </div>
              <input
                ref={logoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUpload("logo", e.target.files?.[0])}
              />
              <Button
                variant="outline"
                onClick={() => logoRef.current?.click()}
                disabled={uploading === "logo"}
              >
                {uploading === "logo" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                Enviar logo
              </Button>
            </div>
          </div>

          {/* Dados */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-display text-xl">Dados da loja</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Nome da loja</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className="mt-1.5" />
              </div>
              <div>
                <Label>Slug (URL)</Label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                  maxLength={60}
                  className="mt-1.5"
                />
              </div>
            </div>
            <div>
              <Label>Descrição curta</Label>
              <Textarea
                value={theme.description || ""}
                onChange={(e) => setTheme({ ...theme, description: e.target.value })}
                rows={3}
                maxLength={240}
                placeholder="Conte em poucas palavras o diferencial da sua loja"
                className="mt-1.5"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>WhatsApp</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Instagram</Label>
                <Input
                  value={theme.instagram || ""}
                  onChange={(e) => setTheme({ ...theme, instagram: e.target.value.replace(/^@/, "") })}
                  placeholder="@sualoja"
                  className="mt-1.5"
                />
              </div>
            </div>
          </div>

          {/* Cores */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-xl">Paleta</h3>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {defaultPalettes.length + customPalettes.length} opções
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[...defaultPalettes, ...customPalettes].map((p) => {
                const active = p.primary.toLowerCase() === primary.toLowerCase()
                  && p.secondary.toLowerCase() === secondary.toLowerCase();
                return (
                  <div key={p.name} className="relative group">
                    <button
                      type="button"
                      onClick={() => {
                        setTheme({ ...theme, primaryColor: p.primary, secondaryColor: p.secondary });
                        toast.success(`Paleta "${p.name}" aplicada`);
                      }}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${active ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40"}`}
                    >
                      <div className="flex gap-1.5 mb-2">
                        <span className="h-8 flex-1 rounded" style={{ background: "#1a1410" }} />
                        <span className="h-8 flex-1 rounded" style={{ background: p.primary }} />
                        <span className="h-8 flex-1 rounded" style={{ background: p.secondary }} />
                      </div>
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        {active && <Check className="h-3.5 w-3.5 text-primary" />}
                        {p.name}
                        {p.custom && <span className="text-[10px] text-muted-foreground ml-auto">custom</span>}
                      </p>
                    </button>
                    {p.custom && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = customPalettes.filter((c) => c.name !== p.name);
                          setCustomPalettes(next);
                          saveCustomPalettes(next);
                          toast.success("Paleta removida");
                        }}
                        className="absolute top-2 right-2 h-6 w-6 rounded-full bg-background/80 border border-border opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:text-destructive"
                        aria-label="Remover paleta"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="rounded-lg border border-dashed border-border p-3 space-y-2">
              <Label className="text-xs">Salvar cores atuais como nova paleta</Label>
              <div className="flex gap-2">
                <Input
                  value={newPaletteName}
                  onChange={(e) => setNewPaletteName(e.target.value)}
                  placeholder="Nome da paleta"
                  maxLength={30}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const n = newPaletteName.trim();
                    if (!n) return toast.error("Dê um nome à paleta");
                    if ([...defaultPalettes, ...customPalettes].some((p) => p.name.toLowerCase() === n.toLowerCase())) {
                      return toast.error("Já existe uma paleta com esse nome");
                    }
                    const next = [...customPalettes, { name: n, primary, secondary, custom: true }];
                    setCustomPalettes(next);
                    saveCustomPalettes(next);
                    setNewPaletteName("");
                    toast.success("Paleta salva");
                  }}
                >
                  <Plus className="h-4 w-4" /> Criar
                </Button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Cor principal</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <Input
                    type="color"
                    value={primary}
                    onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                    className="h-10 w-14 p-1"
                  />
                  <Input
                    value={primary}
                    onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Cor secundária</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <Input
                    type="color"
                    value={secondary}
                    onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                    className="h-10 w-14 p-1"
                  />
                  <Input
                    value={secondary}
                    onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <Button variant="gold" size="lg" className="w-full" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar personalização
          </Button>
        </div>

        {/* Preview */}
        <div className="lg:sticky lg:top-6 self-start space-y-3">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Preview</p>
          <div className="rounded-xl border border-border overflow-hidden bg-background">
            <div className="relative aspect-[16/7]">
              <img src={banner} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: `linear-gradient(to top, hsl(var(--background)) 5%, transparent 70%)` }} />
            </div>
            <div className="px-5 -mt-10 relative">
              <div
                className="h-20 w-20 rounded-2xl border-2 overflow-hidden bg-card flex items-center justify-center"
                style={{ borderColor: primary }}
              >
                {theme.logoUrl ? (
                  <img src={theme.logoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <OrusLogo showWord={false} size="lg" />
                )}
              </div>
              <div className="mt-3 pb-5">
                <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: primary }}>
                  loja virtual
                </p>
                <h2 className="font-display text-2xl mt-1">{name || "Sua loja"}</h2>
                {theme.description && (
                  <p className="text-sm text-muted-foreground mt-2">{theme.description}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-4">
                  <span
                    className="inline-flex items-center text-xs px-3 py-1 rounded-full font-medium"
                    style={{ background: primary, color: "#1a1410" }}
                  >
                    Comprar agora
                  </span>
                  <span
                    className="inline-flex items-center text-xs px-3 py-1 rounded-full"
                    style={{ background: secondary, color: "#1a1410" }}
                  >
                    Coleção
                  </span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            URL pública: <span className="font-mono">/loja/{slug}</span>
          </p>
        </div>
      </div>
    </SellerLayout>
  );
};

export default SellerCustomization;
