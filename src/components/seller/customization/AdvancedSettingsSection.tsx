import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SectionStyleControls } from "@/components/seller/SectionStyleControls";
import { toast } from "sonner";
import { defaultTheme, type StoreTheme } from "@/lib/storeTheme";

export type AdvancedPalette = { name: string; primary: string; secondary: string; custom?: boolean };

const LEGACY_DEFAULT_PALETTES: AdvancedPalette[] = [
  { name: "Dourado clássico", primary: "#d4a747", secondary: "#f5e6c8" },
  { name: "Rosé elegante", primary: "#d4877a", secondary: "#f5d6cb" },
  { name: "Champanhe", primary: "#e8c97a", secondary: "#f8efd7" },
  { name: "Preto & nude", primary: "#c8b59c", secondary: "#e8dcc8" },
];

const CUSTOM_PALETTES_KEY = "aura:customPalettes";

const loadCustomPalettes = (): AdvancedPalette[] => {
  try {
    const raw = localStorage.getItem(CUSTOM_PALETTES_KEY);
    return raw ? (JSON.parse(raw) as AdvancedPalette[]) : [];
  } catch {
    return [];
  }
};

const saveCustomPalettes = (list: AdvancedPalette[]) => {
  localStorage.setItem(CUSTOM_PALETTES_KEY, JSON.stringify(list));
};

type Props = {
  name: string;
  slug: string;
  onSlugChange: (value: string) => void;
  theme: StoreTheme;
  onThemeChange: (theme: StoreTheme) => void;
};

