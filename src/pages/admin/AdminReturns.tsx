import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeftRight, Loader2, PackageOpen } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { formatBRL } from "@/lib/format";
import {
  loadProductReturnDetail,
  loadProductReturns,
  RETURN_CONDITION_LABELS,
  RETURN_RESOLUTION_LABELS,
  RETURN_STOCK_ACTION_LABELS,
  type ProductReturnDetail,
  type ProductReturnListRow,
  type ReturnItemCondition,
  type ReturnResolution,
  type ReturnStockAction,
} from "@/lib/physicalReturns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const AdminReturns = () => {
  const [rows, setRows] = useState<ProductReturnListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ProductReturnDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    loadProductReturns()
      .then(setRows)
      .catch((e: unknown) => {
        toast.error("Não foi possível carregar devoluções", {
          description: e instanceof Error ? e.message : "Erro desconhecido.",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const openDetail = async (id: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      setDetail(await loadProductReturnDetail(id));
    } catch (e: unknown) {
      toast.error("Falha ao abrir detalhe", {
        description: e instanceof Error ? e.message : "Erro desconhecido.",
      });
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        eyebrow="Estoque físico"
        title="Devoluções e trocas"
        description="Histórico de peças que voltaram fisicamente. Independente de cancelamento financeiro e reembolso."
      />

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-md border border-border bg-card px-2 py-1 text-muted-foreground">
          Cancelamento/reembolso = financeiro
        </span>
        <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-primary">
          Devolução física = estoque
        </span>
        <span className="rounded-md border border-gold/30 bg-gold/10 px-2 py-1 text-gold">
          Troca = só registro + pendência
        </span>
        <Button asChild variant="ghost" size="sm" className="ml-auto h-8 text-xs">
          <Link to="/admin/pedidos">Ir para pedidos</Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-left">
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Data</th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Pedido</th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Cliente</th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Unid.</th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Restock</th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground hidden md:table-cell">Pendência</th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/70 last:border-0">
                    <td className="px-5 py-3 text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        className="font-mono text-primary underline-offset-2 hover:underline"
                        onClick={() => void openDetail(r.id)}
                      >
                        {r.order_id.slice(0, 8)}
                      </button>
                    </td>
                    <td className="hidden px-5 py-3 sm:table-cell">{r.customer_name}</td>
                    <td className="px-5 py-3">{r.units_returned}</td>
                    <td className="px-5 py-3">{r.units_restocked}</td>
                    <td className="hidden px-5 py-3 md:table-cell">{formatBRL(r.financial_pending_amount)}</td>
                    <td className="px-5 py-3">
                      {r.has_exchange ? (
                        <span className="inline-flex items-center gap-1 text-xs text-gold">
                          <ArrowLeftRight className="h-3.5 w-3.5" /> Troca
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-primary">
                          <PackageOpen className="h-3.5 w-3.5" /> Devolução
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm text-muted-foreground">
                      Nenhuma devolução física registrada ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-border bg-card sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-gold">Detalhe da devolução</DialogTitle>
            <DialogDescription>
              {detail
                ? `Pedido ${detail.order_id.slice(0, 8)} · ${detail.customer_name}`
                : "Carregando…"}
            </DialogDescription>
          </DialogHeader>
          {detailLoading || !detail ? (
            <div className="flex items-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando detalhe…
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              <p><span className="text-muted-foreground">Motivo:</span> {detail.reason}</p>
              {detail.notes ? <p><span className="text-muted-foreground">Obs:</span> {detail.notes}</p> : null}
              <p>
                <span className="text-muted-foreground">Pendência financeira:</span>{" "}
                {formatBRL(detail.financial_pending_amount)}
                {detail.financial_pending_notes ? ` · ${detail.financial_pending_notes}` : ""}
              </p>
              <div className="divide-y divide-border rounded-lg border border-border">
                {detail.items.map((item) => (
                  <div key={item.id} className="space-y-1 px-4 py-3">
                    <p className="font-medium">Produto {item.product_id.slice(0, 8)} · qty {item.quantity}</p>
                    <p className="text-xs text-muted-foreground">
                      {RETURN_CONDITION_LABELS[item.condition as ReturnItemCondition] || item.condition}
                      {" · "}
                      {RETURN_STOCK_ACTION_LABELS[item.stock_action as ReturnStockAction] || item.stock_action}
                      {" · "}
                      {RETURN_RESOLUTION_LABELS[item.resolution as ReturnResolution] || item.resolution}
                    </p>
                    {item.stock_before != null && item.stock_after != null ? (
                      <p className="text-xs text-muted-foreground">
                        Estoque {item.stock_before} → {item.stock_after}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Sem alteração de estoque</p>
                    )}
                    {item.resolution === "troca" ? (
                      <p className="text-xs text-gold">
                        Substituição qty {item.replacement_quantity} · diferença {formatBRL(item.value_difference)}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminReturns;
