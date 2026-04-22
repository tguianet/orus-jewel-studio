import { SellerLayout } from "@/layouts/SellerLayout";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { products, formatBRL } from "@/lib/mockData";

const SellerProducts = () => (
  <SellerLayout>
    <PageHeader eyebrow="Sua vitrine" title="Meus produtos" description="Defina o preço de revenda para cada peça da sua loja." />

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
            {products.slice(0, 4).map(p => (
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
                    <Input defaultValue={p.suggestedPrice} className="pl-9 h-9" />
                  </div>
                </td>
                <td className="px-5 py-4"><Switch defaultChecked /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </SellerLayout>
);

export default SellerProducts;
