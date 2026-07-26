import { useRef, useState } from "react";
import { Upload, X, ImagePlus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProductImageGalleryProps {
  images: string[];
  onChange: (images: string[]) => void;
  bucket?: string;
  pathPrefix?: string;
  maxImages?: number;
  disabled?: boolean;
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) return String(error.message);
  return "Erro desconhecido.";
};

export const ProductImageGallery = ({
  images,
  onChange,
  bucket = "product-images",
  pathPrefix = "produto",
  maxImages = 5,
  disabled,
}: ProductImageGalleryProps) => {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const remaining = maxImages - images.length;
    if (remaining <= 0) {
      toast.error(`Máximo de ${maxImages} imagens.`);
      return;
    }
    const list = Array.from(files).slice(0, remaining);
    setUploading(true);
    const uploaded: string[] = [];
    try {
      for (const file of list) {
        if (!file.type.startsWith("image/")) {
          toast.error("Envie apenas imagens.");
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`"${file.name}" excede 5MB.`);
          continue;
        }
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const filePath = `${pathPrefix}-${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(bucket)
          .upload(filePath, file, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
        uploaded.push(data.publicUrl);
      }
      if (uploaded.length) onChange([...images, ...uploaded]);
    } catch (err) {
      toast.error("Falha no upload.", { description: getErrorMessage(err) });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = (idx: number) => onChange(images.filter((_, i) => i !== idx));
  const makePrimary = (idx: number) => {
    if (idx === 0) return;
    const next = [...images];
    const [item] = next.splice(idx, 1);
    next.unshift(item);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {images.map((url, idx) => (
          <div key={url + idx} className="relative group">
            <img
              src={url}
              alt={`Foto ${idx + 1}`}
              className={`h-20 w-20 rounded-lg border object-cover ${idx === 0 ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
            />
            {idx === 0 && (
              <span className="absolute -top-1 -left-1 bg-primary text-primary-foreground text-[9px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <Star className="h-2.5 w-2.5" /> Capa
              </span>
            )}
            <button
              type="button"
              onClick={() => remove(idx)}
              disabled={disabled || uploading}
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              aria-label="Remover foto"
            >
              <X className="h-3 w-3" />
            </button>
            {idx !== 0 && (
              <button
                type="button"
                onClick={() => makePrimary(idx)}
                disabled={disabled || uploading}
                className="absolute bottom-1 left-1 text-[9px] bg-background/80 border border-border px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition"
              >
                Capa
              </button>
            )}
          </div>
        ))}
        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
            className="h-20 w-20 rounded-lg border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition text-[10px] gap-1"
          >
            <Upload className="h-4 w-4" />
            {uploading ? "..." : "Adicionar"}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <ImagePlus className="h-3.5 w-3.5" /> Até {maxImages} fotos • PNG, JPG ou WEBP até 5MB • a primeira é a capa
      </p>
    </div>
  );
};
