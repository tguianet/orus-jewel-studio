import { describe, expect, it } from "vitest";
import { AppError, normalizeError } from "@/lib/errors";

describe("normalizeError", () => {
  it("E — PostgreSQL 23505 vira conflito amigável", () => {
    const err = normalizeError({ message: "duplicate key", code: "23505" }, { operation: "load_orders" });
    expect(err.code).toBe("DATABASE_CONFLICT");
    expect(err.userMessage).not.toMatch(/duplicate key/i);
  });

  it("F — 40001 vira concorrência; leitura pode ser retryable", () => {
    const read = normalizeError({ message: "could not serialize", code: "40001" }, { operation: "load_wallet" });
    expect(read.code).toBe("DATABASE_CONCURRENCY");
    expect(read.retryable).toBe(true);

    const write = normalizeError({ message: "could not serialize", code: "40001" }, {
      operation: "create_public_order",
    });
    expect(write.code).toBe("DATABASE_CONCURRENCY");
    expect(write.retryable).toBe(false);
  });

  it("G — erro desconhecido não quebra normalização", () => {
    const err = normalizeError(undefined, { operation: "unknown_op" });
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe("UNKNOWN_ERROR");
    expect(err.correlationId).toBeTruthy();
  });

  it("Q — sessão expirada usa mensagem correta", () => {
    const err = normalizeError(new Error("JWT expired"), { operation: "session_refresh" });
    expect(err.code).toBe("AUTH_SESSION_EXPIRED");
    expect(err.userMessage).toBe("Sua sessão expirou. Entre novamente.");
  });

  it("R — consentimento usa mensagem correta", () => {
    const err = normalizeError(new Error("Falha de consentimento"), { operation: "record_authenticated_consent" });
    expect(err.code).toBe("CONSENT_FAILED");
    expect(err.userMessage).toBe("Não foi possível registrar o consentimento.");
  });

  it("string e AbortError são reconhecidos", () => {
    expect(normalizeError("falha genérica").code).toBe("UNKNOWN_ERROR");
    const abort = normalizeError({ name: "AbortError", message: "aborted" }, { operation: "load_catalog" });
    expect(abort.code).toBe("NETWORK_TIMEOUT");
  });

  it("preserva AppError existente", () => {
    const original = new AppError({ code: "WITHDRAWAL_FAILED", correlationId: "op_20260801_abcd1234" });
    const again = normalizeError(original);
    expect(again.correlationId).toBe("op_20260801_abcd1234");
  });
});
