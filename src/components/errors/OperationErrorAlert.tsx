import { Button } from "@/components/ui/button";
import type { AppError } from "@/lib/errors";
import { copyCorrelationId } from "@/lib/errors";
import { toast } from "sonner";

type Props = {
  error: AppError;
  onRetry?: () => void;
};

export function OperationErrorAlert({ error, onRetry }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3" role="alert">
      <div>
        <p className="text-sm font-medium">{error.userMessage}</p>
        <p className="text-xs text-muted-foreground font-mono mt-1">
          Código de suporte: {error.correlationId}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {error.retryable && onRetry && (
          <Button type="button" size="sm" variant="gold" onClick={onRetry}>
            Tentar novamente
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={async () => {
            await copyCorrelationId(error.correlationId);
            toast.success("Código copiado");
          }}
        >
          Copiar código
        </Button>
      </div>
    </div>
  );
}
