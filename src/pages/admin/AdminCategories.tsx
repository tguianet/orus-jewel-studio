import { Plus, Edit2 } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { categories } from "@/lib/mockData";

const AdminCategories = () => (
  <AdminLayout>
    <PageHeader
      eyebrow="Organização"
      title="Categorias"
      description="Categorias usadas para classificar suas joias no catálogo."
      actions={<Button variant="gold"><Plus className="h-4 w-4" /> Nova categoria</Button>}
    />

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map(c => (
        <div key={c.id} className="group rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">/{c.slug}</p>
              <h3 className="font-display text-2xl">{c.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{c.count} produtos</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <Edit2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  </AdminLayout>
);

export default AdminCategories;
