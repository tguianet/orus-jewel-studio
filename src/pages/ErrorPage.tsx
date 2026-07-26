import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { OrusLogo } from "@/components/OrusLogo";
import { copyCorrelationId } from "@/lib/errors";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { toast } from "sonner";

const ErrorPage = () => {
  const [params] = useSearchParams();
  const code = params.get("code");
  const message = params.get("message") || "Ocorreu um erro inesperado.";
  const { offline } = useNetworkStatus();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full text-center space-y-5 border border-border rounded-2xl bg-card p-8">
        <Link to="/" className="inline-flex justify-center"><OrusLogo size="sm" /></Link>
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary">
            {offline ? "Offline" : "Erro"}
          </p>
          <h1 className="font-display text-3xl font-light">
            {offline ? "Sem conexão" : "Não foi possível continuar"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {offline
              ? "Conecte-se à internet para tentar novamente. Pedidos e operações financeiras não são enviados offline."
              : message}
          </p>
          {code && (
            <p className="text-xs font-mono text-muted-foreground break-all">
              Código de suporte: {code}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button type="button" variant="gold" onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
          {code && (
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                await copyCorrelationId(code);
                toast.success("Código copiado");
              }}
            >
              Copiar código
            </Button>
          )}
          <Button asChild variant="ghost">
            <Link to="/">Voltar ao início</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
