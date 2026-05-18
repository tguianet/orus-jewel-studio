import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  StorePopup,
  createStorePopup,
  deleteStorePopup,
  loadStorePopups,
  setStorePopupActive,
} from "@/lib/storePopups";
import { uploadMarketingBannerFile } from "@/lib/marketingBanners";

export const AdminPopupsSection = () => {
  const [popups, setPopups] = useState<StorePopup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = async () => {
    setLoading(true);
    try {
      setPopups(await loadStorePopups());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const handleImage = async (file?: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Imagem muito grande (máx 5MB).");
    try {
      setUploading(true);
      const url = await uploadMarketingBannerFile(file);
      setImageUrl(url);
      toast.success("Imagem enviada.");
    } catch {
      toast.error("Falha ao enviar imagem.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleCreate = async () => {
    if (!title.trim() && !message.trim() && !imageUrl) {
      return toast.error("Preencha pelo menos o título, mensagem ou imagem.");
    }
    try {
      setSaving(true);
      await createStorePopup({
        title: title.trim(),
        message: message.trim(),
        imageUrl: imageUrl || null,
        ctaLabel: ctaLabel.trim() || null,
        ctaUrl: ctaUrl.trim() || null,
        active: true,
      });
      setTitle(""); setMessage(""); setImageUrl(""); setCtaLabel(""); setCtaUrl("");
      toast.success("Pop-up publicado em todas as lojas!");
      await reload();
    } catch {
      toast.error("Falha ao publicar pop-up.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (p: StorePopup, active: boolean) => {
    try {
      await setStorePopupActive(p.id, active);
      setPopups((c) => c.map((x) => (x.id === p.id ? { ...x, active } : x)));
    } catch {
      toast.error("Falha ao atualizar.");
    }
  };

  const remove = async (p: StorePopup) => {
    if (!confirm("Remover este pop-up?")) return;
    try {
      await deleteStorePopup(p.id);
      setPopups((c) => c.filter((x) => x.id !== p.id));
      toast.success("Removido.");
    } catch {
      toast.error("Falha ao remover.");
    }
  };

  return (
    <div className="space-y-4 mb-10">
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div>
          <h3 className="font-display text-xl">Pop-up das lojas</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Cria uma janelinha (pop-up) que aparece para o cliente assim que ele abre qualquer loja.
            Use para promoções, avisos ou novidades. Apenas o pop-up mais recente que estiver "ativo" será exibido.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Promoção de inverno" className="mt-1.5" maxLength={80} />
          </div>
          <div>
            <Label>Texto do botão (opcional)</Label>
            <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Ex: Ver coleção" className="mt-1.5" maxLength={40} />
          </div>
        </div>

        <div>
          <Label>Mensagem</Label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={400} placeholder="Mensagem que aparecerá no pop-up" className="mt-1.5" />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Link do botão (opcional)</Label>
            <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://..." className="mt-1.5" />
          </div>
          <div>
            <Label>Imagem (opcional)</Label>
            <div className="flex items-center gap-2 mt-1.5">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImage(e.target.files?.[0])} />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {imageUrl ? "Trocar" : "Enviar"}
              </Button>
              {imageUrl && (
                <>
                  <img src={imageUrl} alt="" className="h-10 w-10 rounded object-cover border border-border" />
                  <button type="button" onClick={() => setImageUrl("")} className="text-xs text-muted-foreground hover:text-destructive">Remover</button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="gold" onClick={handleCreate} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Publicar pop-up
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-24 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
        </div>
      ) : popups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhum pop-up criado ainda.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {popups.map((p) => (
            <div key={p.id} className="rounded-xl border border-border bg-card p-4 flex gap-3">
              {p.imageUrl && (
                <img src={p.imageUrl} alt={p.title} className="h-20 w-20 rounded object-cover border border-border shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.title || "(sem título)"}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{p.message}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                  {p.active ? "Ativo · aparecendo nas lojas" : "Pausado"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <Switch checked={p.active} onCheckedChange={(v) => toggle(p, v)} />
                <Button variant="ghost" size="icon" onClick={() => remove(p)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
