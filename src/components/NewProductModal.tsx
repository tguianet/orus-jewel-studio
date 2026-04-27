import { FormEvent, useEffect, useState } from "react";
import { ImagePlus, Plus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { categories, fallbackProduct, Product } from "@/lib/mockData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NewProductModalProps {
  onCreate?: (product: Product) => void;
}

export const NewProductModal = ({ onCreate }: NewProductModalProps) => {
  const [open, setOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>(fallbackProduct.image);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  const handleImageUpload = (file?: File) => {
    setImageError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("Envie um arquivo de imagem válido.");
      setImageFile(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError("A imagem deve ter no máximo 5MB.");
      setImageFile(null);
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "Nova joia Aura");
    const category = String(form.get("category") || categories[0]?.name || "Joias");
    const wholesalePrice = Number(form.get("wholesalePrice") || 0);
    const suggestedPrice = Number(form.get("suggestedPrice") || wholesalePrice * 2);
    const stock = Number(form.get("stock") || 0);
    const code = `AUR-${category.charAt(0).toUpperCase()}${Date.now().toString().slice(-3)}`;
    let productImageUrl = imagePreview;

    try {
      if (imageFile) {
        const extension = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const filePath = `${code.toLowerCase()}-${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(filePath, imageFile, { cacheControl: "3600", upsert: false });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
        productImageUrl = data.publicUrl;
      }

      const { data: savedProduct, error: productError } = await supabase
        .from("products")
        .insert({
          code,
          name,
          category_id: null,
          seller_store_id: null,
          description: "Produto cadastrado pelo painel Aura Store Suite.",
          cost_price: Math.round(wholesalePrice * 0.58),
          wholesale_price: wholesalePrice,
          suggested_price: suggestedPrice,
          stock,
          min_order: 2,
          image_url: productImageUrl,
          status: "active",
        })
        .select("id,code,name,description,cost_price,wholesale_price,suggested_price,stock,min_order,image_url")
        .single();

      if (productError) throw productError;

      onCreate?.({
        id: savedProduct.id,
        code: savedProduct.code,
        name: savedProduct.name,
        category,
        description: savedProduct.description,
        costPrice: Number(savedProduct.cost_price ?? 0),
        wholesalePrice: Number(savedProduct.wholesale_price ?? 0),
        suggestedPrice: Number(savedProduct.suggested_price ?? 0),
        stock: savedProduct.stock ?? 0,
        minOrder: savedProduct.min_order ?? 1,
        image: savedProduct.image_url || productImageUrl,
        active: true,
      });

      event.currentTarget.reset();
      setImagePreview(fallbackProduct.image);
      setImageFile(null);
      setImageError("");
      setOpen(false);
      toast.success("Produto salvo com imagem no storage.");
    } catch (error) {
      toast.error("Não foi possível salvar no storage. Verifique login e permissões.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button type="button" variant="gold" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Novo produto
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-ornate" role="dialog" aria-modal="true" aria-labelledby="new-product-title" onClick={(event) => event.stopPropagation()}>
            <Button type="button" variant="ghost" size="icon" className="absolute right-3 top-3 h-8 w-8" onClick={() => setOpen(false)} aria-label="Fechar modal">
              <X className="h-4 w-4" />
            </Button>
            <h2 id="new-product-title" className="font-display text-2xl mb-4">Novo produto</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="product-image">Imagem do produto</Label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <img src={imagePreview} alt="Prévia da imagem do produto" className="h-24 w-24 rounded-lg border border-border object-cover" />
                  <div className="flex-1">
                    <Input
                      id="product-image"
                      name="image"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(event) => handleImageUpload(event.target.files?.[0])}
                    />
                    <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => document.getElementById("product-image")?.click()} disabled={saving}>
                      <Upload className="h-4 w-4" /> Fazer upload
                    </Button>
                    <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><ImagePlus className="h-3.5 w-3.5" /> PNG, JPG ou WEBP até 5MB</p>
                    {imageError && <p className="mt-1 text-xs text-destructive">{imageError}</p>}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome da joia</Label>
                <Input id="name" name="name" placeholder="Ex: Brinco Pérola Dourada" required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="category">Categoria</Label>
                  <select id="category" name="category" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {categories.map(category => <option key={category.id}>{category.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="stock">Estoque</Label>
                  <Input id="stock" name="stock" type="number" min="0" defaultValue="10" required />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="wholesalePrice">Preço atacado</Label>
                  <Input id="wholesalePrice" name="wholesalePrice" type="number" min="1" defaultValue="59" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="suggestedPrice">Preço sugerido</Label>
                  <Input id="suggestedPrice" name="suggestedPrice" type="number" min="1" defaultValue="139" required />
                </div>
              </div>
              <Button type="submit" variant="gold" className="w-full" disabled={saving}>{saving ? "Salvando..." : "Cadastrar produto"}</Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};