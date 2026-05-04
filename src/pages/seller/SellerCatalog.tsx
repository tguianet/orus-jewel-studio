import { Plus, Check, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SellerLayout } from "@/layouts/SellerLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBRL } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { CatalogProduct, loadCatalogForStore, toggleStoreProduct } from "@/lib/cloudStore";
import { toast } from "sonner";

const SellerCatalog = () => {
  const { profile } = useAuth();
  const storeId = profile?.storeId;
  const [items, setItems] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!storeId) { setLoading(false); return; }
    loadCatalogForStore(storeId).then((list) => {
      setItems(list);
      setPrices(Object.fromEntries(list.map((p) => [p.id, p.resellerPrice])));
      setLoading(false);
    });
  }, [storeId]);

  const categories = useMemo(() => Array.from(new Set(items.map((p) => p.category))), [items]);
  const filtered = useMemo(() => activeCategory === "all" ? items : items.filter((p) => p.category === activeCategory), [items, activeCategory]);

  const handleToggle = async (p: CatalogProduct) => {
    if (!storeId) return;
    setBusy(p.id);
    try {
      const id = await toggleStoreProduct(storeId, p.id, {
        active: !p.selected,
        resalePrice: prices[p.id] ?? p.suggestedPrice,
        storeProductId: p.storeProductId,
      });
      setItems((curr) => curr.map((x) => x.id === p.id ? { ...x, selected: !x.selected, storeProductId: id } : x));
      toast.success(p.selected ? "Removido da sua loja" : "Adicionado à sua loja");
    } catch (e: any) {
      toast.error("Falhou", { description: e.message });
    } finally { setBusy(null); }
  };

  const handlePriceBlur = async (p: CatalogProduct) => {
    if (!storeId || !p.selected || !p.storeProductId) return;
    try {
      await toggleStoreProduct(storeId, p.id, { active: true, resalePrice: prices[p.id] ?? p.suggestedPrice, storeProductId: p.storeProductId });
      toast.success("Preço atualizado");
    } catch { toast.error("Não foi possível atualizar o preço"); }
  };

  return (
    <SellerLayout>
      <PageHeader eyebrow="Catálogo Aura" title="Escolha seus produtos" description="Selecione as peças e defina seu preço de revenda." />

      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2"/> Carregando...</div>
      ) : !storeId ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">Sua loja ainda não foi configurada.</div>
      ) : (
        <>
          <div className="mb-6 -mx-4 px-4 overflow-x-auto">
            <div className="flex gap-2 min-w-max pb-1">
              <button onClick={() => setActiveCategory("all")} className={cn("shrink-0 rounded-full border px-4 py-1.5 text-sm transition-all", activeCategory === "all" ? "border-primary bg-gradient-gold-soft text-primary shadow-gold" : "border-border text-muted-foreground hover:border-primary/40")}>Todas <span className="ml-1.5 text-[10px] opacity-70">({items.length})</span></button>
              {categories.map((c) => (
                <button key={c} onClick={() => setActiveCategory(c)} className={cn("shrink-0 rounded-full border px-4 py-1.5 text-sm transition-all", activeCategory === c ? "border-primary bg-gradient-gold-soft text-primary shadow-gold" : "border-border text-muted-foreground hover:border-primary/40")}>
                  {c}<span className="ml-1.5 text-[10px] opacity-70">({items.filter((p) => p.category === c).length})</span>
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">Nenhum produto disponível ainda. O admin precisa cadastrar produtos.</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => (
                <div key={p.id} className={cn("group relative rounded-xl border bg-card overflow-hidden transition-all", p.selected ? "border-primary shadow-gold" : "border-border hover:border-primary/40")}>
                  <div className="aspect-square overflow-hidden">
                    <img src={p.image} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{p.category}</p>
                      <h3 className="font-display text-lg leading-tight">{p.name}</h3>
                    </div>
                    <div className="flex items-end justify-between">
                      <div><p className="text-xs text-muted-foreground">Você paga</p><p className="font-medium">{formatBRL(p.wholesalePrice)}</p></div>
                      <div className="text-right"><p className="text-xs text-muted-foreground">Sugerido</p><p className="font-medium text-primary">{formatBRL(p.suggestedPrice)}</p></div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Seu preço de revenda</label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                        <Input type="number" min={0} value={prices[p.id] ?? p.suggestedPrice} onChange={(e) => setPrices({ ...prices, [p.id]: Number(e.target.value) })} onBlur={() => handlePriceBlur(p)} className="pl-9 h-9"/>
                      </div>
                    </div>
                    <Button onClick={() => handleToggle(p)} disabled={busy === p.id} variant={p.selected ? "gold" : "outline"} size="sm" className="w-full">
                      {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin"/> : p.selected ? <><Check className="h-4 w-4"/> Na minha loja</> : <><Plus className="h-4 w-4"/> Adicionar</>}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </SellerLayout>
  );
};

export default SellerCatalog;
