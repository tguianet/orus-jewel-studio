import { Check, Search, Pencil, Tags, Trash2, CheckSquare, Square, X } from "lucide-react";
import { EditProductModal } from "@/components/EditProductModal";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { NewProductModal } from "@/components/NewProductModal";
import { BulkUploadModal } from "@/components/BulkUploadModal";
import { formatBRL } from "@/lib/format";
import type { Product } from "@/types/commerce";
import { loadAdminProducts } from "@/lib/cloudStore";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  PRODUCT_JEWELRY_MATERIAL_BLOCK_MSG,
  jewelryMaterialLabel,
} from "@/lib/jewelryMaterial";

type SortOption = "default" | "price-asc" | "price-desc" | "stock-asc" | "stock-desc";
type JewelryFilter = "all" | "pending" | "gold" | "silver" | "plated";

const getCategoryFromParams = (searchParams: URLSearchParams) => {
  const category = searchParams.get("categoria");
  return category || "Todas";
};

const AdminProducts = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(() => getCategoryFromParams(searchParams));
  const [highlightedCategory, setHighlightedCategory] = useState<string>(() => getCategoryFromParams(searchParams));
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const [jewelryFilter, setJewelryFilter] = useState<JewelryFilter>("all");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteCategoryOpen, setDeleteCategoryOpen] = useState(false);
  const [deleteSelectedOpen, setDeleteSelectedOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const loadProducts = useCallback(async () => {
    try {
      const rows = await loadAdminProducts();
      setItems(
        rows.map((product) => ({
          ...product,
          category: product.category || "Sem categoria",
          image: product.image || "/placeholder.svg",
        })),
      );
    } catch {
      toast.error("Não foi possível carregar os produtos salvos.");
    }
  }, []);

  useEffect(() => {
    setSelectedCategory(getCategoryFromParams(searchParams));
  }, [searchParams]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const pendingJewelryCount = useMemo(
    () => items.filter((p) => !p.jewelryMaterial).length,
    [items],
  );

  const visibleItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = items.filter((product) => {
      const matchesCategory = selectedCategory === "Todas" || product.category === selectedCategory;
      const matchesSearch = !term
        || product.name.toLowerCase().includes(term)
        || product.code.toLowerCase().includes(term);
      const matchesJewelry =
        jewelryFilter === "all"
        || (jewelryFilter === "pending" && !product.jewelryMaterial)
        || product.jewelryMaterial === jewelryFilter;
      return matchesCategory && matchesSearch && matchesJewelry;
    });

    return filtered.sort((a, b) => {
      if (sortBy === "price-asc") return a.wholesalePrice - b.wholesalePrice;
      if (sortBy === "price-desc") return b.wholesalePrice - a.wholesalePrice;
      if (sortBy === "stock-asc") return a.stock - b.stock;
      if (sortBy === "stock-desc") return b.stock - a.stock;
      return 0;
    });
  }, [items, selectedCategory, search, sortBy, jewelryFilter]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach((product) => counts.set(product.category, (counts.get(product.category) ?? 0) + 1));
    return counts;
  }, [items]);

  const productCategories = useMemo(() => Array.from(categoryCounts.keys()).sort((a, b) => a.localeCompare(b, "pt-BR")), [categoryCounts]);

  const selectCategory = (categoryName: string) => {
    setHighlightedCategory(categoryName);
    setSelectedCategory(categoryName);
    const nextParams = new URLSearchParams(searchParams);
    if (categoryName === "Todas") nextParams.delete("categoria");
    else nextParams.set("categoria", categoryName);
    setSearchParams(nextParams);
    window.setTimeout(() => setCategoryOpen(false), 450);
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedIds(new Set(visibleItems.map((p) => p.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const exitSelectMode = () => {
    setSelectMode(false);
    clearSelection();
  };

  const deleteProductIds = async (ids: string[]) => {
    if (!ids.length) return;
    setDeleting(true);
    try {
      // remove vínculos em lojas das sacoleiras
      const { error: linkErr } = await supabase.from("store_products").delete().in("product_id", ids);
      if (linkErr) throw linkErr;
      const { error } = await supabase.from("products").delete().in("id", ids);
      if (error) throw error;
      toast.success(`${ids.length} produto(s) excluído(s).`);
      clearSelection();
      setSelectMode(false);
      setDeleteCategoryOpen(false);
      setDeleteSelectedOpen(false);
      setConfirmText("");
      await loadProducts();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir os produtos.");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCategory = () => {
    const ids = items.filter((p) => p.category === selectedCategory).map((p) => p.id);
    deleteProductIds(ids);
  };

  const handleDeleteSelected = () => {
    deleteProductIds(Array.from(selectedIds));
  };


  return (
    <AdminLayout>
      <PageHeader
        eyebrow="Catálogo do atacado"
        title="Produtos"
        description="Gerencie o estoque que ficará disponível para suas sacoleiras revenderem."
        actions={<><BulkUploadModal onDone={loadProducts} /><NewProductModal onCreate={loadProducts} /></>}
      />

    <div className="mb-5 flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome ou código..."
          className="pl-9"
        />
      </div>
      <Button variant="outline">Filtrar</Button>
      <Dialog open={categoryOpen} onOpenChange={(nextOpen) => {
        setCategoryOpen(nextOpen);
        if (nextOpen) setHighlightedCategory(selectedCategory);
      }}>
        <DialogTrigger asChild>
          <Button variant="outline"><Tags className="h-4 w-4" /> Categoria</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selecionar categoria</DialogTitle>
            <DialogDescription>Escolha uma categoria para abrir os produtos correspondentes.</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Produtos / Categorias / <span className="text-primary">{highlightedCategory}</span></p>
            <p className="mt-1 text-sm text-muted-foreground">
              {highlightedCategory === "Todas" ? items.length : categoryCounts.get(highlightedCategory) ?? 0} produto(s) nesta seleção
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button variant={highlightedCategory === "Todas" ? "gold" : "outline"} className="justify-between" onClick={() => selectCategory("Todas")}>
              <span className="flex items-center gap-2">{highlightedCategory === "Todas" && <Check className="h-4 w-4" />} Todas as categorias</span>
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </Button>
            {productCategories.map((category) => (
              <Button key={category} variant={highlightedCategory === category ? "gold" : "outline"} className="justify-between" onClick={() => selectCategory(category)}>
                <span className="flex items-center gap-2">{highlightedCategory === category && <Check className="h-4 w-4" />} {category}</span>
                <span className="text-xs text-muted-foreground">{categoryCounts.get(category) ?? 0}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>

    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
      <p className="text-sm text-muted-foreground">Categoria atual: <span className="font-medium text-foreground">{selectedCategory}</span>{search.trim() && <> · Busca: <span className="font-medium text-foreground">{search.trim()}</span></>}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
        <Select value={jewelryFilter} onValueChange={(value) => setJewelryFilter(value as JewelryFilter)}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Tipo da joia" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="pending">Pendentes de classificação{pendingJewelryCount > 0 ? ` (${pendingJewelryCount})` : ""}</SelectItem>
            <SelectItem value="gold">Ouro</SelectItem>
            <SelectItem value="silver">Prata</SelectItem>
            <SelectItem value="plated">Folheado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Ordem padrão</SelectItem>
            <SelectItem value="price-asc">Menor preço</SelectItem>
            <SelectItem value="price-desc">Maior preço</SelectItem>
            <SelectItem value="stock-asc">Menor estoque</SelectItem>
            <SelectItem value="stock-desc">Maior estoque</SelectItem>
          </SelectContent>
        </Select>        {!selectMode ? (
          <Button variant="outline" size="sm" onClick={() => setSelectMode(true)}>
            <CheckSquare className="h-4 w-4" /> Selecionar
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={exitSelectMode}>
            <X className="h-4 w-4" /> Sair da seleção
          </Button>
        )}
        {selectedCategory !== "Todas" && (
          <Button
            variant="outline"
            size="sm"
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => { setConfirmText(""); setDeleteCategoryOpen(true); }}
          >
            <Trash2 className="h-4 w-4" /> Excluir categoria ({categoryCounts.get(selectedCategory) ?? 0})
          </Button>
        )}
        <p className="text-sm text-primary">{visibleItems.length} produto(s)</p>
      </div>
    </div>

    {pendingJewelryCount > 0 && (
      <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
        <p className="font-medium text-destructive">
          {pendingJewelryCount} produto(s) pendente(s) de classificação de tipo da joia.
        </p>
        <p className="text-muted-foreground mt-1">{PRODUCT_JEWELRY_MATERIAL_BLOCK_MSG}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => setJewelryFilter("pending")}
        >
          Ver pendentes
        </Button>
      </div>
    )}

    {selectMode && (
      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm">
          <span className="font-medium text-foreground">{selectedIds.size}</span> produto(s) selecionado(s)
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={selectAllVisible}>
            <CheckSquare className="h-4 w-4" /> Selecionar todos ({visibleItems.length})
          </Button>
          <Button variant="outline" size="sm" onClick={clearSelection} disabled={selectedIds.size === 0}>
            <Square className="h-4 w-4" /> Limpar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={selectedIds.size === 0}
            onClick={() => setDeleteSelectedOpen(true)}
          >
            <Trash2 className="h-4 w-4" /> Excluir selecionados
          </Button>
        </div>
      </div>
    )}

    <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
      <Button
        type="button"
        variant={selectedCategory === "Todas" ? "gold" : "outline"}
        size="sm"
        className="shrink-0 rounded-full"
        onClick={() => selectCategory("Todas")}
      >
        Todas <span className="ml-1 text-xs opacity-70">{items.length}</span>
      </Button>
      {productCategories.map((category) => (
        <Button
          key={category}
          type="button"
          variant={selectedCategory === category ? "gold" : "outline"}
          size="sm"
          className="shrink-0 rounded-full"
          onClick={() => selectCategory(category)}
        >
          {category} <span className="ml-1 text-xs opacity-70">{categoryCounts.get(category) ?? 0}</span>
        </Button>
      ))}
    </div>

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {visibleItems.map(p => {
        const isSelected = selectedIds.has(p.id);
        return (
        <div
          key={p.id}
          className={`group rounded-xl border bg-card overflow-hidden transition-all duration-500 ${isSelected ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/40"} ${selectMode ? "cursor-pointer" : ""}`}
          onClick={() => { if (selectMode) toggleSelected(p.id); }}
        >
          <div className="aspect-square overflow-hidden relative">
            <img src={p.image} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${p.active ? "bg-success/15 text-success border-success/30" : "bg-muted text-muted-foreground border-border"}`}>
              {p.active ? "Ativo" : "Inativo"}
            </span>
            {!p.jewelryMaterial && (
              <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border bg-destructive/15 text-destructive border-destructive/30">
                Tipo pendente
              </span>
            )}
            {selectMode && (
              <div className="absolute top-2 left-2 rounded-md bg-background/90 p-1 shadow">
                <Checkbox checked={isSelected} onCheckedChange={() => toggleSelected(p.id)} onClick={(e) => e.stopPropagation()} />
              </div>
            )}
          </div>
          <div className="p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{p.category} · {p.code}</p>
            <h3 className="font-display text-lg leading-tight mb-2">{p.name}</h3>
            <p className="text-xs text-muted-foreground mb-2">
              Tipo: <span className="text-foreground">{jewelryMaterialLabel(p.jewelryMaterial)}</span>
            </p>            <div className="flex items-end justify-between">
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
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={(e) => { e.stopPropagation(); setEditingProduct(p); }}>
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Button>
            </div>
          </div>
        </div>
        );
      })}
      {visibleItems.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground sm:col-span-2 lg:col-span-3 xl:col-span-4">
          Nenhum produto encontrado nessa categoria.
        </div>
      )}
    </div>
    <EditProductModal
      product={editingProduct}
      open={!!editingProduct}
      onOpenChange={(o) => { if (!o) setEditingProduct(null); }}
      onUpdated={loadProducts}
    />

    <Dialog open={deleteCategoryOpen} onOpenChange={(o) => { setDeleteCategoryOpen(o); if (!o) setConfirmText(""); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir todos os produtos da categoria</DialogTitle>
          <DialogDescription>
            Você está prestes a excluir <strong>{categoryCounts.get(selectedCategory) ?? 0}</strong> produto(s) da categoria <strong>"{selectedCategory}"</strong>. Essa ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Para confirmar, digite o nome da categoria:</Label>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={selectedCategory}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteCategoryOpen(false)} disabled={deleting}>Cancelar</Button>
          <Button
            variant="destructive"
            disabled={deleting || confirmText.trim() !== selectedCategory}
            onClick={handleDeleteCategory}
          >
            <Trash2 className="h-4 w-4" /> {deleting ? "Excluindo..." : "Excluir tudo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={deleteSelectedOpen} onOpenChange={setDeleteSelectedOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir produtos selecionados</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir <strong>{selectedIds.size}</strong> produto(s)? Essa ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteSelectedOpen(false)} disabled={deleting}>Cancelar</Button>
          <Button variant="destructive" disabled={deleting} onClick={handleDeleteSelected}>
            <Trash2 className="h-4 w-4" /> {deleting ? "Excluindo..." : "Excluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

  </AdminLayout>
  );
};

export default AdminProducts;
