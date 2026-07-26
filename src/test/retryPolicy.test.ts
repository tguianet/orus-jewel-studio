import { describe, expect, it, vi } from "vitest";
import {
  decideRetry,
  isNonRetryableOperation,
  reuseIdempotencyKey,
  withRetry,
} from "@/lib/errors";

describe("retryPolicy", () => {
  it("I — GET/leitura 503 pode retry", () => {
    const d = decideRetry({
      operation: "load_catalog",
      attempt: 1,
      httpStatus: 503,
      isIdempotentRead: true,
    });
    expect(d.shouldRetry).toBe(true);
    expect(d.delayMs).toBeGreaterThan(0);
  });

  it("J — create_public_order não retry automático", () => {
    expect(isNonRetryableOperation("create_public_order")).toBe(true);
    const d = decideRetry({
      operation: "create_public_order",
      attempt: 1,
      httpStatus: 503,
      isIdempotentRead: true,
    });
    expect(d.shouldRetry).toBe(false);
    expect(d.reason).toBe("non_retryable_operation");
  });

  it("K — operação idempotente reutiliza a mesma chave", () => {
    const key = "idem-abc-123";
    expect(reuseIdempotencyKey(key)).toBe(key);
    expect(() => reuseIdempotencyKey("")).toThrow(/idempotency_key/);
  });

  it("L — retry respeita limite", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    let calls = 0;
    await expect(
      withRetry(
        "load_summary",
        async () => {
          calls += 1;
          const err = Object.assign(new Error("bad gateway"), { status: 503 });
          throw err;
        },
        {
          maxAttempts: 3,
          isIdempotentRead: true,
          getHttpStatus: (e) => (e as { status?: number }).status,
        },
      ),
    ).rejects.toThrow("bad gateway");
    expect(calls).toBe(3);
    vi.restoreAllMocks();
  });

  it("saque/consentimento não retry", () => {
    expect(decideRetry({ operation: "request_withdrawal", attempt: 1, httpStatus: 503 }).shouldRetry).toBe(false);
    expect(decideRetry({ operation: "record_authenticated_consent", attempt: 1, retryableFlag: true }).shouldRetry).toBe(false);
  });
});
