import { FormEvent, useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { categories, products, Product } from "@/lib/mockData";

interface NewProductModalProps {
  onCreate?: (product: Product) => void;
}

export const NewProductModal = ({ onCreate }: NewProductModalProps) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "Nova joia Orus");
    const category = String(form.get("category") || categories[0].name);
    const wholesalePrice = Number(form.get("wholesalePrice") || 0);
    const suggestedPrice = Number(form.get("suggestedPrice") || wholesalePrice * 2);
    const stock = Number(form.get("stock") || 0);

    onCreate?.({
      id: `p${Date.now()}`,
      code: `ORS-${category.charAt(0).toUpperCase()}${Date.now().toString().slice(-3)}`,
      name,
      category,
      description: "Produto cadastrado no protótipo para apresentação do fluxo administrativo.",
      costPrice: Math.round(wholesalePrice * 0.58),
      wholesalePrice,
      suggestedPrice,
      stock,
      minOrder: 2,
      image: products[0].image,
      active: true,
    });

    event.currentTarget.reset();
    setOpen(false);
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
              <Button type="submit" variant="gold" className="w-full">Cadastrar produto</Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};