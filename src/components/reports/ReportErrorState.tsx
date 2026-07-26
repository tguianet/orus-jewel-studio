import { Button } from "@/components/ui/button";

type Props = {
  message: string;
  correlationId?: string | null;
  onRetry?: () => void;
};

export function ReportErrorState({ message, correlationId, onRetry }: Props) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-5 text-sm">
      <p className="text-destructive font-medium">{message}</p>
      {correlationId && (
        <p className="mt-1 font-mono text-xs text-muted-foreground">Código: {correlationId}</p>
      )}
      {onRetry && (
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
