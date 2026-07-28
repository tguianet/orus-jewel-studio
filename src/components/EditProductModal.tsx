import { FormEvent, useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Category, Product } from "@/types/commerce";
import { loadCategories } from "@/lib/categories";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProductImageGallery } from "@/components/ProductImageGallery";
import {
  JEWELRY_MATERIAL_OPTIONS,
  PRODUCT_JEWELRY_MATERIAL_BLOCK_MSG,
  PRODUCT_JEWELRY_MATERIAL_REQUIRED_MSG,
  isJewelryMaterial,
} from "@/lib/jewelryMaterial";


interface EditProductModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void | Promise<void>;
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) return String(error.message);
  return "Erro desconhecido.";
};

export const EditProductModal = ({ product, open, onOpenChange, onUpdated }: EditProductModalProps) => {
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (open && product) {
      const gallery = product.images && product.images.length ? product.images : (product.image ? [product.image] : []);
      setImages(gallery);
    }
  }, [open, product]);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    loadCategories()
      .then((rows) => {
        if (mounted) setCategories(rows.filter((c) => c.active !== false));
      })
      .catch(() => {
        if (mounted) setCategories([]);
      });
    return () => {
      mounted = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onOpenChange]);


  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!product) return;
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || product.name);
    const category = String(form.get("category") || product.category);
    const selectedCategory = categories.find((c) => c.name === category);
    const wholesalePrice = Number(form.get("wholesalePrice") || product.wholesalePrice);
    const suggestedPrice = Number(form.get("suggestedPrice") || product.suggestedPrice);
    const stock = Number(form.get("stock") || product.stock);
    const minOrder = Number(form.get("minOrder") || product.minOrder);
    const status = String(form.get("status") || (product.active ? "active" : "inactive"));
    const jewelryMaterialRaw = String(form.get("jewelryMaterial") || "");
    const primary = images[0] || product.image;

    if (!isJewelryMaterial(jewelryMaterialRaw)) {
      toast.error(PRODUCT_JEWELRY_MATERIAL_REQUIRED_MSG);
      setSaving(false);
      return;
    }
    if (status === "active" && !isJewelryMaterial(jewelryMaterialRaw)) {
      toast.error(PRODUCT_JEWELRY_MATERIAL_BLOCK_MSG);
      setSaving(false);
      return;
    }

    try {
      const { error } = await supabase
        .from("products")
        .update({
          name,
          category_id: selectedCategory?.id ?? null,
          category_name: category,
          wholesale_price: wholesalePrice,
          suggested_price: suggestedPrice,
          cost_price: Math.round(wholesalePrice * 0.58),
          stock,
          min_order: minOrder,
          image_url: primary,
          images,
          status: status as "active" | "inactive",
          jewelry_material: jewelryMaterialRaw,
        })
        .eq("id", product.id);

      if (error) throw error;

      await onUpdated?.();
      toast.success("Produto atualizado.");
      onOpenChange(false);
    } catch (error) {
      toast.error("Não foi possível salvar as alterações.", { description: getErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    if (!window.confirm(`Excluir o produto "${product.name}"? Esta ação não pode ser desfeita.`)) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("products").delete().eq("id", product.id);
      if (error) throw error;
      await onUpdated?.();
      toast.success("Produto excluído.");
      onOpenChange(false);
    } catch (error) {
      toast.error("Não foi possível excluir.", { description: getErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  if (!open || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm" onClick={() => onOpenChange(false)}>
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-ornate" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <Button type="button" variant="ghost" size="icon" className="absolute right-3 top-3 h-8 w-8" onClick={() => onOpenChange(false)} aria-label="Fechar modal">
          <X className="h-4 w-4" />
        </Button>
        <h2 className="font-display text-2xl mb-1">Editar produto</h2>
        <p className="text-xs text-muted-foreground mb-4">Código: {product.code}</p>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label>Fotos</Label>
            <ProductImageGallery images={images} onChange={setImages} pathPrefix={product.code.toLowerCase()} disabled={saving} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Nome</Label>
            <Input id="edit-name" name="name" defaultValue={product.name} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-category">Categoria</Label>
              <select id="edit-category" name="category" defaultValue={product.category} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {categories.map((c) => <option key={c.id}>{c.name}</option>)}
                {!categories.some((c) => c.name === product.category) && <option>{product.category}</option>}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-jewelryMaterial">Tipo da joia</Label>
              <select
                id="edit-jewelryMaterial"
                name="jewelryMaterial"
                required
                defaultValue={product.jewelryMaterial ?? ""}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="" disabled>
                  Selecione…
                </option>
                {JEWELRY_MATERIAL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {!product.jewelryMaterial && (
                <p className="text-xs text-destructive">{PRODUCT_JEWELRY_MATERIAL_BLOCK_MSG}</p>
              )}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-stock">Estoque</Label>
              <Input id="edit-stock" name="stock" type="number" min="0" defaultValue={product.stock} required />
            </div>
          </div>          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-wholesale">Preço atacado</Label>
              <Input id="edit-wholesale" name="wholesalePrice" type="number" min="0" step="0.01" defaultValue={product.wholesalePrice} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-suggested">Preço sugerido</Label>
              <Input id="edit-suggested" name="suggestedPrice" type="number" min="0" step="0.01" defaultValue={product.suggestedPrice} required />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-min">Mínimo por pedido</Label>
              <Input id="edit-min" name="minOrder" type="number" min="1" defaultValue={product.minOrder} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-status">Status</Label>
              <select id="edit-status" name="status" defaultValue={product.active ? "active" : "inactive"} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between pt-2">
            <Button type="button" variant="outline" onClick={handleDelete} disabled={saving} className="text-destructive hover:text-destructive">Excluir</Button>
            <Button type="submit" variant="gold" disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};
