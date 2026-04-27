import { Check, Search, MoreVertical, Tags } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NewProductModal } from "@/components/NewProductModal";
import { products, formatBRL, Product, categories } from "@/lib/mockData";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

type SortOption = "default" | "price-asc" | "price-desc" | "stock-asc" | "stock-desc";

const getCategoryFromParams = (searchParams: URLSearchParams) => {
  const category = searchParams.get("categoria");
  return category && categories.some((item) => item.name === category) ? category : "Todas";
};

const AdminProducts = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<Product[]>(products);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(() => getCategoryFromParams(searchParams));
  const [highlightedCategory, setHighlightedCategory] = useState<string>(() => getCategoryFromParams(searchParams));
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("default");

  useEffect(() => {
    setSelectedCategory(getCategoryFromParams(searchParams));
  }, [searchParams]);

  useEffect(() => {
    const loadProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,code,name,description,cost_price,wholesale_price,suggested_price,stock,min_order,image_url,category_name,categories(name)")
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Não foi possível carregar os produtos salvos.");
        return;
      }

      const cloudProducts = (data ?? []).map((product) => ({
        id: product.id,
        code: product.code,
        name: product.name,
        category: product.category_name || product.categories?.name || "Sem categoria",
        description: product.description,
        costPrice: Number(product.cost_price ?? 0),
        wholesalePrice: Number(product.wholesale_price ?? 0),
        suggestedPrice: Number(product.suggested_price ?? 0),
        stock: product.stock ?? 0,
        minOrder: product.min_order ?? 1,
        image: product.image_url || products[0].image,
        active: true,
      }));

      setItems([...cloudProducts, ...products.filter((mock) => !cloudProducts.some((product) => product.code === mock.code))]);
    };

    loadProducts();
  }, []);

  const visibleItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = items.filter((product) => {
      const matchesCategory = selectedCategory === "Todas" || product.category === selectedCategory;
      const matchesSearch = !term
        || product.name.toLowerCase().includes(term)
        || product.code.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });

    return filtered.sort((a, b) => {
      if (sortBy === "price-asc") return a.wholesalePrice - b.wholesalePrice;
      if (sortBy === "price-desc") return b.wholesalePrice - a.wholesalePrice;
      if (sortBy === "stock-asc") return a.stock - b.stock;
      if (sortBy === "stock-desc") return b.stock - a.stock;
      return 0;
    });
  }, [items, selectedCategory, search, sortBy]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    categories.forEach((category) => counts.set(category.name, 0));
    items.forEach((product) => counts.set(product.category, (counts.get(product.category) ?? 0) + 1));
    return counts;
  }, [items]);

  const selectCategory = (categoryName: string) => {
    setHighlightedCategory(categoryName);
    setSelectedCategory(categoryName);
    const nextParams = new URLSearchParams(searchParams);
    if (categoryName === "Todas") nextParams.delete("categoria");
    else nextParams.set("categoria", categoryName);
    setSearchParams(nextParams);
    window.setTimeout(() => setCategoryOpen(false), 450);
  };

  return (
    <AdminLayout>
      <PageHeader
        eyebrow="Catálogo do atacado"
        title="Produtos"
        description="Gerencie o estoque que ficará disponível para suas sacoleiras revenderem."
        actions={<NewProductModal onCreate={(product) => setItems(current => [product, ...current])} />}
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
            {categories.map((category) => (
              <Button key={category.id} variant={highlightedCategory === category.name ? "gold" : "outline"} className="justify-between" onClick={() => selectCategory(category.name)}>
                <span className="flex items-center gap-2">{highlightedCategory === category.name && <Check className="h-4 w-4" />} {category.name}</span>
                <span className="text-xs text-muted-foreground">{categoryCounts.get(category.name) ?? 0}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>

    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <p className="text-sm text-muted-foreground">Categoria atual: <span className="font-medium text-foreground">{selectedCategory}</span>{search.trim() && <> · Busca: <span className="font-medium text-foreground">{search.trim()}</span></>}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
        </Select>
        <p className="text-sm text-primary">{visibleItems.length} produto(s)</p>
      </div>
    </div>

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
      {categories.map((category) => (
        <Button
          key={category.id}
          type="button"
          variant={selectedCategory === category.name ? "gold" : "outline"}
          size="sm"
          className="shrink-0 rounded-full"
          onClick={() => selectCategory(category.name)}
        >
          {category.name} <span className="ml-1 text-xs opacity-70">{categoryCounts.get(category.name) ?? 0}</span>
        </Button>
      ))}
    </div>

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {visibleItems.map(p => (
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
      {visibleItems.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground sm:col-span-2 lg:col-span-3 xl:col-span-4">
          Nenhum produto encontrado nessa categoria.
        </div>
      )}
    </div>
  </AdminLayout>
  );
};

export default AdminProducts;
