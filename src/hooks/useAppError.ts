import { useCallback, useState } from "react";
import {
  AppError,
  normalizeError,
  showAppError,
  type ErrorContext,
} from "@/lib/errors";

export function useAppError() {
  const [error, setError] = useState<AppError | null>(null);

  const capture = useCallback((raw: unknown, context?: ErrorContext) => {
    const normalized = normalizeError(raw, context);
    setError(normalized);
    return normalized;
  }, []);

  const captureAndToast = useCallback((raw: unknown, context?: ErrorContext) => {
    const normalized = capture(raw, context);
    showAppError(normalized);
    return normalized;
  }, [capture]);

  const clear = useCallback(() => setError(null), []);

  return { error, capture, captureAndToast, clear, setError };
}
