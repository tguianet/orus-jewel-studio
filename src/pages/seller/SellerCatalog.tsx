import { Plus, Check } from "lucide-react";
import { useState } from "react";
import { SellerLayout } from "@/layouts/SellerLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { products, formatBRL } from "@/lib/mockData";
import { cn } from "@/lib/utils";

const SellerCatalog = () => {
  const [selected, setSelected] = useState<string[]>(["p1", "p2", "p3", "p4"]);
  const toggle = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  return (
    <SellerLayout>
      <PageHeader
        eyebrow="Catálogo Aura"
        title="Escolha seus produtos"
        description="Selecione as peças que você quer expor na sua loja virtual."
        actions={<Button variant="gold">Salvar seleção ({selected.length})</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map(p => {
          const isSelected = selected.includes(p.id);
          return (
            <div key={p.id} className={cn("group relative rounded-xl border bg-card overflow-hidden transition-all duration-500", isSelected ? "border-primary shadow-gold" : "border-border hover:border-primary/40")}>
              <div className="aspect-square overflow-hidden">
                <img src={p.image} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              </div>
              <div className="p-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{p.category}</p>
                <h3 className="font-display text-lg leading-tight mb-2">{p.name}</h3>
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Você paga</p>
                    <p className="font-medium">{formatBRL(p.wholesalePrice)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Sugerido</p>
                    <p className="font-medium text-primary">{formatBRL(p.suggestedPrice)}</p>
                  </div>
                </div>
                <Button
                  onClick={() => toggle(p.id)}
                  variant={isSelected ? "gold" : "outline"}
                  size="sm"
                  className="w-full"
                >
                  {isSelected ? <><Check className="h-4 w-4" /> Na minha loja</> : <><Plus className="h-4 w-4" /> Adicionar</>}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </SellerLayout>
  );
};

export default SellerCatalog;
