import { Download, Filter } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { wholesaleOrders, formatBRL, statusColors, statusLabels } from "@/lib/mockData";

const AdminOrders = () => (
  <AdminLayout>
    <PageHeader
      eyebrow="Atacado"
      title="Pedidos"
      description="Pedidos feitos pelas sacoleiras na sua loja de atacado."
      actions={<>
        <Button variant="outline"><Filter className="h-4 w-4" /> Filtrar</Button>
        <Button variant="goldOutline"><Download className="h-4 w-4" /> Exportar</Button>
      </>}
    />

    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-left">
              <th className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Pedido</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Sacoleira</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium hidden sm:table-cell">Data</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium hidden md:table-cell">Itens</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium text-right">Total</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {wholesaleOrders.map(o => (
              <tr key={o.id} className="hover:bg-secondary/30 transition-colors cursor-pointer">
                <td className="px-5 py-4 font-medium">{o.id}</td>
                <td className="px-5 py-4">{o.sacoleiraName}</td>
                <td className="px-5 py-4 text-muted-foreground hidden sm:table-cell">{new Date(o.date).toLocaleDateString("pt-BR")}</td>
                <td className="px-5 py-4 text-muted-foreground hidden md:table-cell">{o.items}</td>
                <td className="px-5 py-4 text-right">
                  <p className="font-medium">{formatBRL(o.total)}</p>
                  {o.discount > 0 && <p className="text-xs text-muted-foreground">−{formatBRL(o.discount)}</p>}
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${statusColors[o.status]}`}>{statusLabels[o.status]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </AdminLayout>
);

export default AdminOrders;
