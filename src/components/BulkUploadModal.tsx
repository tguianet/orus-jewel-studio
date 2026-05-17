import { useEffect, useRef, useState } from "react";
import { Loader2, Upload, X, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const BULK_CATEGORY = "Cadastro em massa";

interface BulkUploadModalProps {
  onDone?: () => void | Promise<void>;
}

interface PendingFile {
  file: File;
  preview: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

export const BulkUploadModal = ({ onDone }: BulkUploadModalProps) => {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape" && !saving) setOpen(false); };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, saving]);

  const handleSelect = (list: FileList | null) => {
    if (!list) return;
    const valid: PendingFile[] = [];
    Array.from(list).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} excede 5MB e foi ignorado.`);
        return;
      }
      valid.push({ file, preview: URL.createObjectURL(file), status: "pending" });
    });
    setFiles((prev) => [...prev, ...valid]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setSaving(true);
    let ok = 0;
    const next = [...files];

    for (let i = 0; i < next.length; i++) {
      if (next[i].status === "done") { ok++; continue; }
      next[i] = { ...next[i], status: "uploading" };
      setFiles([...next]);
      try {
        const f = next[i].file;
        const ext = f.name.split(".").pop()?.toLowerCase() || "jpg";
        const code = `BULK-${Date.now().toString().slice(-6)}-${i}`;
        const path = `${code.toLowerCase()}-${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("product-images")
          .upload(path, f, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("product-images").getPublicUrl(path);

        const baseName = f.name.replace(/\.[^.]+$/, "").slice(0, 80) || "Produto sem nome";
        const { error: insErr } = await supabase.from("products").insert({
          code,
          name: baseName,
          category_id: null,
          category_name: BULK_CATEGORY,
          seller_store_id: null,
          description: "",
          cost_price: 0,
          wholesale_price: 0,
          suggested_price: 0,
          stock: 0,
          min_order: 1,
          image_url: data.publicUrl,
          status: "active",
        } as never);
        if (insErr) throw insErr;
        next[i] = { ...next[i], status: "done" };
        ok++;
      } catch (e: any) {
        next[i] = { ...next[i], status: "error", error: e?.message || "Falha" };
      }
      setFiles([...next]);
    }

    setSaving(false);
    toast.success(`${ok} produto(s) cadastrado(s) em "${BULK_CATEGORY}".`);
    await onDone?.();
    if (next.every((f) => f.status === "done")) {
      setTimeout(() => { setFiles([]); setOpen(false); }, 600);
    }
  };

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4" /> Cadastro em massa
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm" onClick={() => !saving && setOpen(false)}>
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-ornate" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <Button type="button" variant="ghost" size="icon" className="absolute right-3 top-3 h-8 w-8" onClick={() => !saving && setOpen(false)} aria-label="Fechar">
              <X className="h-4 w-4" />
            </Button>
            <h2 className="font-display text-2xl mb-1">Cadastro em massa</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Envie várias imagens de uma vez. Os produtos ficarão na categoria <strong>{BULK_CATEGORY}</strong> (oculta para as sacoleiras). Depois edite cada um e mova para a categoria correta.
            </p>

            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              onChange={(e) => { handleSelect(e.target.files); e.target.value = ""; }}
            />

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleSelect(e.dataTransfer.files); }}
              onClick={() => inputRef.current?.click()}
              className="cursor-pointer rounded-lg border border-dashed border-border bg-secondary/30 p-6 text-center hover:border-primary/50 transition-colors"
            >
              <ImagePlus className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm">Clique ou arraste imagens aqui</p>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG ou WEBP · até 5MB cada</p>
            </div>

            {files.length > 0 && (
              <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-72 overflow-y-auto">
                {files.map((f, i) => (
                  <div key={i} className="relative rounded-lg border border-border overflow-hidden bg-secondary/20">
                    <img src={f.preview} alt={f.file.name} className="w-full aspect-square object-cover" />
                    {!saving && f.status !== "done" && (
                      <button type="button" onClick={() => removeFile(i)} className="absolute top-1 right-1 rounded-full bg-background/80 p-1 hover:bg-background" aria-label="Remover">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                    <div className="px-2 py-1 text-[10px] truncate">{f.file.name}</div>
                    <div className={`absolute bottom-0 left-0 right-0 px-2 py-0.5 text-[10px] text-center backdrop-blur-sm ${f.status === 'done' ? 'bg-success/30' : f.status === 'error' ? 'bg-destructive/40' : f.status === 'uploading' ? 'bg-primary/30' : ''}`}>
                      {f.status === "uploading" && <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Enviando</span>}
                      {f.status === "done" && <span>OK</span>}
                      {f.status === "error" && <span>Erro</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-5">
              <Button type="button" variant="outline" onClick={() => { setFiles([]); }} disabled={saving || !files.length}>Limpar</Button>
              <Button type="button" variant="gold" onClick={handleUpload} disabled={saving || !files.length}>
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : <>Cadastrar {files.length} produto(s)</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
