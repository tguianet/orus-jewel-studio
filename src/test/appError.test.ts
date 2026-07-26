import { describe, expect, it } from "vitest";
import { AppError, createCorrelationId, isCorrelationId } from "@/lib/errors";

describe("AppError + correlationId", () => {
  it("A — correlationId é criado automaticamente", () => {
    const err = new AppError({ code: "UNKNOWN_ERROR" });
    expect(isCorrelationId(err.correlationId)).toBe(true);
    expect(err.correlationId.startsWith("op_")).toBe(true);
  });

  it("B — mesmo erro preserva correlationId", () => {
    const cid = createCorrelationId();
    const err = new AppError({ code: "CHECKOUT_FAILED", correlationId: cid });
    expect(err.correlationId).toBe(cid);
    expect(err.toNormalized().correlationId).toBe(cid);
  });

  it("H — stack/originalError não vão para payload de UI em produção", () => {
    const err = new AppError({
      code: "RPC_FAILED",
      technicalMessage: "relation does not exist",
      originalError: new Error("boom\nstack"),
    });
    const payload = err.toUserPayload(false);
    expect(payload).toEqual({
      code: "RPC_FAILED",
      userMessage: err.userMessage,
      correlationId: err.correlationId,
      retryable: false,
    });
    expect(JSON.stringify(payload)).not.toMatch(/stack|relation does not exist/i);
  });

  it("userMessage é segura e em PT-BR", () => {
    const err = new AppError({ code: "AUTH_SESSION_EXPIRED" });
    expect(err.userMessage).toBe("Sua sessão expirou. Entre novamente.");
  });
});
