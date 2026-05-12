import { useEffect, useRef, useState } from "react";
import { Switch } from "@/components/ui/switch";
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
        toast.success(`${kind === "banner" ? "Banner" : "Logo"} salvo na loja.`);
      } catch {
        toast.error("Enviado, mas falhou ao salvar. Clique em Salvar personalização.");
      }
    } catch (e) {
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
        eyebrow="Personalização"
        title="Personalizar loja"
        description="Edite os textos, imagens e cores. Clique em 'Abrir loja' para ver o resultado."
        actions={
          <Link to={`/loja/${store.storeSlug}`} target="_blank">
            <Button variant="outline" size="sm"><ExternalLink className="h-4 w-4" /> Abrir loja</Button>
          </Link>
        }
      />

      <div className="space-y-5 max-w-3xl">

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
            <div>
              <Label>Cor de destaque (faixa superior / CTA)</Label>
              <div className="flex items-center gap-2 mt-1.5">
                <Input
                  type="color"
                  value={theme.accentColor || "#f4a78a"}
                  onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                  className="h-10 w-14 p-1"
                />
                <Input
                  value={theme.accentColor || "#f4a78a"}
                  onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Faixa superior (top bar) */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <h3 className="font-display text-xl">Faixa superior (top bar)</h3>
            <p className="text-xs text-muted-foreground -mt-1">A barra colorida que aparece acima do header.</p>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <Label>Texto à esquerda</Label>
                <Input value={theme.topBarLeftText || ""} onChange={(e) => setTheme({ ...theme, topBarLeftText: e.target.value })} placeholder="Atendimento ao cliente" maxLength={40} className="mt-1.5" />
              </div>
              <div>
                <Label>Texto central (promoção)</Label>
                <Input value={theme.topBarCenterText || ""} onChange={(e) => setTheme({ ...theme, topBarCenterText: e.target.value })} placeholder="Frete cortesia em todas as compras..." maxLength={80} className="mt-1.5" />
              </div>
              <div>
                <Label>Texto à direita</Label>
                <Input value={theme.topBarRightText || ""} onChange={(e) => setTheme({ ...theme, topBarRightText: e.target.value })} placeholder="Acessibilidade" maxLength={40} className="mt-1.5" />
              </div>
            </div>
          </div>

          {/* Categorias (estilo Vivara) */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <h3 className="font-display text-xl">Seção "Escolha por categorias"</h3>
            <p className="text-xs text-muted-foreground -mt-1">Título da grade circular de categorias logo abaixo do hero.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Título</Label>
                <Input value={theme.categoriesTitle || ""} onChange={(e) => setTheme({ ...theme, categoriesTitle: e.target.value })} placeholder={`Joias ${name}`} maxLength={60} className="mt-1.5" />
              </div>
              <div>
                <Label>Subtítulo</Label>
                <Input value={theme.categoriesSubtitle || ""} onChange={(e) => setTheme({ ...theme, categoriesSubtitle: e.target.value })} placeholder="Escolha por categorias" maxLength={60} className="mt-1.5" />
              </div>
            </div>

            <div>
              <Label>Cor de fundo desta seção</Label>
              <p className="text-[11px] text-muted-foreground mt-1">Altera apenas o fundo do bloco "Joias {name}". Escolha uma cor da paleta ou personalize.</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {[
                  { name: "Padrão", value: "" },
                  { name: "Branco suave", value: "#f8f7f5" },
                  { name: "Areia", value: "#f1ece2" },
                  { name: "Champanhe", value: "#f5ead2" },
                  { name: "Rosé", value: "#f7e6df" },
                  { name: "Cinza claro", value: "#ece8e1" },
                  { name: "Preto", value: "#111111" },
                  { name: "Nude escuro", value: "#1a1410" },
                ].map((c) => {
                  const active = (theme.categoriesBgColor || "") === c.value;
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setTheme({ ...theme, categoriesBgColor: c.value || undefined })}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-colors ${active ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40"}`}
                    >
                      <span className="h-4 w-4 rounded-full border border-border" style={{ background: c.value || "transparent" }} />
                      {c.name}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Input
                  type="color"
                  value={theme.categoriesBgColor || "#f8f7f5"}
                  onChange={(e) => setTheme({ ...theme, categoriesBgColor: e.target.value })}
                  className="h-10 w-14 p-1"
                />
                <Input
                  value={theme.categoriesBgColor || ""}
                  onChange={(e) => setTheme({ ...theme, categoriesBgColor: e.target.value || undefined })}
                  placeholder="#f8f7f5 (vazio = padrão)"
                />
              </div>
            </div>
          </div>

          {/* Cores do Header / Menu */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <h3 className="font-display text-xl">Cores do menu (header)</h3>
            <p className="text-xs text-muted-foreground -mt-1">Altera o fundo e a cor dos textos da barra do menu (logo, links, busca e ícones).</p>

            <div>
              <Label>Cor de fundo do menu</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {[
                  { name: "Padrão", value: "" },
                  { name: "Branco suave", value: "#f8f7f5" },
                  { name: "Areia", value: "#f1ece2" },
                  { name: "Champanhe", value: "#f5ead2" },
                  { name: "Rosé", value: "#f7e6df" },
                  { name: "Cinza claro", value: "#ece8e1" },
                  { name: "Preto", value: "#111111" },
                  { name: "Nude escuro", value: "#1a1410" },
                ].map((c) => {
                  const active = (theme.headerBgColor || "") === c.value;
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setTheme({ ...theme, headerBgColor: c.value || undefined })}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-colors ${active ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40"}`}
                    >
                      <span className="h-4 w-4 rounded-full border border-border" style={{ background: c.value || "transparent" }} />
                      {c.name}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Input type="color" value={theme.headerBgColor || "#f8f7f5"} onChange={(e) => setTheme({ ...theme, headerBgColor: e.target.value })} className="h-10 w-14 p-1" />
                <Input value={theme.headerBgColor || ""} onChange={(e) => setTheme({ ...theme, headerBgColor: e.target.value || undefined })} placeholder="#f8f7f5 (vazio = padrão)" />
              </div>
            </div>

            <div>
              <Label>Cor dos textos do menu</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {[
                  { name: "Padrão", value: "" },
                  { name: "Preto", value: "#111111" },
                  { name: "Grafite", value: "#2a2a2a" },
                  { name: "Marrom", value: "#5a4630" },
                  { name: "Dourado", value: "#c8a46b" },
                  { name: "Branco", value: "#ffffff" },
                ].map((c) => {
                  const active = (theme.headerTextColor || "") === c.value;
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setTheme({ ...theme, headerTextColor: c.value || undefined })}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-colors ${active ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40"}`}
                    >
                      <span className="h-4 w-4 rounded-full border border-border" style={{ background: c.value || "transparent" }} />
                      {c.name}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Input type="color" value={theme.headerTextColor || "#111111"} onChange={(e) => setTheme({ ...theme, headerTextColor: e.target.value })} className="h-10 w-14 p-1" />
                <Input value={theme.headerTextColor || ""} onChange={(e) => setTheme({ ...theme, headerTextColor: e.target.value || undefined })} placeholder="#111111 (vazio = padrão)" />
              </div>
            </div>

            <div>
              <Label>Formato da letra (fonte do menu)</Label>
              <p className="text-[11px] text-muted-foreground mt-1">Escolha o estilo tipográfico aplicado à logo, links e textos do header.</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {[
                  { name: "Padrão", value: "" },
                  { name: "Serif clássica", value: "'Playfair Display', Georgia, serif" },
                  { name: "Serif moderna", value: "'Cormorant Garamond', Georgia, serif" },
                  { name: "Sans elegante", value: "'Inter', system-ui, sans-serif" },
                  { name: "Sans geométrica", value: "'Montserrat', system-ui, sans-serif" },
                  { name: "Sans humanista", value: "'Poppins', system-ui, sans-serif" },
                  { name: "Caligráfica", value: "'Great Vibes', cursive" },
                  { name: "Display luxo", value: "'Bodoni Moda', 'Didot', serif" },
                  { name: "Monoespaçada", value: "'JetBrains Mono', monospace" },
                ].map((f) => {
                  const active = (theme.headerFontFamily || "") === f.value;
                  return (
                    <button
                      key={f.name}
                      type="button"
                      onClick={() => setTheme({ ...theme, headerFontFamily: f.value || undefined })}
                      className={`px-3 py-1.5 rounded-full border text-xs transition-colors ${active ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40"}`}
                      style={f.value ? { fontFamily: f.value } : undefined}
                    >
                      {f.name}
                    </button>
                  );
                })}
              </div>
              <Input
                className="mt-3"
                value={theme.headerFontFamily || ""}
                onChange={(e) => setTheme({ ...theme, headerFontFamily: e.target.value || undefined })}
                placeholder="Personalizada (ex.: 'Playfair Display', serif)"
              />
            </div>
          </div>
          </div>

          {/* Hero / Banner principal */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-xl">Hero (banner principal)</h3>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">textos do topo</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Eyebrow (linha pequena)</Label>
                <Input value={theme.heroEyebrow || ""} onChange={(e) => setTheme({ ...theme, heroEyebrow: e.target.value })} placeholder="Coleção Atual" maxLength={40} className="mt-1.5" />
              </div>
              <div>
                <Label>Título — linha 1</Label>
                <Input value={theme.heroTitle1 || ""} onChange={(e) => setTheme({ ...theme, heroTitle1: e.target.value })} placeholder="Especial" maxLength={30} className="mt-1.5" />
              </div>
              <div>
                <Label>Título — destaque (cor primária)</Label>
                <Input value={theme.heroTitleHighlight || ""} onChange={(e) => setTheme({ ...theme, heroTitleHighlight: e.target.value })} placeholder="Joias" maxLength={30} className="mt-1.5" />
              </div>
              <div>
                <Label>Texto promocional</Label>
                <Input value={theme.heroPromoText || ""} onChange={(e) => setTheme({ ...theme, heroPromoText: e.target.value })} placeholder="até 20% OFF em peças selecionadas" maxLength={120} className="mt-1.5" />
              </div>
              <div>
                <Label>Botão primário</Label>
                <Input value={theme.heroCtaPrimary || ""} onChange={(e) => setTheme({ ...theme, heroCtaPrimary: e.target.value })} placeholder="comprar" maxLength={30} className="mt-1.5" />
              </div>
              <div>
                <Label>Botão secundário</Label>
                <Input value={theme.heroCtaSecondary || ""} onChange={(e) => setTheme({ ...theme, heroCtaSecondary: e.target.value })} placeholder="Sobre a loja" maxLength={30} className="mt-1.5" />
              </div>
            </div>
          </div>

          {/* Faixa de benefícios */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-xl">Faixa de benefícios</h3>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{(theme.benefits || []).length} itens</span>
            </div>
            <p className="text-xs text-muted-foreground -mt-1">Aparecem logo abaixo do banner principal.</p>
            <div className="space-y-2">
              {(theme.benefits && theme.benefits.length ? theme.benefits : ["Frete Grátis*", "Parcele em até 10x sem juros", "Bônus em todas as compras*", "5% OFF com PIX", "Atendimento personalizado"]).map((b, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={b}
                    onChange={(e) => {
                      const list = [...((theme.benefits && theme.benefits.length) ? theme.benefits! : ["Frete Grátis*", "Parcele em até 10x sem juros", "Bônus em todas as compras*", "5% OFF com PIX", "Atendimento personalizado"])];
                      list[i] = e.target.value;
                      setTheme({ ...theme, benefits: list });
                    }}
                    maxLength={60}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const list = [...((theme.benefits && theme.benefits.length) ? theme.benefits! : ["Frete Grátis*", "Parcele em até 10x sem juros", "Bônus em todas as compras*", "5% OFF com PIX", "Atendimento personalizado"])];
                      list.splice(i, 1);
                      setTheme({ ...theme, benefits: list });
                    }}
                    aria-label="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                const list = [...((theme.benefits && theme.benefits.length) ? theme.benefits! : [])];
                list.push("Novo benefício");
                setTheme({ ...theme, benefits: list });
              }}
            >
              <Plus className="h-4 w-4" /> Adicionar benefício
            </Button>
          </div>

          {/* Sobre a loja */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-display text-xl">Seção "Sobre a loja"</h3>
            <div>
              <Label>Eyebrow</Label>
              <Input value={theme.aboutEyebrow || ""} onChange={(e) => setTheme({ ...theme, aboutEyebrow: e.target.value })} placeholder="Sobre a loja" maxLength={40} className="mt-1.5" />
            </div>
            <div>
              <Label>Título</Label>
              <Input value={theme.aboutTitle || ""} onChange={(e) => setTheme({ ...theme, aboutTitle: e.target.value })} placeholder={name || "Nome da loja"} maxLength={80} className="mt-1.5" />
            </div>
            <div>
              <Label>Texto principal</Label>
              <Textarea value={theme.aboutText || ""} onChange={(e) => setTheme({ ...theme, aboutText: e.target.value })} rows={4} maxLength={600} placeholder="Conte a história da sua loja..." className="mt-1.5" />
            </div>
            <div>
              <Label>Texto complementar (opcional)</Label>
              <Textarea value={theme.aboutText2 || ""} onChange={(e) => setTheme({ ...theme, aboutText2: e.target.value })} rows={3} maxLength={600} placeholder="Diferenciais, fornecedores, missão..." className="mt-1.5" />
            </div>
          </div>

          {/* CTA final */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-display text-xl">Chamada final</h3>
            <div>
              <Label>Eyebrow</Label>
              <Input value={theme.finalCtaEyebrow || ""} onChange={(e) => setTheme({ ...theme, finalCtaEyebrow: e.target.value })} placeholder="Atendimento personalizado" maxLength={40} className="mt-1.5" />
            </div>
            <div>
              <Label>Título</Label>
              <Textarea value={theme.finalCtaTitle || ""} onChange={(e) => setTheme({ ...theme, finalCtaTitle: e.target.value })} rows={2} maxLength={200} placeholder="Não encontrou o que procurava? Fale comigo..." className="mt-1.5" />
            </div>
          </div>

          {/* Seções visíveis */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <h3 className="font-display text-xl">Seções visíveis</h3>
            <p className="text-xs text-muted-foreground -mt-1">Mostre ou esconda blocos da sua loja.</p>
            {[
              { key: "showCollections", label: "Coleções (categorias em destaque)" },
              { key: "showMaterials", label: "Materiais (Ouro, Prata, Folheado)" },
              { key: "showCare", label: "Cuidados com as joias" },
              { key: "showGuarantee", label: "Garantia, troca e pagamento" },
              { key: "showFinalCta", label: "Chamada final (WhatsApp/Instagram)" },
            ].map((s) => {
              const value = (theme as any)[s.key];
              const checked = value === undefined ? true : !!value;
              return (
                <div key={s.key} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-sm">{s.label}</span>
                  <Switch checked={checked} onCheckedChange={(v) => setTheme({ ...theme, [s.key]: v } as StoreTheme)} />
                </div>
              );
            })}
          </div>

          <Button variant="gold" size="lg" className="w-full" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar personalização
          </Button>
        </div>

      </div>
    </SellerLayout>
  );
};

export default SellerCustomization;
