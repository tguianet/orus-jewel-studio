import { useMemo, useState } from "react";
import { Download, Filter, X } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { wholesaleOrders, formatBRL, statusColors, statusLabels } from "@/lib/mockData";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AdminOrders = () => {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return wholesaleOrders.filter((order) => {
      const matchesSearch = !term
        || order.id.toLowerCase().includes(term)
        || order.sacoleiraName.toLowerCase().includes(term);
      const matchesStatus = status === "todos" || order.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [search, status]);

  const clearFilters = () => {
    setSearch("");
    setStatus("todos");
  };

  return (
    <AdminLayout>
      <PageHeader
        eyebrow="Atacado"
        title="Pedidos"
        description="Pedidos feitos pelas sacoleiras na sua loja de atacado."
        actions={<>
          <Button variant="outline" onClick={() => setFiltersOpen((current) => !current)}>
            <Filter className="h-4 w-4" /> Filtrar
          </Button>
          <Button variant="goldOutline"><Download className="h-4 w-4" /> Exportar</Button>
        </>}
      />

      {filtersOpen && (
        <div className="mb-5 rounded-xl border border-border bg-card p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_auto] md:items-end">
            <div className="space-y-2">
              <label htmlFor="order-search" className="text-sm font-medium">Buscar pedido ou sacoleira</label>
              <Input
                id="order-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ex: PED-1042 ou Marina"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="aguardando">Aguardando pagamento</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="separado">Separado</SelectItem>
                  <SelectItem value="enviado">Enviado</SelectItem>
                  <SelectItem value="entregue">Entregue</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" onClick={clearFilters} className="justify-start md:justify-center">
              <X className="h-4 w-4" /> Limpar
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{filteredOrders.length} pedido(s) encontrado(s)</p>
        </div>
      )}

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
            {filteredOrders.map(o => (
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
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  Nenhum pedido encontrado com os filtros atuais.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </AdminLayout>
  );
};

export default AdminOrders;
