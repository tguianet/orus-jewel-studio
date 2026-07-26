import { FormEvent, useRef, useState } from "react";
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
import { formatBRL } from "@/lib/format";
import {
  friendlyWithdrawalError,
  newIdempotencyKey,
  requestWithdrawal,
  validateWithdrawalAmount,
} from "@/lib/withdrawals";
import { PayoutMethodForm } from "@/components/withdrawals/PayoutMethodForm";
import {
  emptyPayoutForm,
  payoutFormToDetails,
  type PayoutFormState,
} from "@/lib/payoutForm";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  available: number;
  minimum: number;
  onSuccess: () => void;
};

export function WithdrawalRequestModal({
  open,
  onOpenChange,
  available,
  minimum,
  onSuccess,
}: Props) {
  const [amount, setAmount] = useState("");
  const [form, setForm] = useState<PayoutFormState>(emptyPayoutForm);
  const [busy, setBusy] = useState(false);
  const keyRef = useRef(newIdempotencyKey("wd_req"));

  const reset = () => {
    setAmount("");
    setForm(emptyPayoutForm());
    keyRef.current = newIdempotencyKey("wd_req");
    setBusy(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const value = Number(amount.replace(",", "."));
    const check = validateWithdrawalAmount({ amount: value, available, minimum });
    if (check.ok === false) {
      toast.error(check.message);
      return;
    }
    setBusy(true);
    try {
      const result = await requestWithdrawal({
        amount: Math.round(value * 100) / 100,
        paymentMethod: form.method,
        paymentDetails: payoutFormToDetails(form),
        idempotencyKey: keyRef.current,
      });
      toast.success(
        result.idempotent ? "Solicitação já processada." : "Solicitação de saque criada!",
      );
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error("Não foi possível solicitar", {
        description: friendlyWithdrawalError(err instanceof Error ? err.message : String(err)),
      });
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !busy) {
          reset();
          onOpenChange(false);
        } else if (v) onOpenChange(true);
      }}
    >
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitar saque</DialogTitle>
          <DialogDescription>
            Disponível: {formatBRL(available)} · Mínimo: {formatBRL(minimum)}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="amount">Valor</Label>
            <Input
              id="amount"
              className="mt-1.5"
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              disabled={busy}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <PayoutMethodForm value={form} onChange={setForm} disabled={busy} />
          <Button type="submit" variant="gold" size="lg" className="w-full" disabled={busy}>
            {busy ? "Enviando…" : "Confirmar solicitação"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
