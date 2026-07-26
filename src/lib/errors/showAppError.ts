import { toast } from "sonner";
import type { AppError } from "./AppError";
import { reportError } from "./errorReporter";

const recentToasts = new Map<string, number>();
const TOAST_DEDUPE_MS = 3500;

export type ShowAppErrorOptions = {
  report?: boolean;
  showCorrelation?: boolean;
  silentToast?: boolean;
  route?: string;
};

export function showAppError(error: AppError, options: ShowAppErrorOptions = {}) {
  const key = `${error.correlationId}:${error.code}`;
  const now = Date.now();
  const prev = recentToasts.get(key);
  const deduped = prev != null && now - prev < TOAST_DEDUPE_MS;
  recentToasts.set(key, now);

  if (options.report !== false) {
    void reportError(error, options.route);
  }

  if (options.silentToast || deduped) return;

  const showCode =
    options.showCorrelation
    ?? (error.severity === "error" || error.severity === "critical");

  toast.error(error.userMessage, {
    description: showCode ? `Código de suporte: ${error.correlationId}` : undefined,
  });
}

export function copyCorrelationId(correlationId: string): Promise<void> {
  return navigator.clipboard.writeText(correlationId);
}

/** Somente testes — limpa dedupe de toasts. */
export function __resetAppErrorToastDedupeForTests() {
  recentToasts.clear();
}
