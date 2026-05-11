import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  MarketingBanner,
  createMarketingBanner,
  deleteMarketingBanner,
  loadMarketingBanners,
  setMarketingBannerActive,
  uploadMarketingBannerFile,
} from "@/lib/marketingBanners";

const AdminBanners = () => {
  const [banners, setBanners] = useState<MarketingBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = async () => {
    setLoading(true);
    setBanners(await loadMarketingBanners(false));
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const handleUpload = async (file?: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Imagem muito grande (máx 5MB).");
    try {
      setUploading(true);
      const url = await uploadMarketingBannerFile(file);
      await createMarketingBanner({ title: title.trim(), imageUrl: url });
      setTitle("");
      toast.success("Banner publicado para as sacoleiras!");
      await reload();
    } catch {
      toast.error("Falha ao publicar banner.");
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
    if (!confirm("Remover este banner? As sacoleiras não poderão mais usá-lo.")) return;
    try {
      await deleteMarketingBanner(b.id);
      setBanners((curr) => curr.filter((x) => x.id !== b.id));
      toast.success("Banner removido.");
    } catch {
      toast.error("Falha ao remover.");
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        eyebrow="Marketing"
        title="Banners da rede"
        description="Os banners enviados aqui ficam disponíveis para todas as sacoleiras adicionarem na loja delas."
      />

      <div className="rounded-xl border border-border bg-card p-6 space-y-3 mb-8">
        <h3 className="font-display text-xl">Publicar novo banner</h3>
        <p className="text-xs text-muted-foreground">Recomendado: 1600 × 500 px (formato amplo).</p>
        <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
          <div>
            <Label>Título (opcional)</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Coleção Verão 2026"
              className="mt-1.5"
              maxLength={80}
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files?.[0])}
          />
          <Button variant="gold" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Enviar banner
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
        </div>
      ) : banners.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          Nenhum banner publicado ainda.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map((b) => (
            <div key={b.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="aspect-[16/5] bg-muted">
                <img src={b.imageUrl} alt={b.title || "Banner"} className="w-full h-full object-cover" />
              </div>
              <div className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{b.title || "Sem título"}</p>
                  <p className="text-xs text-muted-foreground">{b.active ? "Ativo — visível para sacoleiras" : "Pausado"}</p>
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
