import { describe, expect, it } from "vitest";
import { maskSensitiveString, sanitizeErrorContext, toReportable, AppError } from "@/lib/errors";

describe("sanitizeErrorContext", () => {
  it("C — senha/token são removidos do contexto", () => {
    const out = sanitizeErrorContext({
      password: "secret123",
      access_token: "tok",
      refresh_token: "ref",
      authorization: "Bearer x",
      order_id: "11111111-1111-1111-1111-111111111111",
      rpc_name: "create_public_order",
    });
    expect(out.password).toBe("[redacted]");
    expect(out.access_token).toBe("[redacted]");
    expect(out.refresh_token).toBe("[redacted]");
    expect(out.authorization).toBe("[redacted]");
    expect(out.order_id).toBe("11111111-1111-1111-1111-111111111111");
    expect(out.rpc_name).toBe("create_public_order");
  });

  it("D — PIX/documento/telefone são mascarados", () => {
    const out = sanitizeErrorContext({
      pix_key: "11999999999",
      document: "12345678901",
      cpf: "12345678901",
      phone: "11988887777",
      customer_phone: "11988887777",
      store_id: "22222222-2222-2222-2222-222222222222",
    });
    expect(out.pix_key).toBe("[redacted]");
    expect(out.document).toBe("[redacted]");
    expect(out.cpf).toBe("[redacted]");
    expect(out.phone).toBe("[redacted]");
    expect(out.customer_phone).toBe("[redacted]");
    expect(out.store_id).toBe("22222222-2222-2222-2222-222222222222");
    expect(maskSensitiveString("11999999999")).toMatch(/^••••/);
  });

  it("S — dados sensíveis não aparecem no reporter", () => {
    const err = new AppError({
      code: "CHECKOUT_FAILED",
      metadata: {
        password: "x",
        pix_key: "abc",
        customer_name: "Maria",
        order_id: "33333333-3333-3333-3333-333333333333",
      },
    });
    const payload = toReportable(err);
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain("Maria");
    expect(payload.sanitizedContext.password).toBe("[redacted]");
    expect(payload.sanitizedContext.pix_key).toBe("[redacted]");
    expect(payload.sanitizedContext.order_id).toBe("33333333-3333-3333-3333-333333333333");
  });

  it("não faz stringify cego de objetos grandes", () => {
    const big: Record<string, unknown> = { order_id: "o1" };
    for (let i = 0; i < 100; i += 1) big[`noise_${i}`] = `v${i}`;
    const out = sanitizeErrorContext(big);
    expect(out.order_id).toBe("o1");
    expect(Object.keys(out).filter((k) => k.startsWith("noise_")).length).toBe(0);
  });
});
