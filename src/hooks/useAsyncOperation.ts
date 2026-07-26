import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppError,
  createCorrelationId,
  normalizeError,
  showAppError,
  type ErrorContext,
} from "@/lib/errors";
import { assertOnlineForCritical, isBrowserOnline } from "@/lib/networkStatus";
import type { OperationState } from "@/hooks/useOperationState";

type Options = {
  operation: string;
  critical?: boolean;
  toastOnError?: boolean;
  entityType?: string;
  entityId?: string | null;
};

export function useAsyncOperation<TArgs extends unknown[], TResult>(
  fn: (correlationId: string, ...args: TArgs) => Promise<TResult>,
  options: Options,
) {
  const [state, setState] = useState<OperationState>("idle");
  const [data, setData] = useState<TResult | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const busyRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    setData(null);
    setError(null);
    setCorrelationId(null);
    busyRef.current = false;
  }, []);

  const run = useCallback(async (...args: TArgs) => {
    if (busyRef.current) return null;
    busyRef.current = true;

    const cid = createCorrelationId();
    setCorrelationId(cid);
    setState("loading");
    setError(null);
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const ctx: ErrorContext = {
      operation: options.operation,
      correlationId: cid,
      entityType: options.entityType,
      entityId: options.entityId,
      route: typeof window !== "undefined" ? window.location.pathname : undefined,
    };

    try {
      if (options.critical !== false) {
        assertOnlineForCritical(options.operation);
      } else if (!isBrowserOnline()) {
        throw new AppError({ code: "NETWORK_OFFLINE", correlationId: cid, operation: options.operation });
      }

      const result = await fn(cid, ...args);
      if (!mounted.current) return result;
      setData(result);
      setState("success");
      return result;
    } catch (raw) {
      const normalized = normalizeError(raw, ctx);
      if (!mounted.current) return null;
      setError(normalized);
      setState("error");
      if (options.toastOnError !== false) showAppError(normalized);
      return null;
    } finally {
      busyRef.current = false;
    }
  }, [fn, options.critical, options.entityId, options.entityType, options.operation, options.toastOnError]);

  return {
    state,
    data,
    error,
    correlationId,
    loading: state === "loading",
    run,
    reset,
    abort: () => abortRef.current?.abort(),
  };
}
