import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Mode = "grant" | "revoke";

type Props = {
  open: boolean;
  mode: Mode;
  userName: string;
  userEmail: string;
  reason: string;
  onReasonChange: (value: string) => void;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function AdminRoleConfirmDialog({
  open,
  mode,
  userName,
  userEmail,
  reason,
  onReasonChange,
  submitting,
  onCancel,
  onConfirm,
}: Props) {
  const isRevoke = mode === "revoke";
  const reasonOk = !isRevoke || reason.trim().length >= 3;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !submitting) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isRevoke ? "Remover administrador" : "Adicionar administrador"}
          </DialogTitle>
          <DialogDescription>
            {isRevoke
              ? "O acesso administrativo será revogado após a confirmação."
              : "Este usuário terá acesso total ao sistema."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3 text-sm">
          <p>
            <span className="text-muted-foreground">Nome:</span>{" "}
            <span className="font-medium text-foreground">{userName || "—"}</span>
          </p>
          <p>
            <span className="text-muted-foreground">E-mail:</span>{" "}
            <span className="font-medium text-foreground">{userEmail || "—"}</span>
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="admin-role-reason">
            Motivo {isRevoke ? "(obrigatório)" : "(opcional)"}
          </Label>
          <Textarea
            id="admin-role-reason"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder={
              isRevoke
                ? "Explique por que o acesso admin será removido"
                : "Motivo da promoção (opcional)"
            }
            disabled={submitting}
            rows={3}
          />
          {isRevoke && reason.trim().length > 0 && reason.trim().length < 3 && (
            <p className="text-xs text-destructive">Informe ao menos 3 caracteres.</p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant={isRevoke ? "destructive" : "gold"}
            onClick={onConfirm}
            disabled={submitting || !reasonOk}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isRevoke ? "Confirmar remoção" : "Confirmar promoção"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
