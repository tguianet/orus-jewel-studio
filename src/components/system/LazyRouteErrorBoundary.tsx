import { Component, type ErrorInfo, type ReactNode } from "react";
import { normalizeError, reportError, createCorrelationId } from "@/lib/errors";
import { ErrorFallback } from "@/components/errors/ErrorFallback";

type Props = { children: ReactNode };
type State = { correlationId: string | null; message: string | null };

/**
 * Erro de import lazy — recuperação amigável com correlationId.
 */
export class LazyRouteErrorBoundary extends Component<Props, State> {
  state: State = { correlationId: null, message: null };

  static getDerivedStateFromError(error: Error): State {
    const normalized = normalizeError(error, {
      operation: "lazy_route_import",
      correlationId: createCorrelationId(),
    });
    return { correlationId: normalized.correlationId, message: normalized.userMessage };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const normalized = normalizeError(error, {
      operation: "lazy_route_import",
      correlationId: this.state.correlationId ?? createCorrelationId(),
      metadata: { componentStack: String(info.componentStack ?? "").slice(0, 200) },
    });
    void reportError(normalized);
  }

  private retry = () => {
    this.setState({ correlationId: null, message: null });
    window.location.reload();
  };

  render() {
    if (!this.state.correlationId) return this.props.children;

    return (
      <ErrorFallback
        title="Não foi possível abrir esta página"
        message={this.state.message || "A conexão pode ter falhado ao baixar a tela."}
        correlationId={this.state.correlationId}
        onRetry={this.retry}
        onHome={() => { window.location.href = "/"; }}
      />
    );
  }
}
