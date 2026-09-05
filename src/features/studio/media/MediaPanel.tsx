import { useRef, useState } from "react";
import { Upload, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { uploadStoreAsset } from "@/lib/storeTheme";
import { useSelectedNode, useStudioStore } from "../store/StudioStoreContext";
import { getNodeDefinition } from "../registry";

export function MediaPanel({ storeId }: { storeId: string | null }) {
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { dispatch } = useStudioStore();
  const selected = useSelectedNode();
  const selectedAcceptsImage = selected && ["image", "promotionalCollection"].includes(selected.type);
  const selectedDef = selected ? getNodeDefinition(selected.type) : null;

  const handleUpload = async (file?: File | null) => {
    if (!file || !storeId) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo grande demais (máx 5MB).");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadStoreAsset(storeId, "media", file);
      setImages((prev) => [url, ...prev]);
      toast.success("Imagem enviada.");
    } catch {
      toast.error("Falha no upload.");
    } finally {
      setUploading(false);
    }
  };

  const useImage = (url: string) => {
    if (!selected) {
      toast.info("Selecione uma imagem no canvas para trocá-la.");
      return;
    }
    if (selected.type === "image") dispatch({ type: "UPDATE_PROPS", nodeId: selected.id, patch: { src: url } });
    else if (selected.type === "promotionalCollection") dispatch({ type: "UPDATE_PROPS", nodeId: selected.id, patch: { image: url } });
    else if (selected.type === "gallery") {
      const current = (selected.props.images as string[]) || [];
      dispatch({ type: "UPDATE_PROPS", nodeId: selected.id, patch: { images: [...current, url] } });
    } else {
      toast.info("Selecione um elemento de imagem, galeria ou coleção promocional.");
      return;
    }
    toast.success("Imagem aplicada.");
  };

  return (
    <div className="p-3 space-y-4">
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => void handleUpload(e.target.files?.[0])} />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading || !storeId}
        className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-border py-6 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        Enviar imagem
      </button>

      {selected && (
        <p className="text-[11px] text-muted-foreground px-1">
          {selectedAcceptsImage || selectedDef?.type === "gallery"
            ? `Clique numa imagem abaixo para aplicar em "${selected.name}".`
            : "Selecione uma Imagem, Galeria ou Coleção promocional para poder trocar a imagem."}
        </p>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {images.map((url) => (
            <button key={url} onClick={() => useImage(url)} className="relative aspect-square rounded-md overflow-hidden border border-border group">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <span className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                <Check className="h-5 w-5 text-white" />
              </span>
            </button>
          ))}
        </div>
      )}

      {images.length === 0 && <p className="text-xs text-muted-foreground px-1">Nenhuma imagem enviada nesta sessão ainda.</p>}
    </div>
  );
}
