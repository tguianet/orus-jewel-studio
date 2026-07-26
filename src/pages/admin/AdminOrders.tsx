import { useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { AdminOrderRow, loadAllOrders, updateOrderStatus } from "@/lib/cloudStore";
import {
  cancelPaidOrder,
  formatReversalToast,
  loadOrderCommissionPreview,
  refundPaidOrder,
  type OrderCommissionPreview,
} from "@/lib/commissionReversal";
import { formatBRL } from "@/lib/format";
import { statusColors, statusLabels } from "@/lib/orderStatus";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SELECT_STATUSES = ["new", "paid", "shipped", "delivered", "cancelled"] as const;

type ReversalAction = "cancel" | "refund";

const AdminOrders = () => {
  const [rows, setRows] = useState<AdminOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [action, setAction] = useState<ReversalAction>("cancel");
  const [target, setTarget] = useState<AdminOrderRow | null>(null);
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<OrderCommissionPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const openReversalDialog = async (order: AdminOrderRow, next: ReversalAction) => {
    setTarget(order);
    setAction(next);
    setReason("");
    setPreview(null);
    setDialogOpen(true);
    setPreviewLoading(true);
    try {
      setPreview(await loadOrderCommissionPreview(order.id));
    } catch (e: unknown) {
      toast.error("Não foi possível carregar comissões do pedido", {
        description: e instanceof Error ? e.message : "Erro desconhecido.",
      });
      setPreview({ count: 0, totalAmount: 0 });
    } finally {
      setPreviewLoading(false);
    }
  };

  const change = async (id: string, status: string) => {
    const order = rows.find((r) => r.id === id);
    if (!order) return;

    // Pedido pago: não permitir cancelamento direto pelo Select
    if (order.status === "paid") {
      if (status === "cancelled") {
        toast.error("Use “Cancelar pedido pago” para estornar comissões com segurança.");
        return;
      }
      if (status === "refunded") {
        toast.error("Use “Registrar reembolso” para estornar comissões com segurança.");
        return;
      }
    }

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
    } catch (e: unknown) {
      toast.error("Falhou", { description: e instanceof Error ? e.message : "Erro desconhecido." });
    }
  };

  const confirmReversal = async () => {
    if (!target || submitting) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      toast.error("Informe o motivo obrigatório.");
      return;
    }
    setSubmitting(true);
    try {
      const summary =
        action === "cancel"
          ? await cancelPaidOrder(target.id, trimmed)
          : await refundPaidOrder(target.id, trimmed);
      toast.success(
        action === "cancel" ? "Pedido cancelado" : "Reembolso registrado",
        { description: formatReversalToast(summary) },
      );
      setDialogOpen(false);
      setTarget(null);
      refresh();
    } catch (e: unknown) {
      toast.error("Não foi possível concluir", {
        description: e instanceof Error ? e.message : "Erro desconhecido.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectOptionsFor = (status: string) => {
    if (status === "paid" || status === "refunded") {
      return SELECT_STATUSES.filter((s) => s !== "cancelled");
    }
    return SELECT_STATUSES;
  };

  return (
    <AdminLayout>
      <PageHeader
        eyebrow="Pedidos"
        title="Todos os pedidos"
        description="Pagamento gera comissões MLM. Cancelamento/reembolso de pedidos pagos estorna comissões sem alterar estoque nesta fase."
      />
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
              <th className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Ações</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {filtered.map((o) => (
                <tr key={o.id} className="hover:bg-secondary/30">
                  <td className="px-5 py-4">
                    <p className="font-medium">{o.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{o.customer_phone}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 font-mono">{o.id.slice(0, 8)}</p>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell text-muted-foreground">{o.seller_stores?.store_name || "—"}</td>
                  <td className="px-5 py-4 hidden md:table-cell text-muted-foreground">{new Date(o.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="px-5 py-4 text-right font-medium">{formatBRL(Number(o.total||0))}</td>
                  <td className="px-5 py-4">
                    {o.status === "refunded" ? (
                      <span className={`inline-flex h-8 items-center rounded-md border px-2 text-xs ${statusColors.refunded}`}>
                        {statusLabels.refunded}
                      </span>
                    ) : (
                      <Select value={o.status} onValueChange={(v) => change(o.id, v)}>
                        <SelectTrigger className={`w-36 h-8 text-xs ${statusColors[o.status] || ""}`}>
                          <SelectValue>{statusLabels[o.status] || o.status}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {selectOptionsFor(o.status).map((s) => (
                            <SelectItem key={s} value={s}>{statusLabels[s] || s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {o.status === "paid" ? (
                      <div className="flex flex-col gap-1.5 min-w-[9.5rem]">
                        <Button
                          size="sm"
                          variant="goldOutline"
                          className="h-8 text-xs"
                          onClick={() => void openReversalDialog(o, "cancel")}
                        >
                          Cancelar pago
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs text-destructive hover:text-destructive"
                          onClick={() => void openReversalDialog(o, "refund")}
                        >
                          Registrar reembolso
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">Nenhum pedido no período.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      )}

      <AlertDialog open={dialogOpen} onOpenChange={(open) => { if (!submitting) setDialogOpen(open); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {action === "cancel" ? "Cancelar pedido pago" : "Registrar reembolso"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Pedido <span className="font-mono text-foreground">{target?.id.slice(0, 8)}</span>
                  {" · "}
                  Total {formatBRL(Number(target?.total || 0))}
                  {" · "}
                  {target?.customer_name}
                </p>
                {previewLoading ? (
                  <p className="flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando comissões…</p>
                ) : (
                  <p>
                    Comissões vinculadas: <span className="text-foreground font-medium">{preview?.count ?? 0}</span>
                    {" · "}
                    Soma dos amounts originais:{" "}
                    <span className="text-foreground font-medium">{formatBRL(preview?.totalAmount ?? 0)}</span>
                  </p>
                )}
                <p className="text-amber-700 dark:text-amber-400">
                  Créditos pending/available serão apenas cancelados (saldo zera, sem débito extra).
                  Somente comissões já pagas geram débito negativo available para compensação.
                  A operação fica registrada em auditoria.
                </p>
                <p>
                  Estoque <span className="text-foreground font-medium">não será alterado</span> nesta fase
                  (devolução física será tratada depois).
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reversal-reason">Motivo (obrigatório)</Label>
            <Textarea
              id="reversal-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo do cancelamento/reembolso"
              maxLength={500}
              disabled={submitting}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting || !reason.trim() || previewLoading}
              onClick={(e) => {
                e.preventDefault();
                void confirmReversal();
              }}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminOrders;
