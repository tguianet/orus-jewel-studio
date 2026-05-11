import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ImageFormat,
  MarketingBanner,
  createMarketingBanner,
  deleteMarketingBanner,
  loadImageFormats,
  loadMarketingBanners,
  setMarketingBannerActive,
  uploadMarketingBannerFile,
} from "@/lib/marketingBanners";
import { cn } from "@/lib/utils";

const AdminBanners = () => {
  const { formatSlug } = useParams<{ formatSlug?: string }>();
  const [formats, setFormats] = useState<ImageFormat[]>([]);
  const [banners, setBanners] = useState<MarketingBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const currentFormat = useMemo(
    () => formats.find((f) => f.slug === formatSlug) || null,
    [formats, formatSlug]
  );

  const reload = async () => {
    setLoading(true);
    const [fmts, all] = await Promise.all([loadImageFormats(false), loadMarketingBanners({ onlyActive: false })]);
    setFormats(fmts);
    setBanners(all);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const filteredBanners = useMemo(() => {
    if (!currentFormat) return banners;
    return banners.filter((b) => b.formatId === currentFormat.id);
  }, [banners, currentFormat]);

  const handleUpload = async (file?: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Imagem muito grande (máx 5MB).");
    try {
      setUploading(true);
      const url = await uploadMarketingBannerFile(file);
      await createMarketingBanner({ title: title.trim(), imageUrl: url, formatId: currentFormat?.id ?? null });
      setTitle("");
      toast.success("Imagem publicada!");
      await reload();
    } catch {
      toast.error("Falha ao publicar.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const toggleActive = async (b: MarketingBanner, active: boolean) => {
    try {
      await setMarketingBannerActive(b.id, active);
      setBanners((curr) => curr.map((x) => (x.id === b.id ? { ...x, active } : x)));
    } catch {
      toast.error("Falha ao atualizar.");
    }
  };

  const remove = async (b: MarketingBanner) => {
    if (!confirm("Remover esta imagem?")) return;
    try {
      await deleteMarketingBanner(b.id);
      setBanners((curr) => curr.filter((x) => x.id !== b.id));
      toast.success("Removida.");
    } catch {
      toast.error("Falha ao remover.");
    }
  };

  const previewAspect = currentFormat
    ? `${currentFormat.width} / ${currentFormat.height}`
    : "16 / 5";

  return (
    <AdminLayout>
      <PageHeader
        eyebrow="Marketing"
        title={currentFormat ? currentFormat.name : "Banners da rede"}
        description={
          currentFormat
            ? `${currentFormat.description || "Imagens publicadas para as sacoleiras."} · ${currentFormat.width} × ${currentFormat.height} px`
            : "As imagens enviadas aqui ficam disponíveis para todas as sacoleiras."
        }
      />

      {/* Tabs de formato */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          to="/admin/banners"
          className={cn(
            "px-3 py-1.5 rounded-full text-xs border transition-colors",
            !currentFormat ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40"
          )}
        >
          Todos
        </Link>
        {formats.map((f) => (
          <Link
            key={f.id}
            to={`/admin/banners/${f.slug}`}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs border transition-colors",
              currentFormat?.id === f.id ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40"
            )}
          >
            {f.name}
            <span className="ml-1.5 text-[10px] opacity-70">{f.width}×{f.height}</span>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-3 mb-8">
        <h3 className="font-display text-xl">
          Publicar {currentFormat ? `nova imagem (${currentFormat.name})` : "nova imagem"}
        </h3>
        <p className="text-xs text-muted-foreground">
          {currentFormat
            ? `Recomendado: ${currentFormat.width} × ${currentFormat.height} px`
            : "Selecione um formato acima para publicar uma imagem específica de rede social."}
        </p>
        <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
          <div>
            <Label>Título (opcional)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Coleção Verão 2026" className="mt-1.5" maxLength={80} />
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} />
          <Button variant="gold" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Enviar imagem
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
        </div>
      ) : filteredBanners.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          Nenhuma imagem publicada {currentFormat ? `no formato "${currentFormat.name}"` : "ainda"}.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBanners.map((b) => (
            <div key={b.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="bg-muted" style={{ aspectRatio: previewAspect }}>
                <img src={b.imageUrl} alt={b.title || "Banner"} className="w-full h-full object-cover" />
              </div>
              <div className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{b.title || "Sem título"}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.active ? "Ativa — visível para sacoleiras" : "Pausada"}
                    {!currentFormat && b.formatId && (
                      <> · {formats.find((f) => f.id === b.formatId)?.name || "—"}</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Switch checked={b.active} onCheckedChange={(v) => toggleActive(b, v)} />
                  <Button variant="ghost" size="icon" onClick={() => remove(b)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminBanners;
