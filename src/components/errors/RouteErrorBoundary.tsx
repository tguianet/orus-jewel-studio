import { Component, type ErrorInfo, type ReactNode } from "react";
import { AppError, createCorrelationId, normalizeError, reportError } from "@/lib/errors";
import { ErrorFallback } from "@/components/errors/ErrorFallback";

type Props = { children: ReactNode; name?: string };
type State = { error: AppError | null };

/** Isola falha de uma rota sem derrubar o app inteiro. */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return {
      error: normalizeError(error, {
        operation: "route_render",
        correlationId: createCorrelationId(),
      }),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const normalized =
      this.state.error
      ?? normalizeError(error, {
        operation: this.props.name ?? "route_render",
        metadata: { componentStack: String(info.componentStack ?? "").slice(0, 200) },
      });
    void reportError(normalized);
  }

  private retry = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <ErrorFallback
        title="Falha nesta página"
        message={this.state.error.userMessage}
        correlationId={this.state.error.correlationId}
        onRetry={this.retry}
        onHome={() => { window.location.href = "/"; }}
        showDevDetails={import.meta.env.DEV}
        technicalMessage={this.state.error.technicalMessage}
      />
    );
  }
}
