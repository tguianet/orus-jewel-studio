import { FormEvent, useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
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
  PRODUCT_JEWELRY_MATERIAL_REQUIRED_MSG,
  isJewelryMaterial,
} from "@/lib/jewelryMaterial";

interface NewProductModalProps {
  onCreate?: (product: Product) => void | Promise<void>;
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) return String(error.message);
  return "Erro desconhecido.";
};

export const NewProductModal = ({ onCreate }: NewProductModalProps) => {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    setCategoriesError(null);
    loadCategories()
      .then((rows) => {
        if (mounted) setCategories(rows.filter((c) => c.active !== false));
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setCategories([]);
        setCategoriesError(err instanceof Error ? err.message : "Não foi possível carregar categorias.");
      });
    return () => {
      mounted = false;
    };
  }, [open]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const name = String(form.get("name") || "Nova joia Amada Amante");
    const category = String(form.get("category") || categories[0]?.name || "Joias");
    const selectedCategory = categories.find((c) => c.name === category);
    const wholesalePrice = Number(form.get("wholesalePrice") || 0);
    const suggestedPrice = Number(form.get("suggestedPrice") || wholesalePrice * 2);
    const stock = Number(form.get("stock") || 0);
    const jewelryMaterial = String(form.get("jewelryMaterial") || "");
    const code = `AUR-${category.charAt(0).toUpperCase()}${Date.now().toString().slice(-3)}`;
    const primary = images[0] || null;
    const computedCost = Math.round(wholesalePrice * 0.58);

    if (!isJewelryMaterial(jewelryMaterial)) {
      toast.error(PRODUCT_JEWELRY_MATERIAL_REQUIRED_MSG);
      setSaving(false);
      return;
    }

    try {
      const { data: savedProduct, error: productError } = await supabase
        .from("products")
        .insert({
          code,
          name,
          category_id: selectedCategory?.id ?? null,
          category_name: category,
          seller_store_id: null,
          description: "Produto cadastrado pelo painel Amada Amante.",
          cost_price: computedCost,
          wholesale_price: wholesalePrice,
          suggested_price: suggestedPrice,
          stock,
          min_order: 2,
          image_url: primary,
          images,
          status: "active",
          jewelry_material: jewelryMaterial,
        })
        // Sem cost_price no RETURNING — coluna revogada para authenticated SELECT.
        .select("id,code,name,description,wholesale_price,suggested_price,stock,min_order,image_url,images,category_name,jewelry_material")
        .single();

      if (productError) throw productError;

      const savedImages: string[] = Array.isArray(savedProduct.images) ? savedProduct.images : images;
      const createdProduct: Product = {
        id: savedProduct.id,
        code: savedProduct.code,
        name: savedProduct.name,
        category: savedProduct.category_name || category,
        description: savedProduct.description,
        costPrice: computedCost,
        wholesalePrice: Number(savedProduct.wholesale_price ?? 0),
        suggestedPrice: Number(savedProduct.suggested_price ?? 0),
        stock: savedProduct.stock ?? 0,
        minOrder: savedProduct.min_order ?? 1,
        image: savedProduct.image_url || primary || "/placeholder.svg",
        images: savedImages,
        active: true,
        jewelryMaterial: jewelryMaterial,
      };

      try {
        await onCreate?.(createdProduct);
      } catch {
        toast.warning("Produto salvo, mas a lista não atualizou automaticamente. Recarregue a página.");
      }

      formEl?.reset?.();
      setImages([]);
      setOpen(false);
      toast.success("Produto salvo com sucesso.");
    } catch (error) {
      toast.error("Não foi possível salvar o produto.", {
        description: getErrorMessage(error),
      });
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
                <Label>Fotos do produto</Label>
                <ProductImageGallery images={images} onChange={setImages} pathPrefix="produto" disabled={saving} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name">Nome da joia</Label>
                <Input id="name" name="name" placeholder="Ex: Brinco Pérola Dourada" required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="category">Categoria</Label>
                  <select id="category" name="category" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" disabled={categories.length === 0}>
                    {categories.length === 0 ? (
                      <option value="">Nenhuma categoria disponível</option>
                    ) : (
                      categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)
                    )}
                  </select>
                  {categoriesError && <p className="text-xs text-destructive">{categoriesError}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="jewelryMaterial">Tipo da joia</Label>
                  <select
                    id="jewelryMaterial"
                    name="jewelryMaterial"
                    required
                    defaultValue=""
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
                  <p className="text-[11px] text-muted-foreground">
                    Material comercial para comissão MLM (não é a categoria).
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="stock">Estoque</Label>
                  <Input id="stock" name="stock" type="number" min="0" defaultValue="10" required />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="wholesalePrice">Preço atacado</Label>
                  <Input id="wholesalePrice" name="wholesalePrice" type="number" min="1" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="suggestedPrice">Preço sugerido</Label>
                  <Input id="suggestedPrice" name="suggestedPrice" type="number" min="1" required />
                </div>
              </div>
              <Button type="submit" variant="gold" className="w-full" disabled={saving || categories.length === 0}>{saving ? "Salvando..." : "Cadastrar produto"}</Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
