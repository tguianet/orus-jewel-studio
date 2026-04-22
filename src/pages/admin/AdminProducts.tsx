import { Plus, Search, MoreVertical } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { products, formatBRL } from "@/lib/mockData";

const AdminProducts = () => (
  <AdminLayout>
    <PageHeader
      eyebrow="Catálogo do atacado"
      title="Produtos"
      description="Gerencie o estoque que ficará disponível para suas sacoleiras revenderem."
      actions={<Button variant="gold"><Plus className="h-4 w-4" /> Novo produto</Button>}
    />

    <div className="mb-5 flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou código..." className="pl-9" />
      </div>
      <Button variant="outline">Filtrar</Button>
      <Button variant="outline">Categoria</Button>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map(p => (
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

export default AdminProducts;
