import { Plus, Search, MoreVertical, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { products, categories, formatBRL, Product } from "@/lib/mockData";

const AdminProducts = () => {
  const [items, setItems] = useState<Product[]>(products);
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

    setItems(current => [
      {
        id: `p${Date.now()}`,
        code: `ORS-${category.charAt(0).toUpperCase()}${String(current.length + 1).padStart(3, "0")}`,
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
      },
      ...current,
    ]);
    event.currentTarget.reset();
    setOpen(false);
  };

  return (
    <AdminLayout>
      <PageHeader
        eyebrow="Catálogo do atacado"
        title="Produtos"
        description="Gerencie o estoque que ficará disponível para suas sacoleiras revenderem."
        actions={
          <Button type="button" variant="gold" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Novo produto
          </Button>
        }
      />

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

    <div className="mb-5 flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou código..." className="pl-9" />
      </div>
      <Button variant="outline">Filtrar</Button>
      <Button variant="outline">Categoria</Button>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map(p => (
        <div key={p.id} className="group rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 transition-all duration-500">
          <div className="aspect-square overflow-hidden relative">
            <img src={p.image} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border bg-success/15 text-success border-success/30">Ativo</span>
          </div>
          <div className="p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{p.category} · {p.code}</p>
            <h3 className="font-display text-lg leading-tight mb-2">{p.name}</h3>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Atacado</p>
                <p className="font-medium text-primary">{formatBRL(p.wholesalePrice)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Estoque</p>
                <p className={`font-medium ${p.stock < 10 ? "text-warning" : "text-foreground"}`}>{p.stock} un.</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Mín. {p.minOrder} un.</span>
              <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  </AdminLayout>
  );
};

export default AdminProducts;
