import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Loader2, Pause, Play, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  type GlobalStoreBanner,
  type GlobalStoreBannerLifecycle,
  adminDeleteGlobalStoreBanner,
  adminDuplicateGlobalStoreBanner,
  adminListGlobalStoreBanners,
  adminSetGlobalStoreBannerActive,
  adminUpsertGlobalStoreBanner,
  assertSafeBannerButtonUrl,
  getCampaignLifecycle,
  groupCampaignsByLifecycle,
  maybeDeleteOrphanCampaignImage,
  uploadGlobalCampaignImage,
} from "@/lib/globalStoreBanners";
import { OFFICIAL_CAMPAIGN_BADGE } from "@/lib/storeHeroSlides";

const EMPTY_FORM = {
  id: "" as string,
  title: "",
  subtitle: "",
  imageUrl: "",
  mobileImageUrl: "",
  buttonText: "",
  buttonUrl: "",
  position: 0,
  startsAt: "",
  endsAt: "",
  isActive: false,
};

const LIFE_LABEL: Record<GlobalStoreBannerLifecycle, string> = {
  active: "Ativas",
  scheduled: "Agendadas",
  ended: "Encerradas",
  paused: "Pausadas",
};

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(v: string): string | null {
  if (!v.trim()) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function AdminGlobalStoreBannersSection() {
  const [list, setList] = useState<GlobalStoreBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"desktop" | "mobile" | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const desktopRef = useRef<HTMLInputElement>(null);
  const mobileRef = useRef<HTMLInputElement>(null);

  const groups = useMemo(() => groupCampaignsByLifecycle(list), [list]);

  const reload = async () => {
    setLoading(true);
    try {
      setList(await adminListGlobalStoreBanners());
    } catch {
      toast.error("Não foi possível carregar as campanhas.");
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const resetForm = () => setForm({ ...EMPTY_FORM });

  const fillForm = (c: GlobalStoreBanner) => {
    setForm({
      id: c.id,
      title: c.title,
      subtitle: c.subtitle || "",
      imageUrl: c.imageUrl,
      mobileImageUrl: c.mobileImageUrl || "",
      buttonText: c.buttonText || "",
      buttonUrl: c.buttonUrl || "",
      position: c.position,
      startsAt: toLocalInput(c.startsAt),
      endsAt: toLocalInput(c.endsAt),
      isActive: c.isActive,
    });
  };

  const handleUpload = async (file: File | null | undefined, slot: "desktop" | "mobile") => {
    if (!file) return;
    try {
      setUploading(slot);
      const url = await uploadGlobalCampaignImage(file);
      setForm((f) =>
        slot === "desktop" ? { ...f, imageUrl: url } : { ...f, mobileImageUrl: url },
      );
      toast.success("Imagem enviada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar imagem.");
    } finally {
      setUploading(null);
      if (slot === "desktop" && desktopRef.current) desktopRef.current.value = "";
      if (slot === "mobile" && mobileRef.current) mobileRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error("Informe o título.");
    if (!form.imageUrl.trim()) return toast.error("Envie a imagem para computador.");
    try {
      assertSafeBannerButtonUrl(form.buttonUrl);
      setSaving(true);
      const saved = await adminUpsertGlobalStoreBanner({
        id: form.id || null,
        title: form.title,
        subtitle: form.subtitle,
        imageUrl: form.imageUrl,
        mobileImageUrl: form.mobileImageUrl || null,
        buttonText: form.buttonText,
        buttonUrl: form.buttonUrl,
        position: Number(form.position) || 0,
        startsAt: fromLocalInput(form.startsAt),
        endsAt: fromLocalInput(form.endsAt),
        isActive: form.isActive,
        isMandatory: true,
      });
      toast.success(form.id ? "Campanha salva." : "Campanha criada.");
      fillForm(saved);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar campanha.");
    } finally {
      setSaving(false);
    }
  };

  const handlePauseResume = async (c: GlobalStoreBanner, active: boolean) => {
    try {
      await adminSetGlobalStoreBannerActive(c.id, active);
      toast.success(active ? "Campanha reativada." : "Campanha pausada.");
      await reload();
      if (form.id === c.id) setForm((f) => ({ ...f, isActive: active }));
    } catch {
      toast.error("Falha ao atualizar status.");
    }
  };

  const handleDuplicate = async (c: GlobalStoreBanner) => {
    try {
      const copy = await adminDuplicateGlobalStoreBanner(c.id);
      toast.success("Campanha duplicada (pausada).");
      fillForm(copy);
      await reload();
    } catch {
      toast.error("Falha ao duplicar.");
    }
  };

  const handleDelete = async (c: GlobalStoreBanner) => {
    if (!confirm("Excluir esta campanha? Ela deixará de aparecer em todas as lojas.")) return;
    try {
      const imageUrl = c.imageUrl;
      const mobileUrl = c.mobileImageUrl;
      await adminDeleteGlobalStoreBanner(c.id);
      await maybeDeleteOrphanCampaignImage(imageUrl);
      await maybeDeleteOrphanCampaignImage(mobileUrl);
      toast.success("Campanha excluída.");
      if (form.id === c.id) resetForm();
      await reload();
    } catch {
      toast.error("Falha ao excluir.");
    }
  };

  return (
    <div className="space-y-4 mb-10" data-testid="admin-global-store-banners">
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div>
          <h3 className="font-display text-xl">Campanhas nos banners das lojas</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Crie uma campanha uma única vez: ela aparece automaticamente em todas as lojas aprovadas,
            antes dos banners da sacoleira. A sacoleira não pode remover, editar ou ocultar.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Título</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="mt-1.5"
              maxLength={120}
              placeholder="Ex: Semana do Brilho"
            />
          </div>
          <div>
            <Label>Posição</Label>
            <Input
              type="number"
              value={form.position}
              onChange={(e) => setForm((f) => ({ ...f, position: Number(e.target.value) || 0 }))}
              className="mt-1.5"
            />
          </div>
        </div>

        <div>
          <Label>Subtítulo</Label>
          <Textarea
            value={form.subtitle}
            onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
            rows={2}
            className="mt-1.5"
            maxLength={240}
            placeholder="Texto de apoio no banner"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Texto do botão</Label>
            <Input
              value={form.buttonText}
              onChange={(e) => setForm((f) => ({ ...f, buttonText: e.target.value }))}
              className="mt-1.5"
              maxLength={40}
              placeholder="Ex: Ver promoção"
            />
          </div>
          <div>
            <Label>Link do botão</Label>
            <Input
              value={form.buttonUrl}
              onChange={(e) => setForm((f) => ({ ...f, buttonUrl: e.target.value }))}
              className="mt-1.5"
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Início</Label>
            <Input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Término</Label>
            <Input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
              className="mt-1.5"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Switch
            checked={form.isActive}
            onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
          />
          <span className="text-sm">{form.isActive ? "Ativa" : "Inativa / pausada"}</span>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Imagem para computador (horizontal)</Label>
            <input
              ref={desktopRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => handleUpload(e.target.files?.[0], "desktop")}
            />
            {form.imageUrl ? (
              <div className="mt-2 space-y-2">
                <img
                  src={form.imageUrl}
                  alt="Desktop"
                  className="w-full aspect-[16/6] object-cover rounded-lg border border-border"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => desktopRef.current?.click()}
                  disabled={!!uploading}
                >
                  {uploading === "desktop" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Trocar imagem
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => desktopRef.current?.click()}
                className="mt-2 w-full rounded-lg border-2 border-dashed border-border py-8 text-sm text-muted-foreground hover:border-primary/40"
              >
                {uploading === "desktop" ? "Enviando…" : "Enviar imagem desktop · PNG/JPG/WEBP · máx 5MB"}
              </button>
            )}
          </div>
          <div>
            <Label>Imagem para celular (opcional)</Label>
            <input
              ref={mobileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => handleUpload(e.target.files?.[0], "mobile")}
            />
            {form.mobileImageUrl ? (
              <div className="mt-2 space-y-2">
                <img
                  src={form.mobileImageUrl}
                  alt="Mobile"
                  className="w-full max-w-[220px] aspect-[9/12] object-cover rounded-lg border border-border"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => mobileRef.current?.click()}
                    disabled={!!uploading}
                  >
                    Trocar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setForm((f) => ({ ...f, mobileImageUrl: "" }))}
                  >
                    Remover
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => mobileRef.current?.click()}
                className="mt-2 w-full rounded-lg border-2 border-dashed border-border py-8 text-sm text-muted-foreground hover:border-primary/40"
              >
                {uploading === "mobile" ? "Enviando…" : "Enviar imagem mobile (opcional)"}
              </button>
            )}
          </div>
        </div>

        {form.imageUrl && (
          <div className="rounded-xl border border-border overflow-hidden bg-muted/20">
            <p className="text-xs text-muted-foreground px-4 pt-3">Pré-visualização</p>
            <div className="relative aspect-[16/6] mt-2">
              <img src={form.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <span className="absolute top-3 left-3 rounded-md bg-black/45 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white border border-white/20">
                {OFFICIAL_CAMPAIGN_BADGE}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 text-white max-w-md">
                <p className="font-display text-2xl">{form.title || "Título"}</p>
                {form.subtitle && <p className="text-sm text-white/85 mt-1">{form.subtitle}</p>}
                {form.buttonText && (
                  <span className="inline-block mt-3 text-[11px] uppercase tracking-widest border border-white/80 px-4 py-2">
                    {form.buttonText}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 justify-end">
          <Button type="button" variant="outline" onClick={resetForm}>
            Nova campanha
          </Button>
          <Button type="button" variant="gold" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : form.id ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {form.id ? "Salvar" : "Criar campanha"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-24 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando campanhas…
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhuma campanha criada ainda.
        </div>
      ) : (
        (["active", "scheduled", "ended", "paused"] as GlobalStoreBannerLifecycle[]).map((life) => {
          const items = groups[life];
          if (!items.length) return null;
          return (
            <div key={life} className="space-y-2">
              <h4 className="text-sm font-medium">
                {LIFE_LABEL[life]} ({items.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map((c) => {
                  const lifeNow = getCampaignLifecycle(c);
                  return (
                    <div key={c.id} className="rounded-xl border border-border bg-card p-4 flex gap-3">
                      <img
                        src={c.imageUrl}
                        alt={c.title}
                        className="h-20 w-28 rounded object-cover border border-border shrink-0"
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm font-medium truncate">{c.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Posição {c.position} · {LIFE_LABEL[lifeNow].replace(/s$/, "")}
                        </p>
                        <div className="flex flex-wrap gap-1 pt-1">
                          <Button type="button" size="sm" variant="outline" onClick={() => fillForm(c)}>
                            Editar
                          </Button>
                          {c.isActive ? (
                            <Button type="button" size="sm" variant="outline" onClick={() => handlePauseResume(c, false)}>
                              <Pause className="h-3.5 w-3.5" /> Pausar
                            </Button>
                          ) : (
                            <Button type="button" size="sm" variant="outline" onClick={() => handlePauseResume(c, true)}>
                              <Play className="h-3.5 w-3.5" /> Reativar
                            </Button>
                          )}
                          <Button type="button" size="sm" variant="outline" onClick={() => handleDuplicate(c)}>
                            <Copy className="h-3.5 w-3.5" /> Duplicar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => handleDelete(c)}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Excluir
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
