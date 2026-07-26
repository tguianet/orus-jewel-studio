import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, PackageOpen, X } from "lucide-react";
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
import {
  computeValueDifference,
  formatPhysicalReturnToast,
  isOrderStatusEligibleForReturnUi,
  loadOrderReturnPreview,
  registerPhysicalReturn,
  requiresOpenPackageConfirmation,
  RETURN_CONDITION_LABELS,
  RETURN_RESOLUTION_LABELS,
  RETURN_STOCK_ACTION_LABELS,
  validateReturnItemDraft,
  type OrderReturnPreviewItem,
  type PhysicalReturnItemInput,
  type ReturnItemCondition,
  type ReturnResolution,
  type ReturnStockAction,
} from "@/lib/physicalReturns";
import { formatBRL } from "@/lib/format";
import { statusColors, statusLabels } from "@/lib/orderStatus";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SELECT_STATUSES = ["new", "paid", "shipped", "delivered", "cancelled"] as const;

type ReversalAction = "cancel" | "refund";

type ProductOption = { id: string; name: string; wholesale_price: number };

type LineDraft = {
  included: boolean;
  quantity: number;
  condition: ReturnItemCondition;
  stock_action: ReturnStockAction;
  resolution: ReturnResolution;
  reason: string;
  notes: string;
  confirm_open_package_restock: boolean;
  replacement_product_id: string;
  replacement_quantity: number;
};

