import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { OrusLogo } from "@/components/OrusLogo";

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * C — erro de import lazy mostra recuperação amigável.
 */
export class LazyRouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[lazy-route]", error, info.componentStack);
  }

  private retry = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-5 rounded-2xl border border-border bg-card p-8">
          <OrusLogo size="sm" className="justify-center" />
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Falha ao carregar</p>
            <h1 className="font-display text-2xl font-light">Não foi possível abrir esta página</h1>
            <p className="text-sm text-muted-foreground">
              A conexão pode ter falhado ao baixar a tela. Tente novamente.
            </p>
          </div>
          <Button type="button" variant="gold" onClick={this.retry}>
            Tentar de novo
          </Button>
        </div>
      </div>
    );
  }
}