export function AdvancedSettingsSection({
  name,
  slug,
  onSlugChange,
  theme,
  onThemeChange,
}: Props) {
  const [customPalettes, setCustomPalettes] = useState<AdvancedPalette[]>(() => loadCustomPalettes());
  const [newPaletteName, setNewPaletteName] = useState("");
  const primary = theme.primaryColor || defaultTheme.primaryColor!;
  const secondary = theme.secondaryColor || defaultTheme.secondaryColor!;

  return (
    <details
      className="rounded-xl border border-border bg-card overflow-hidden"
      data-testid="customization-advanced"
    >
      <summary className="cursor-pointer list-none px-5 py-4 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-lg">Configurações avançadas — opcional</p>
            <p className="text-xs text-muted-foreground mt-1">
              Use apenas se quiser personalizar mais detalhes da loja.
            </p>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground shrink-0 mt-1">
            Fechado por padrão
          </span>
        </div>
      </summary>

      <div className="border-t border-border px-5 py-5 space-y-5">
        {/* Slug */}
        <div className="space-y-2">
          <h3 className="font-medium text-sm">Endereço da loja (URL)</h3>
          <Label htmlFor="adv-slug">Slug</Label>
          <Input
            id="adv-slug"
            value={slug}
            onChange={(e) => onSlugChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
            maxLength={60}
            className="mt-1.5"
          />
          <p className="text-[11px] text-muted-foreground">Ex.: /loja/{slug || "sua-loja"}</p>
        </div>

        {/* Logo format */}
        <div className="space-y-2">
          <h3 className="font-medium text-sm">Formato da logo</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onThemeChange({ ...theme, logoFormat: "square" })}
              className={`rounded-lg border p-3 text-left transition ${(theme.logoFormat ?? "square") === "square" ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "border-border hover:border-primary/40"}`}
            >
              <div className="mx-auto mb-2 h-10 w-10 rounded border border-border bg-muted" />
              <p className="text-xs font-medium">Quadrada</p>
            </button>
            <button
              type="button"
              onClick={() => onThemeChange({ ...theme, logoFormat: "wide" })}
              className={`rounded-lg border p-3 text-left transition ${theme.logoFormat === "wide" ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "border-border hover:border-primary/40"}`}
            >
              <div className="mx-auto mb-2 h-6 w-16 rounded border border-border bg-muted" />
              <p className="text-xs font-medium">Larga (horizontal)</p>
            </button>
          </div>
        </div>

        {/* Top bar */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm">Faixa superior (top bar)</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label>Texto à esquerda</Label>
              <Input value={theme.topBarLeftText || ""} onChange={(e) => onThemeChange({ ...theme, topBarLeftText: e.target.value })} placeholder="Atendimento ao cliente" maxLength={40} className="mt-1.5" />
            </div>
            <div>
              <Label>Texto central</Label>
              <Input value={theme.topBarCenterText || ""} onChange={(e) => onThemeChange({ ...theme, topBarCenterText: e.target.value })} placeholder="Frete cortesia..." maxLength={80} className="mt-1.5" />
            </div>
            <div>
              <Label>Texto à direita</Label>
              <Input value={theme.topBarRightText || ""} onChange={(e) => onThemeChange({ ...theme, topBarRightText: e.target.value })} placeholder="Acessibilidade" maxLength={40} className="mt-1.5" />
            </div>
          </div>
        </div>

        {/* Header / Menu */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm">Menu (header)</h3>
          <div>
            <Label>Cor de fundo do menu</Label>
            <div className="flex items-center gap-2 mt-2">
              <Input type="color" value={theme.headerBgColor || "#f8f7f5"} onChange={(e) => onThemeChange({ ...theme, headerBgColor: e.target.value })} className="h-10 w-14 p-1" />
              <Input value={theme.headerBgColor || ""} onChange={(e) => onThemeChange({ ...theme, headerBgColor: e.target.value || undefined })} placeholder="vazio = padrão" />
            </div>
          </div>
          <div>
            <Label>Cor dos textos do menu</Label>
            <div className="flex items-center gap-2 mt-2">
              <Input type="color" value={theme.headerTextColor || "#111111"} onChange={(e) => onThemeChange({ ...theme, headerTextColor: e.target.value })} className="h-10 w-14 p-1" />
              <Input value={theme.headerTextColor || ""} onChange={(e) => onThemeChange({ ...theme, headerTextColor: e.target.value || undefined })} placeholder="vazio = padrão" />
            </div>
          </div>
          <div>
            <Label>Fonte do menu</Label>
            <Input
              className="mt-1.5"
              value={theme.headerFontFamily || ""}
              onChange={(e) => onThemeChange({ ...theme, headerFontFamily: e.target.value || undefined })}
              placeholder="Ex.: 'Playfair Display', serif"
            />
          </div>
        </div>

        {/* Hero texts */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm">Textos do banner (hero)</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Eyebrow</Label>
              <Input value={theme.heroEyebrow || ""} onChange={(e) => onThemeChange({ ...theme, heroEyebrow: e.target.value })} maxLength={40} className="mt-1.5" />
            </div>
            <div>
              <Label>Título — linha 1</Label>
              <Input value={theme.heroTitle1 || ""} onChange={(e) => onThemeChange({ ...theme, heroTitle1: e.target.value })} maxLength={30} className="mt-1.5" />
            </div>
            <div>
              <Label>Título — destaque</Label>
              <Input value={theme.heroTitleHighlight || ""} onChange={(e) => onThemeChange({ ...theme, heroTitleHighlight: e.target.value })} maxLength={30} className="mt-1.5" />
            </div>
            <div>
              <Label>Texto promocional</Label>
              <Input value={theme.heroPromoText || ""} onChange={(e) => onThemeChange({ ...theme, heroPromoText: e.target.value })} maxLength={120} className="mt-1.5" />
            </div>
            <div>
              <Label>Botão primário</Label>
              <Input value={theme.heroCtaPrimary || ""} onChange={(e) => onThemeChange({ ...theme, heroCtaPrimary: e.target.value })} maxLength={30} className="mt-1.5" />
            </div>
            <div>
              <Label>Botão secundário</Label>
              <Input value={theme.heroCtaSecondary || ""} onChange={(e) => onThemeChange({ ...theme, heroCtaSecondary: e.target.value })} maxLength={30} className="mt-1.5" />
            </div>
          </div>
          <SectionStyleControls
            bg={theme.heroBgColor}
            text={theme.heroTextColor}
            font={theme.heroFontFamily}
            onChange={(p) => onThemeChange({
              ...theme,
              ...(p.bg !== undefined ? { heroBgColor: p.bg } : {}),
              ...(p.text !== undefined ? { heroTextColor: p.text } : {}),
              ...(p.font !== undefined ? { heroFontFamily: p.font } : {}),
            })}
          />
        </div>

        {/* Benefits */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm">Faixa de benefícios</h3>
          <div className="space-y-2">
            {(theme.benefits && theme.benefits.length
              ? theme.benefits
              : ["Frete Grátis*", "Parcele em até 10x sem juros", "Bônus em todas as compras*", "5% OFF com PIX", "Atendimento personalizado"]
            ).map((b, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={b}
                  onChange={(e) => {
                    const base = theme.benefits && theme.benefits.length
                      ? theme.benefits
                      : ["Frete Grátis*", "Parcele em até 10x sem juros", "Bônus em todas as compras*", "5% OFF com PIX", "Atendimento personalizado"];
                    const list = [...base];
                    list[i] = e.target.value;
                    onThemeChange({ ...theme, benefits: list });
                  }}
                  maxLength={60}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const base = theme.benefits && theme.benefits.length ? theme.benefits : ["Frete Grátis*", "Parcele em até 10x sem juros", "Bônus em todas as compras*", "5% OFF com PIX", "Atendimento personalizado"];
                    const list = [...base];
                    list.splice(i, 1);
                    onThemeChange({ ...theme, benefits: list });
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
              const list = [...(theme.benefits && theme.benefits.length ? theme.benefits : [])];
              list.push("Novo benefício");
              onThemeChange({ ...theme, benefits: list });
            }}
          >
            <Plus className="h-4 w-4" /> Adicionar benefício
          </Button>
          <SectionStyleControls
            bg={theme.benefitsBgColor}
            text={theme.benefitsTextColor}
            font={theme.benefitsFontFamily}
            onChange={(p) => onThemeChange({
              ...theme,
              ...(p.bg !== undefined ? { benefitsBgColor: p.bg } : {}),
              ...(p.text !== undefined ? { benefitsTextColor: p.text } : {}),
              ...(p.font !== undefined ? { benefitsFontFamily: p.font } : {}),
            })}
          />
        </div>

        {/* Categories */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm">Seção de categorias</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Título</Label>
              <Input value={theme.categoriesTitle || ""} onChange={(e) => onThemeChange({ ...theme, categoriesTitle: e.target.value })} placeholder={`Joias ${name}`} maxLength={60} className="mt-1.5" />
            </div>
            <div>
              <Label>Subtítulo</Label>
              <Input value={theme.categoriesSubtitle || ""} onChange={(e) => onThemeChange({ ...theme, categoriesSubtitle: e.target.value })} placeholder="Escolha por categorias" maxLength={60} className="mt-1.5" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Cor de fundo</Label>
              <div className="flex items-center gap-2 mt-1.5">
                <Input type="color" value={theme.categoriesBgColor || "#f8f7f5"} onChange={(e) => onThemeChange({ ...theme, categoriesBgColor: e.target.value })} className="h-10 w-14 p-1" />
                <Input value={theme.categoriesBgColor || ""} onChange={(e) => onThemeChange({ ...theme, categoriesBgColor: e.target.value || undefined })} />
              </div>
            </div>
            <div>
              <Label>Cor do texto</Label>
              <div className="flex items-center gap-2 mt-1.5">
                <Input type="color" value={theme.categoriesTextColor || "#111111"} onChange={(e) => onThemeChange({ ...theme, categoriesTextColor: e.target.value })} className="h-10 w-14 p-1" />
                <Input value={theme.categoriesTextColor || ""} onChange={(e) => onThemeChange({ ...theme, categoriesTextColor: e.target.value || undefined })} />
              </div>
            </div>
          </div>
          <div>
            <Label>Fonte da seção</Label>
            <Input className="mt-1.5" value={theme.categoriesFontFamily || ""} onChange={(e) => onThemeChange({ ...theme, categoriesFontFamily: e.target.value || undefined })} />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Cor do risco</Label>
              <div className="flex items-center gap-2 mt-1.5">
                <Input type="color" value={theme.categoriesDividerColor || theme.accentColor || "#f4a78a"} onChange={(e) => onThemeChange({ ...theme, categoriesDividerColor: e.target.value })} className="h-10 w-14 p-1" />
                <Input value={theme.categoriesDividerColor || ""} onChange={(e) => onThemeChange({ ...theme, categoriesDividerColor: e.target.value || undefined })} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Largura: {theme.categoriesDividerWidth ?? 48}</Label>
              <Input type="range" min={10} max={400} value={theme.categoriesDividerWidth ?? 48} onChange={(e) => onThemeChange({ ...theme, categoriesDividerWidth: Number(e.target.value) })} className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs">Espessura: {theme.categoriesDividerHeight ?? 2}</Label>
              <Input type="range" min={1} max={20} value={theme.categoriesDividerHeight ?? 2} onChange={(e) => onThemeChange({ ...theme, categoriesDividerHeight: Number(e.target.value) })} className="mt-1.5" />
            </div>
          </div>
        </div>

        {/* About */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm">Sobre a loja</h3>
          <Input value={theme.aboutEyebrow || ""} onChange={(e) => onThemeChange({ ...theme, aboutEyebrow: e.target.value })} placeholder="Eyebrow" maxLength={40} />
          <Input value={theme.aboutTitle || ""} onChange={(e) => onThemeChange({ ...theme, aboutTitle: e.target.value })} placeholder="Título" maxLength={80} />
          <Textarea value={theme.aboutText || ""} onChange={(e) => onThemeChange({ ...theme, aboutText: e.target.value })} rows={3} maxLength={600} placeholder="Texto principal" />
          <Textarea value={theme.aboutText2 || ""} onChange={(e) => onThemeChange({ ...theme, aboutText2: e.target.value })} rows={2} maxLength={600} placeholder="Texto complementar" />
          <SectionStyleControls
            bg={theme.aboutBgColor}
            text={theme.aboutTextColor}
            font={theme.aboutFontFamily}
            onChange={(p) => onThemeChange({
              ...theme,
              ...(p.bg !== undefined ? { aboutBgColor: p.bg } : {}),
              ...(p.text !== undefined ? { aboutTextColor: p.text } : {}),
              ...(p.font !== undefined ? { aboutFontFamily: p.font } : {}),
            })}
          />
        </div>

        {/* Final CTA */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm">Chamada final</h3>
          <Input value={theme.finalCtaEyebrow || ""} onChange={(e) => onThemeChange({ ...theme, finalCtaEyebrow: e.target.value })} maxLength={40} placeholder="Eyebrow" />
          <Textarea value={theme.finalCtaTitle || ""} onChange={(e) => onThemeChange({ ...theme, finalCtaTitle: e.target.value })} rows={2} maxLength={200} placeholder="Título" />
          <SectionStyleControls
            bg={theme.finalCtaBgColor}
            text={theme.finalCtaTextColor}
            font={theme.finalCtaFontFamily}
            onChange={(p) => onThemeChange({
              ...theme,
              ...(p.bg !== undefined ? { finalCtaBgColor: p.bg } : {}),
              ...(p.text !== undefined ? { finalCtaTextColor: p.text } : {}),
              ...(p.font !== undefined ? { finalCtaFontFamily: p.font } : {}),
            })}
          />
        </div>

        {/* Footer */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm">Rodapé</h3>
          <Textarea value={theme.footerAbout || ""} onChange={(e) => onThemeChange({ ...theme, footerAbout: e.target.value })} rows={2} maxLength={300} placeholder="Texto do rodapé" />
          <Input value={theme.footerCopyright || ""} onChange={(e) => onThemeChange({ ...theme, footerCopyright: e.target.value })} maxLength={120} placeholder="Copyright" />
          <div className="space-y-2">
            {(theme.footerLinks || []).map((lnk, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <Input
                  value={lnk.label}
                  onChange={(e) => {
                    const list = [...(theme.footerLinks || [])];
                    list[i] = { ...list[i], label: e.target.value };
                    onThemeChange({ ...theme, footerLinks: list });
                  }}
                  placeholder="Rótulo"
                  maxLength={40}
                />
                <Input
                  value={lnk.url}
                  onChange={(e) => {
                    const list = [...(theme.footerLinks || [])];
                    list[i] = { ...list[i], url: e.target.value };
                    onThemeChange({ ...theme, footerLinks: list });
                  }}
                  placeholder="https://"
                  maxLength={200}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const list = [...(theme.footerLinks || [])];
                    list.splice(i, 1);
                    onThemeChange({ ...theme, footerLinks: list });
                  }}
                  aria-label="Remover link"
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
              const list = [...(theme.footerLinks || [])];
              list.push({ label: "Novo link", url: "https://" });
              onThemeChange({ ...theme, footerLinks: list });
            }}
          >
            <Plus className="h-4 w-4" /> Adicionar link
          </Button>
          <SectionStyleControls
            bg={theme.footerBgColor}
            text={theme.footerTextColor}
            font={theme.footerFontFamily}
            onChange={(p) => onThemeChange({
              ...theme,
              ...(p.bg !== undefined ? { footerBgColor: p.bg } : {}),
              ...(p.text !== undefined ? { footerTextColor: p.text } : {}),
              ...(p.font !== undefined ? { footerFontFamily: p.font } : {}),
            })}
          />
        </div>

        {/* Full palette */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm">Paleta completa (cores extras)</h3>
          <div className="grid grid-cols-2 gap-3">
            {[...LEGACY_DEFAULT_PALETTES, ...customPalettes].map((p) => {
              const active =
                p.primary.toLowerCase() === primary.toLowerCase()
                && p.secondary.toLowerCase() === secondary.toLowerCase();
              return (
                <div key={p.name} className="relative group">
                  <button
                    type="button"
                    onClick={() => {
                      onThemeChange({ ...theme, primaryColor: p.primary, secondaryColor: p.secondary });
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
              <Input value={newPaletteName} onChange={(e) => setNewPaletteName(e.target.value)} placeholder="Nome da paleta" maxLength={30} />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const n = newPaletteName.trim();
                  if (!n) return toast.error("Dê um nome à paleta");
                  if ([...LEGACY_DEFAULT_PALETTES, ...customPalettes].some((p) => p.name.toLowerCase() === n.toLowerCase())) {
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
              <Label>Cor secundária</Label>
              <div className="flex items-center gap-2 mt-1.5">
                <Input type="color" value={secondary} onChange={(e) => onThemeChange({ ...theme, secondaryColor: e.target.value })} className="h-10 w-14 p-1" />
                <Input value={secondary} onChange={(e) => onThemeChange({ ...theme, secondaryColor: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Cor de destaque (faixa / CTA)</Label>
              <div className="flex items-center gap-2 mt-1.5">
                <Input type="color" value={theme.accentColor || "#f4a78a"} onChange={(e) => onThemeChange({ ...theme, accentColor: e.target.value })} className="h-10 w-14 p-1" />
                <Input value={theme.accentColor || "#f4a78a"} onChange={(e) => onThemeChange({ ...theme, accentColor: e.target.value })} />
              </div>
            </div>
          </div>
        </div>

        {/* Visible sections */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm">Seções visíveis</h3>
          {([
            { key: "showCollections", label: "Coleções (categorias em destaque)" },
            { key: "showMaterials", label: "Materiais (Ouro, Prata, Folheado)" },
            { key: "showCare", label: "Cuidados com as joias" },
            { key: "showGuarantee", label: "Garantia, troca e pagamento" },
            { key: "showFinalCta", label: "Chamada final (WhatsApp/Instagram)" },
          ] as const).map((s) => {
            const value = theme[s.key];
            const checked = value === undefined ? true : !!value;
            return (
              <div key={s.key} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <span className="text-sm">{s.label}</span>
                <Switch checked={checked} onCheckedChange={(v) => onThemeChange({ ...theme, [s.key]: v })} />
              </div>
            );
          })}
        </div>
      </div>
    </details>
  );
}
