import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { loadAllOrders, updateOrderStatus } from "@/lib/cloudStore";
import { formatBRL, statusColors } from "@/lib/mockData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const STATUSES = ["new", "paid", "shipped", "delivered", "cancelled"];

const AdminOrders = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => loadAllOrders().then((d) => { setRows(d); setLoading(false); });
  useEffect(() => { refresh(); }, []);

  const change = async (id: string, status: string) => {
    try { await updateOrderStatus(id, status); toast.success(status === "paid" ? "Pedido pago: comissões liberadas." : "Status atualizado"); refresh(); }
    catch (e: any) { toast.error("Falhou", { description: e.message }); }
  };

  return (
    <AdminLayout>
      <PageHeader eyebrow="Pedidos" title="Todos os pedidos" description="Acompanhe e mude o status. Pagamento gera comissões MLM." />
      {loading ? <div className="flex items-center justify-center h-40 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2"/> Carregando...</div> : (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-secondary/40 text-left">
              <th className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Cliente</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium hidden sm:table-cell">Loja</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium hidden md:table-cell">Data</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium text-right">Total</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {rows.map((o: any) => (
                <tr key={o.id} className="hover:bg-secondary/30">
                  <td className="px-5 py-4"><p className="font-medium">{o.customer_name}</p><p className="text-xs text-muted-foreground">{o.customer_phone}</p></td>
                  <td className="px-5 py-4 hidden sm:table-cell text-muted-foreground">{o.seller_stores?.store_name || "—"}</td>
                  <td className="px-5 py-4 hidden md:table-cell text-muted-foreground">{new Date(o.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="px-5 py-4 text-right font-medium">{formatBRL(Number(o.total||0))}</td>
                  <td className="px-5 py-4">
                    <Select value={o.status} onValueChange={(v) => change(o.id, v)}>
                      <SelectTrigger className={`w-36 h-8 text-xs ${statusColors[o.status] || ""}`}><SelectValue/></SelectTrigger>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">Nenhum pedido ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </AdminLayout>
  );
};

export default AdminOrders;
