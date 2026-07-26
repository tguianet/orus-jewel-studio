import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatBRL } from "@/lib/format";
import {
  approveWithdrawal,
  friendlyWithdrawalError,
  getWithdrawalAudit,
  getWithdrawalDetails,
  markWithdrawalPaid,
  newIdempotencyKey,
  rejectWithdrawal,
} from "@/lib/withdrawals";
import { maskPaymentDetails } from "@/lib/withdrawalMasking";
import {
  canAdminApprove,
  canAdminPay,
  canAdminReject,
} from "@/lib/withdrawalStatus";
import { WithdrawalStatusBadge } from "@/components/withdrawals/WithdrawalStatusBadge";
import type {
  PaymentDetails,
  PayoutMethod,
  WithdrawalAuditItem,
  WithdrawalDetails,
} from "@/types/withdrawals";
import { toast } from "sonner";

type Props = {
  withdrawalId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
};

export function AdminWithdrawalDetails({
  withdrawalId,
  open,
  onOpenChange,
  onChanged,
}: Props) {
  const [detail, setDetail] = useState<WithdrawalDetails | null>(null);
  const [audit, setAudit] = useState<WithdrawalAuditItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [payRef, setPayRef] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [confirmPay, setConfirmPay] = useState(false);
  const [payKey] = useState(() => newIdempotencyKey("wd_pay"));

  useEffect(() => {
    if (!open || !withdrawalId) return;
    let alive = true;
    setLoading(true);
    setReveal(false);
    setConfirmPay(false);
    Promise.all([
      getWithdrawalDetails(withdrawalId, false),
      getWithdrawalAudit(withdrawalId),
    ])
      .then(([d, a]) => {
        if (!alive) return;
        setDetail(d);
        setAudit(a);
      })
      .catch((e: unknown) => {
        toast.error("Falha ao carregar", {
          description: e instanceof Error ? e.message : "Erro",
        });
        onOpenChange(false);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [open, withdrawalId, onOpenChange]);

  const reload = async (withReveal = reveal) => {
    if (!withdrawalId) return;
    const [d, a] = await Promise.all([
      getWithdrawalDetails(withdrawalId, withReveal),
      getWithdrawalAudit(withdrawalId),
    ]);
    setDetail(d);
    setAudit(a);
  };

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      toast.success(okMsg);
      await reload();
      onChanged();
    } catch (e) {
      toast.error("Operação falhou", {
        description: friendlyWithdrawalError(e instanceof Error ? e.message : String(e)),
      });
    } finally {
      setBusy(false);
      setConfirmPay(false);
    }
  };

  if (!withdrawalId) return null;

  const method = detail?.payment_method as PayoutMethod | undefined;
  const maskedLabel =
    detail && method
      ? "masked" in detail.payment_details
        ? `Dados mascarados (${method})`
        : maskPaymentDetails(method, detail.payment_details as PaymentDetails)
      : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhe do saque</DialogTitle>
          <DialogDescription>
            {detail ? `${detail.reseller_name} · ${formatBRL(detail.amount)}` : "Carregando…"}
          </DialogDescription>
        </DialogHeader>

        {loading || !detail ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-2">
              <WithdrawalStatusBadge status={detail.status} />
              <span className="text-xs text-muted-foreground font-mono">{detail.id.slice(0, 8)}…</span>
            </div>
            <p><span className="text-muted-foreground">Sacoleira:</span> {detail.reseller_name} ({detail.reseller_email})</p>
            <p><span className="text-muted-foreground">Valor:</span> {formatBRL(detail.amount)}</p>
            <p><span className="text-muted-foreground">Método:</span> {detail.payment_method === "pix" ? "PIX" : "Transferência"}</p>
            <div className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Dados de recebimento</p>
              <p>{maskedLabel}</p>
              {!reveal ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={async () => {
                    setReveal(true);
                    await reload(true);
                  }}
                >
                  Revelar dados (admin)
                </Button>
              ) : (
                <pre className="text-xs whitespace-pre-wrap break-all bg-muted/40 p-2 rounded">
                  {JSON.stringify(detail.payment_details, null, 2)}
                </pre>
              )}
            </div>

            {detail.rejection_reason && (
              <p className="text-destructive">Motivo rejeição: {detail.rejection_reason}</p>
            )}
            {detail.receipt_url && (
              <p>
                Comprovante:{" "}
                <a href={detail.receipt_url} target="_blank" rel="noreferrer" className="text-primary underline">
                  abrir link
                </a>
              </p>
            )}
            {detail.payment_reference && (
              <p>Referência: {detail.payment_reference}</p>
            )}

            <div className="space-y-2 pt-2 border-t border-border">
              {canAdminApprove(detail.status) && (
                <Button
                  variant="gold"
                  className="w-full"
                  disabled={busy}
                  onClick={() => run(() => approveWithdrawal(detail.id), "Saque aprovado")}
                >
                  Aprovar
                </Button>
              )}

              {canAdminReject(detail.status) && (
                <div className="space-y-2">
                  <Label>Motivo da rejeição</Label>
                  <Textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    disabled={busy}
                    placeholder="Obrigatório"
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={busy || !rejectReason.trim()}
                    onClick={() =>
                      run(
                        () => rejectWithdrawal(detail.id, rejectReason.trim()),
                        "Saque rejeitado — saldo devolvido",
                      )
                    }
                  >
                    Rejeitar
                  </Button>
                </div>
              )}

              {canAdminPay(detail.status) && !confirmPay && (
                <Button
                  variant="gold"
                  className="w-full"
                  disabled={busy}
                  onClick={() => setConfirmPay(true)}
                >
                  Marcar como pago
                </Button>
              )}

              {canAdminPay(detail.status) && confirmPay && (
                <div className="space-y-2 rounded-lg border border-primary/30 p-3">
                  <p className="text-xs text-muted-foreground">
                    Confirma pagamento de <strong>{formatBRL(detail.amount)}</strong> para{" "}
                    <strong>{detail.reseller_name}</strong>? Esta ação é final.
                  </p>
                  <div>
                    <Label>Referência externa</Label>
                    <Input className="mt-1" value={payRef} onChange={(e) => setPayRef(e.target.value)} disabled={busy} />
                  </div>
                  <div>
                    <Label>URL do comprovante</Label>
                    <Input className="mt-1" value={receiptUrl} onChange={(e) => setReceiptUrl(e.target.value)} disabled={busy} placeholder="https://…" />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="gold"
                      className="flex-1"
                      disabled={busy}
                      onClick={() =>
                        run(
                          () =>
                            markWithdrawalPaid({
                              id: detail.id,
                              paymentReference: payRef,
                              receiptUrl,
                              idempotencyKey: payKey,
                            }),
                          "Saque marcado como pago",
                        )
                      }
                    >
                      {busy ? "Processando…" : "Confirmar pagamento"}
                    </Button>
                    <Button variant="outline" disabled={busy} onClick={() => setConfirmPay(false)}>
                      Voltar
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-border">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Auditoria</p>
              {audit.length === 0 ? (
                <p className="text-muted-foreground">Sem eventos.</p>
              ) : (
                <ul className="space-y-1.5">
                  {audit.map((a) => (
                    <li key={a.id} className="text-xs">
                      <span className="font-medium">{a.action}</span>
                      {" · "}
                      {a.previous_status || "—"} → {a.new_status || "—"}
                      {" · "}
                      {new Date(a.created_at).toLocaleString("pt-BR")}
                      {a.actor_role ? ` · ${a.actor_role}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
