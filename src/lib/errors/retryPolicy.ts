export type RetryDecision = {
  shouldRetry: boolean;
  attempt: number;
  maxAttempts: number;
  delayMs: number;
  reason?: string;
};

const NON_RETRYABLE_OPERATIONS = new Set([
  "create_public_order",
  "mark_order_paid",
  "request_withdrawal",
  "mark_withdrawal_paid",
  "cancel_withdrawal",
  "approve_withdrawal",
  "reject_withdrawal",
  "cancel_paid_order",
  "refund_paid_order",
  "register_physical_return",
  "record_authenticated_consent",
  "record_checkout_consents",
  "sign_in",
  "sign_up",
  "update_password",
]);

export type RetryPolicyOptions = {
  operation: string;
  attempt: number;
  maxAttempts?: number;
  httpStatus?: number;
  retryableFlag?: boolean;
  isIdempotentRead?: boolean;
  offline?: boolean;
};

export function decideRetry(opts: RetryPolicyOptions): RetryDecision {
  const maxAttempts = opts.maxAttempts ?? 3;
  const attempt = Math.max(1, opts.attempt);

  if (opts.offline) {
    return { shouldRetry: false, attempt, maxAttempts, delayMs: 0, reason: "offline" };
  }
  if (NON_RETRYABLE_OPERATIONS.has(opts.operation)) {
    return { shouldRetry: false, attempt, maxAttempts, delayMs: 0, reason: "non_retryable_operation" };
  }
  if (attempt >= maxAttempts) {
    return { shouldRetry: false, attempt, maxAttempts, delayMs: 0, reason: "max_attempts" };
  }

  const status = opts.httpStatus;
  const statusOk = status === 502 || status === 503 || status === 504;
  const allowed =
    Boolean(opts.isIdempotentRead)
    || Boolean(opts.retryableFlag)
    || statusOk;

  if (!allowed) {
    return { shouldRetry: false, attempt, maxAttempts, delayMs: 0, reason: "not_retryable" };
  }

  return {
    shouldRetry: true,
    attempt,
    maxAttempts,
    delayMs: backoffWithJitter(attempt),
    reason: "retry",
  };
}

export function backoffWithJitter(attempt: number, baseMs = 300, maxMs = 4000): number {
  const exp = Math.min(maxMs, baseMs * 2 ** Math.max(0, attempt - 1));
  const jitter = Math.floor(Math.random() * (exp * 0.3));
  return exp + jitter;
}

export function isNonRetryableOperation(operation: string): boolean {
  return NON_RETRYABLE_OPERATIONS.has(operation);
}

/**
 * Para retries de operações com chave idempotente: reutilize a mesma chave.
 * Nunca chame isto para gerar uma chave nova a cada tentativa.
 */
export function reuseIdempotencyKey(existingKey: string): string {
  const key = String(existingKey ?? "").trim();
  if (!key) {
    throw new Error("idempotency_key obrigatória para retry seguro");
  }
  return key;
}

export async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return;
  await new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const t = window.setTimeout(() => resolve(), ms);
    signal?.addEventListener("abort", () => {
      window.clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}

/** Retry apenas leituras / flags retryable — nunca gera nova idempotency key. */
export async function withRetry<T>(
  operation: string,
  fn: (attempt: number) => Promise<T>,
  opts?: {
    maxAttempts?: number;
    isIdempotentRead?: boolean;
    signal?: AbortSignal;
    getHttpStatus?: (error: unknown) => number | undefined;
    isRetryableError?: (error: unknown) => boolean;
  },
): Promise<T> {
  const maxAttempts = opts?.maxAttempts ?? 3;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      const decision = decideRetry({
        operation,
        attempt,
        maxAttempts,
        httpStatus: opts?.getHttpStatus?.(error),
        retryableFlag: opts?.isRetryableError?.(error),
        isIdempotentRead: opts?.isIdempotentRead,
        offline: typeof navigator !== "undefined" && navigator.onLine === false,
      });
      if (!decision.shouldRetry) throw error;
      await sleep(decision.delayMs, opts?.signal);
    }
  }
  throw lastError;
}