const defaultDraft = (remaining: number): LineDraft => ({
  included: remaining > 0,
  quantity: remaining > 0 ? 1 : 0,
  condition: "perfeito_estado",
  stock_action: "retornar_ao_estoque",
  resolution: "devolucao",
  reason: "",
  notes: "",
  confirm_open_package_restock: false,
  replacement_product_id: "",
  replacement_quantity: 1,
});

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

  const [returnOpen, setReturnOpen] = useState(false);
  const [returnStep, setReturnStep] = useState<"form" | "confirm">("form");
  const [returnTarget, setReturnTarget] = useState<AdminOrderRow | null>(null);
  const [returnPreview, setReturnPreview] = useState<OrderReturnPreviewItem[]>([]);
  const [returnPreviewLoading, setReturnPreviewLoading] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returnNotes, setReturnNotes] = useState("");
  const [drafts, setDrafts] = useState<Record<string, LineDraft>>({});
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [returnSubmitting, setReturnSubmitting] = useState(false);

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

  const openReturnDialog = async (order: AdminOrderRow) => {
    setReturnTarget(order);
    setReturnStep("form");
    setReturnReason("");
    setReturnNotes("");
    setReturnPreview([]);
    setDrafts({});
    setReturnOpen(true);
    setReturnPreviewLoading(true);
    try {
      const [items, productRows] = await Promise.all([
        loadOrderReturnPreview(order.id),
        supabase
          .from("products")
          .select("id,name,wholesale_price")
          .eq("status", "active")
          .order("name")
          .limit(500),
      ]);
      if (productRows.error) throw productRows.error;
      setProducts(
        (productRows.data ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          wholesale_price: Number(p.wholesale_price || 0),
        })),
      );
      setReturnPreview(items);
      const nextDrafts: Record<string, LineDraft> = {};
      items.forEach((item) => {
        nextDrafts[item.order_item_id] = defaultDraft(item.eligible ? item.quantity_remaining : 0);
        if (!item.eligible) nextDrafts[item.order_item_id].included = false;
      });
      setDrafts(nextDrafts);
    } catch (e: unknown) {
      toast.error("Não foi possível carregar itens para devolução", {
        description: e instanceof Error ? e.message : "Erro desconhecido.",
      });
      setReturnOpen(false);
    } finally {
      setReturnPreviewLoading(false);
    }
  };

  const change = async (id: string, status: string) => {
    const order = rows.find((r) => r.id === id);
    if (!order) return;

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

  const updateDraft = (orderItemId: string, patch: Partial<LineDraft>) => {
    setDrafts((prev) => {
      const current = prev[orderItemId] ?? defaultDraft(0);
      const next = { ...current, ...patch };
      if (patch.condition && !["perfeito_estado", "embalagem_aberta"].includes(patch.condition)) {
        if (next.stock_action === "retornar_ao_estoque") {
          next.stock_action = "nao_retornar_ao_estoque";
        }
      }
      if (patch.resolution === "devolucao") {
        next.replacement_product_id = "";
      }
      return { ...prev, [orderItemId]: next };
    });
  };

  const selectedPayload = useMemo(() => {
    const items: PhysicalReturnItemInput[] = [];
    for (const previewItem of returnPreview) {
      const draft = drafts[previewItem.order_item_id];
      if (!draft?.included || !previewItem.eligible) continue;
      items.push({
        order_item_id: previewItem.order_item_id,
        quantity: draft.quantity,
        condition: draft.condition,
        stock_action: draft.stock_action,
        resolution: draft.resolution,
        reason: draft.reason || undefined,
        notes: draft.notes || undefined,
        confirm_open_package_restock: draft.confirm_open_package_restock,
        replacement_product_id:
          draft.resolution === "troca" ? draft.replacement_product_id || null : null,
        replacement_quantity:
          draft.resolution === "troca" ? draft.replacement_quantity : null,
      });
    }
    return items;
  }, [drafts, returnPreview]);

  const confirmStats = useMemo(() => {
    let units = 0;
    let restocked = 0;
    let notRestocked = 0;
    let pending = 0;
    for (const item of selectedPayload) {
      const previewItem = returnPreview.find((p) => p.order_item_id === item.order_item_id);
      units += item.quantity;
      if (item.stock_action === "retornar_ao_estoque") restocked += item.quantity;
      else notRestocked += item.quantity;
      if (item.resolution === "troca" && previewItem) {
        const repl = products.find((p) => p.id === item.replacement_product_id);
        pending += computeValueDifference(
          item.quantity,
          previewItem.unit_price,
          item.replacement_quantity || 0,
          repl?.wholesale_price || 0,
        );
      }
    }
    return { units, restocked, notRestocked, pending };
  }, [selectedPayload, returnPreview, products]);

  const goToConfirmReturn = () => {
    if (!returnReason.trim()) {
      toast.error("Informe o motivo geral da devolução.");
      return;
    }
    if (selectedPayload.length === 0) {
      toast.error("Selecione ao menos um item com quantidade.");
      return;
    }
    for (const item of selectedPayload) {
      const previewItem = returnPreview.find((p) => p.order_item_id === item.order_item_id);
      const draft = drafts[item.order_item_id];
      if (!previewItem || !draft) continue;
      const err = validateReturnItemDraft({
        quantity: item.quantity,
        remaining: previewItem.quantity_remaining,
        condition: item.condition,
        stock_action: item.stock_action,
        resolution: item.resolution,
        confirm_open_package_restock: item.confirm_open_package_restock,
        replacement_product_id: item.replacement_product_id,
        replacement_quantity: item.replacement_quantity,
      });
      if (err) {
        toast.error(`${previewItem.product_name}: ${err}`);
        return;
      }
    }
    setReturnStep("confirm");
  };

  const confirmPhysicalReturn = async () => {
    if (!returnTarget || returnSubmitting) return;
    setReturnSubmitting(true);
    try {
      const summary = await registerPhysicalReturn(
        returnTarget.id,
        selectedPayload,
        returnReason.trim(),
        returnNotes.trim() || undefined,
      );
      toast.success("Devolução física registrada", {
        description: formatPhysicalReturnToast(summary),
      });
      setReturnOpen(false);
      setReturnTarget(null);
      refresh();
    } catch (e: unknown) {
      toast.error("Não foi possível registrar a devolução", {
        description: e instanceof Error ? e.message : "Erro desconhecido.",
      });
    } finally {
      setReturnSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        eyebrow="Pedidos"
        title="Todos os pedidos"
        description="Financeiro (cancelar/reembolsar) e físico (devolução) são operações separadas. Comissão só muda no fluxo financeiro."
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
        <Button asChild variant="ghost" size="sm" className="h-9">
          <Link to="/admin/devolucoes">Histórico de devoluções</Link>
        </Button>
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
              <th className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Total</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Status</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Ações</th>
            </tr></thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-b border-border/70 last:border-0">
                  <td className="px-5 py-4">
                    <p className="font-medium">{o.customer_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{o.id.slice(0, 8)} · {o.customer_phone}</p>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell text-muted-foreground">{o.seller_stores?.store_name || "—"}</td>
                  <td className="px-5 py-4 hidden md:table-cell text-muted-foreground">{new Date(o.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="px-5 py-4 font-medium">{formatBRL(Number(o.total || 0))}</td>
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
                    <div className="flex flex-col gap-1.5 min-w-[10rem]">
                      {o.status === "paid" ? (
                        <>
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
                        </>
                      ) : null}
                      {isOrderStatusEligibleForReturnUi(o.status) ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => void openReturnDialog(o)}
                        >
                          <PackageOpen className="mr-1 h-3.5 w-3.5" />
                          Devolução física
                        </Button>
                      ) : (
                        o.status !== "paid" ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : null
                      )}
                    </div>
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
                  Operação financeira: estorna comissões/carteira. Estoque só muda em “Devolução física”.
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

      <Dialog open={returnOpen} onOpenChange={(open) => { if (!returnSubmitting) setReturnOpen(open); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-card sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-gold">
              {returnStep === "form" ? "Registrar devolução física" : "Confirmar devolução física"}
            </DialogTitle>
            <DialogDescription>
              Pedido <span className="font-mono text-foreground">{returnTarget?.id.slice(0, 8)}</span>
              {" · "}
              {returnTarget?.customer_name}
              {" · "}
              {returnTarget ? (statusLabels[returnTarget.status] || returnTarget.status) : ""}
            </DialogDescription>
          </DialogHeader>

          {returnPreviewLoading ? (
            <div className="flex items-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando itens…
            </div>
          ) : returnStep === "form" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="return-reason">Motivo geral (obrigatório)</Label>
                <Textarea
                  id="return-reason"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  maxLength={500}
                  placeholder="Ex.: cliente devolveu a peça após entrega"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="return-notes">Observações</Label>
                <Textarea
                  id="return-notes"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  maxLength={1000}
                />
              </div>

              <div className="space-y-3">
                {returnPreview.map((item) => {
                  const draft = drafts[item.order_item_id] ?? defaultDraft(0);
                  const repl = products.find((p) => p.id === draft.replacement_product_id);
                  const estimatedDiff =
                    draft.resolution === "troca" && repl
                      ? computeValueDifference(
                        draft.quantity,
                        item.unit_price,
                        draft.replacement_quantity,
                        repl.wholesale_price,
                      )
                      : 0;
                  return (
                    <div
                      key={item.order_item_id}
                      className={`rounded-lg border p-4 space-y-3 ${item.eligible ? "border-border" : "border-border/60 opacity-70"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Comprada {item.quantity_purchased} · Devolvida {item.quantity_returned} · Restante {item.quantity_remaining}
                          </p>
                          {!item.eligible ? (
                            <p className="text-xs text-destructive mt-1">{item.eligibility_reason}</p>
                          ) : null}
                        </div>
                        <label className="flex items-center gap-2 text-xs">
                          <Checkbox
                            checked={draft.included && item.eligible}
                            disabled={!item.eligible}
                            onCheckedChange={(v) => updateDraft(item.order_item_id, { included: Boolean(v) })}
                          />
                          Incluir
                        </label>
                      </div>

                      {draft.included && item.eligible ? (
                        <>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Qtd agora</Label>
                              <Input
                                type="number"
                                min={1}
                                max={item.quantity_remaining}
                                value={draft.quantity}
                                onChange={(e) => updateDraft(item.order_item_id, {
                                  quantity: Number(e.target.value || 0),
                                })}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Condição</Label>
                              <Select
                                value={draft.condition}
                                onValueChange={(v) => updateDraft(item.order_item_id, {
                                  condition: v as ReturnItemCondition,
                                })}
                              >
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {(Object.keys(RETURN_CONDITION_LABELS) as ReturnItemCondition[]).map((c) => (
                                    <SelectItem key={c} value={c}>{RETURN_CONDITION_LABELS[c]}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Ação de estoque</Label>
                              <Select
                                value={draft.stock_action}
                                onValueChange={(v) => updateDraft(item.order_item_id, {
                                  stock_action: v as ReturnStockAction,
                                })}
                              >
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {(Object.keys(RETURN_STOCK_ACTION_LABELS) as ReturnStockAction[]).map((a) => (
                                    <SelectItem
                                      key={a}
                                      value={a}
                                      disabled={
                                        a === "retornar_ao_estoque"
                                        && !["perfeito_estado", "embalagem_aberta"].includes(draft.condition)
                                      }
                                    >
                                      {RETURN_STOCK_ACTION_LABELS[a]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Resolução</Label>
                              <Select
                                value={draft.resolution}
                                onValueChange={(v) => updateDraft(item.order_item_id, {
                                  resolution: v as ReturnResolution,
                                })}
                              >
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {(Object.keys(RETURN_RESOLUTION_LABELS) as ReturnResolution[]).map((r) => (
                                    <SelectItem key={r} value={r}>{RETURN_RESOLUTION_LABELS[r]}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {requiresOpenPackageConfirmation(draft.condition, draft.stock_action) ? (
                            <label className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
                              <Checkbox
                                checked={draft.confirm_open_package_restock}
                                onCheckedChange={(v) => updateDraft(item.order_item_id, {
                                  confirm_open_package_restock: Boolean(v),
                                })}
                              />
                              <span>
                                Confirmo que a peça foi inspecionada e pode voltar ao estoque
                              </span>
                            </label>
                          ) : null}

                          {draft.resolution === "troca" ? (
                            <div className="space-y-2 rounded-md border border-gold/30 bg-gold/5 p-3">
                              <p className="text-xs text-gold">
                                Nesta fase, a troca será apenas registrada. O estoque do produto substituto não será reservado.
                              </p>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1 sm:col-span-2">
                                  <Label className="text-xs">Produto substituto</Label>
                                  <Select
                                    value={draft.replacement_product_id || undefined}
                                    onValueChange={(v) => updateDraft(item.order_item_id, {
                                      replacement_product_id: v,
                                    })}
                                  >
                                    <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                    <SelectContent>
                                      {products.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                          {p.name} · {formatBRL(p.wholesale_price)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Qtd substituto</Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    value={draft.replacement_quantity}
                                    onChange={(e) => updateDraft(item.order_item_id, {
                                      replacement_quantity: Number(e.target.value || 0),
                                    })}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Diferença estimada</Label>
                                  <p className="flex h-9 items-center text-sm font-medium">{formatBRL(estimatedDiff)}</p>
                                </div>
                              </div>
                            </div>
                          ) : null}

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Motivo da linha</Label>
                              <Input
                                value={draft.reason}
                                onChange={(e) => updateDraft(item.order_item_id, { reason: e.target.value })}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Obs. da linha</Label>
                              <Input
                                value={draft.notes}
                                onChange={(e) => updateDraft(item.order_item_id, { notes: e.target.value })}
                              />
                            </div>
                          </div>
                        </>
                      ) : null}
                    </div>
                  );
                })}
                {returnPreview.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Pedido sem itens.</p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <p>{confirmStats.units} unidade(s) devolvida(s)</p>
              <p>{confirmStats.restocked} voltarão ao estoque</p>
              <p>{confirmStats.notRestocked} não voltarão ao estoque</p>
              <p>Pendência financeira estimada: <span className="font-medium">{formatBRL(confirmStats.pending)}</span></p>
              <p className="text-amber-700 dark:text-amber-400">
                Comissão e carteira não serão alteradas nesta operação. Totais do pedido permanecem históricos.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            {returnStep === "confirm" ? (
              <Button variant="ghost" disabled={returnSubmitting} onClick={() => setReturnStep("form")}>
                Voltar
              </Button>
            ) : (
              <Button variant="ghost" disabled={returnSubmitting} onClick={() => setReturnOpen(false)}>
                Cancelar
              </Button>
            )}
            {returnStep === "form" ? (
              <Button onClick={goToConfirmReturn} disabled={returnPreviewLoading || returnSubmitting}>
                Revisar e confirmar
              </Button>
            ) : (
              <Button onClick={() => void confirmPhysicalReturn()} disabled={returnSubmitting}>
                {returnSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Confirmar devolução
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminOrders;
