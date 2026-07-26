import { Component, type ErrorInfo, type ReactNode } from "react";
import { AppError, createCorrelationId, normalizeError, reportCritical } from "@/lib/errors";
import { ErrorFallback } from "@/components/errors/ErrorFallback";

type Props = { children: ReactNode };
type State = {
  error: AppError | null;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  private retryCount = 0;

  static getDerivedStateFromError(error: Error): State {
    return {
      error: normalizeError(error, {
        operation: "react_render",
        correlationId: createCorrelationId(),
      }),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const normalized =
      this.state.error
      ?? normalizeError(error, {
        operation: "react_render",
        metadata: { componentStack: String(info.componentStack ?? "").slice(0, 300) },
      });
    void reportCritical(normalized);
  }

  private retry = () => {
    if (this.retryCount >= 2) {
      window.location.href = "/";
      return;
    }
    this.retryCount += 1;
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    const err = this.state.error;
    return (
      <ErrorFallback
        title="Não foi possível exibir esta tela"
        message={err.userMessage}
        correlationId={err.correlationId}
        onRetry={this.retry}
        onHome={() => { window.location.href = "/"; }}
        showDevDetails={import.meta.env.DEV}
        technicalMessage={err.technicalMessage}
      />
    );
  }
}
