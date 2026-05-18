import { useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { loadAllOrders, updateOrderStatus } from "@/lib/cloudStore";
import { formatBRL, statusColors } from "@/lib/mockData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STATUSES = ["new", "paid", "shipped", "delivered", "cancelled"];
const STATUS_LABELS: Record<string, string> = {
  new: "Novo",
  paid: "Pago",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const AdminOrders = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const refresh = () => loadAllOrders().then((d) => { setRows(d); setLoading(false); });
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    const fromTs = from ? new Date(from + "T00:00:00").getTime() : null;
    const toTs = to ? new Date(to + "T23:59:59.999").getTime() : null;
    return rows.filter((o) => {
      const t = new Date(o.created_at).getTime();
      if (fromTs && t < fromTs) return false;
      if (toTs && t > toTs) return false;
      return true;
    });
  }, [rows, from, to]);

  const change = async (id: string, status: string) => {
    try {
      if (status === "paid") {
        const { error } = await supabase.rpc("mark_order_paid", { _order_id: id });
        if (error) throw error;
        toast.success("Pedido pago: comissões MLM geradas e liberadas.");
      } else {
        await updateOrderStatus(id, status);
        toast.success("Status atualizado");
      }
      refresh();
    } catch (e: any) { toast.error("Falhou", { description: e.message }); }
  };

  return (
    <AdminLayout>
      <PageHeader eyebrow="Pedidos" title="Todos os pedidos" description="Acompanhe e mude o status. Pagamento gera comissões MLM." />
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="from" className="text-xs text-muted-foreground">De</Label>
          <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-44" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="to" className="text-xs text-muted-foreground">Até</Label>
          <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-44" />
        </div>
        {(from || to) && (
          <Button variant="ghost" size="sm" onClick={() => { setFrom(""); setTo(""); }}>
            <X className="h-4 w-4 mr-1" /> Limpar
          </Button>
        )}
        <div className="ml-auto text-xs text-muted-foreground">{filtered.length} pedido(s)</div>
      </div>
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
              {filtered.map((o: any) => (
                <tr key={o.id} className="hover:bg-secondary/30">
                  <td className="px-5 py-4"><p className="font-medium">{o.customer_name}</p><p className="text-xs text-muted-foreground">{o.customer_phone}</p></td>
                  <td className="px-5 py-4 hidden sm:table-cell text-muted-foreground">{o.seller_stores?.store_name || "—"}</td>
                  <td className="px-5 py-4 hidden md:table-cell text-muted-foreground">{new Date(o.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="px-5 py-4 text-right font-medium">{formatBRL(Number(o.total||0))}</td>
                  <td className="px-5 py-4">
                    <Select value={o.status} onValueChange={(v) => change(o.id, v)}>
                      <SelectTrigger className={`w-36 h-8 text-xs ${statusColors[o.status] || ""}`}>
                        <SelectValue>{STATUS_LABELS[o.status] || o.status}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">Nenhum pedido no período.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </AdminLayout>
  );
};

export default AdminOrders;
