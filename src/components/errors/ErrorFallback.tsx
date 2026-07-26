import { Button } from "@/components/ui/button";
import { OrusLogo } from "@/components/OrusLogo";
import { copyCorrelationId } from "@/lib/errors";
import { toast } from "sonner";

type Props = {
  title?: string;
  message: string;
  correlationId?: string | null;
  onRetry?: () => void;
  onHome?: () => void;
  showDevDetails?: boolean;
  technicalMessage?: string;
};

export function ErrorFallback({
  title = "Algo deu errado",
  message,
  correlationId,
  onRetry,
  onHome,
  showDevDetails,
  technicalMessage,
}: Props) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-5 rounded-2xl border border-border bg-card p-8">
        <OrusLogo size="sm" className="justify-center" />
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Erro</p>
          <h1 className="font-display text-2xl font-light">{title}</h1>
          <p className="text-sm text-muted-foreground">{message}</p>
          {correlationId && (
            <p className="text-xs text-muted-foreground font-mono break-all">
              Código de suporte: {correlationId}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {onRetry && (
            <Button type="button" variant="gold" onClick={onRetry}>
              Tentar novamente
            </Button>
          )}
          {correlationId && (
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                await copyCorrelationId(correlationId);
                toast.success("Código copiado");
              }}
            >
              Copiar código
            </Button>
          )}
          {onHome && (
            <Button type="button" variant="ghost" onClick={onHome}>
              Voltar ao início
            </Button>
          )}
        </div>
        {showDevDetails && technicalMessage && (
          <details className="text-left text-xs text-muted-foreground">
            <summary className="cursor-pointer">Detalhes (dev)</summary>
            <pre className="mt-2 whitespace-pre-wrap break-all">{technicalMessage}</pre>
          </details>
        )}
      </div>
    </div>
  );
}
