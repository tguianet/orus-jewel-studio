import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { SellerLayout } from "@/layouts/SellerLayout";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { formatBRL } from "@/lib/mockData";
import { useAuth } from "@/contexts/AuthContext";
import { CatalogProduct, loadCatalogForStore, toggleStoreProduct } from "@/lib/cloudStore";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const SellerProducts = () => {
  const { profile } = useAuth();
  const storeId = profile?.storeId;
  const [items, setItems] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState<Record<string, number>>({});

  const reload = () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    loadCatalogForStore(storeId).then((list) => {
      const mine = list.filter((p) => p.selected);
      setItems(mine);
      setPrices(Object.fromEntries(mine.map((p) => [p.id, p.resellerPrice])));
      setLoading(false);
    });
  };

  useEffect(() => { reload(); }, [storeId]);

  const myProducts = useMemo(() => items, [items]);

  const handlePriceBlur = async (p: CatalogProduct) => {
    if (!storeId || !p.storeProductId) return;
    try {
      await toggleStoreProduct(storeId, p.id, { active: true, resalePrice: prices[p.id] ?? p.suggestedPrice, storeProductId: p.storeProductId });
      toast.success("Preço atualizado");
    } catch { toast.error("Não foi possível atualizar o preço"); }
  };

  const handleToggleActive = async (p: CatalogProduct, active: boolean) => {
    if (!storeId || !p.storeProductId) return;
    try {
      await toggleStoreProduct(storeId, p.id, { active, resalePrice: prices[p.id] ?? p.suggestedPrice, storeProductId: p.storeProductId });
      if (!active) {
        setItems((curr) => curr.filter((x) => x.id !== p.id));
        toast.success("Removido da sua loja");
      } else {
        toast.success("Atualizado");
      }
    } catch { toast.error("Não foi possível atualizar"); }
  };

  return (
    <SellerLayout>
      <PageHeader eyebrow="Sua vitrine" title="Meus produtos" description="Defina o preço de revenda para cada peça da sua loja." />

      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2"/> Carregando...</div>
      ) : !storeId ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">Sua loja ainda não foi configurada.</div>
      ) : myProducts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-4">
          <p className="text-muted-foreground">Você ainda não adicionou nenhum produto à sua loja.</p>
          <Button asChild variant="gold"><Link to="/sacoleira/catalogo">Ir para o catálogo</Link></Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-left">
                  <th className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Produto</th>
                  <th className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium hidden md:table-cell">Você paga</th>
                  <th className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium hidden lg:table-cell">Sugerido</th>
                  <th className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Seu preço</th>
                  <th className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Ativo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {myProducts.map(p => (
                  <tr key={p.id}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <img src={p.image} alt={p.name} loading="lazy" className="h-12 w-12 rounded-md object-cover border border-border" />
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground hidden md:table-cell">{formatBRL(p.wholesalePrice)}</td>
                    <td className="px-5 py-4 text-primary hidden lg:table-cell">{formatBRL(p.suggestedPrice)}</td>
                    <td className="px-5 py-4">
                      <div className="relative w-32">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                        <Input
                          type="number"
                          min={0}
                          value={prices[p.id] ?? p.suggestedPrice}
                          onChange={(e) => setPrices({ ...prices, [p.id]: Number(e.target.value) })}
                          onBlur={() => handlePriceBlur(p)}
                          className="pl-9 h-9"
                        />
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Switch checked={p.selected} onCheckedChange={(v) => handleToggleActive(p, v)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </SellerLayout>
  );
};

export default SellerProducts;
