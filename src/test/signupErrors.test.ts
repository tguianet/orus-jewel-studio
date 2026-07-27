import { beforeEach, describe, expect, it, vi } from "vitest";
import { classifySignupError, signupErrorMetadata } from "@/lib/signupErrors";
import { normalizeError } from "@/lib/errors";
import { registerResellerWithReferral } from "@/lib/referralCode";

const rpc = vi.fn();
const signUp = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    auth: { signUp: (...args: unknown[]) => signUp(...args) },
  },
}));

const okSponsor = {
  data: {
    valid: true,
    sponsor_reseller_id: "s1",
    sponsor_name: "Pat",
    store_name: "Loja",
    reason: "ok",
  },
  error: null,
};

describe("cadastro — classificação de erros", () => {
  beforeEach(() => {
    rpc.mockReset();
    signUp.mockReset();
  });

  it("1 — e-mail novo + código válido conclui sem erro", async () => {
    rpc.mockResolvedValueOnce(okSponsor);
    signUp.mockResolvedValueOnce({ data: { user: { id: "u1" } }, error: null });
    const res = await registerResellerWithReferral({
      fullName: "Ana",
      email: "ana@test.com",
      password: "123456",
      referralCode: "PATCODE",
    });
    expect(res.error).toBeUndefined();
    expect(res.cause).toBeUndefined();
  });

  it("2 — e-mail já existente vira mensagem dedicada", async () => {
    rpc.mockResolvedValueOnce(okSponsor);
    signUp.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "User already registered", code: "user_already_exists", status: 422 },
    });
    const res = await registerResellerWithReferral({
      fullName: "Ana",
      email: "ana@test.com",
      password: "123456",
      referralCode: "PATCODE",
    });
    expect(res.error).toBe("Este e-mail já está cadastrado.");
    const err = normalizeError(res.cause, { operation: "sign_up" });
    expect(err.code).toBe("AUTH_EMAIL_TAKEN");
    expect(err.metadata.auth_error_code).toBe("user_already_exists");
    expect(err.metadata.signup_stage).toBe("auth_user");
  });

  it("3 — código inválido nem chega ao Auth", async () => {
    rpc.mockResolvedValueOnce({
      data: { valid: false, reason: "not_found", sponsor_reseller_id: null, sponsor_name: null, store_name: null },
      error: null,
    });
    const res = await registerResellerWithReferral({
      fullName: "Ana",
      email: "ana@test.com",
      password: "123456",
      referralCode: "XXXX",
    });
    expect(signUp).not.toHaveBeenCalled();
    expect(res.error).toMatch(/inválido/i);
    const err = normalizeError(res.cause, { operation: "sign_up" });
    expect(err.code).toBe("AUTH_SIGNUP_REFERRAL_INVALID");
    expect(err.metadata.referral_reason).toBe("not_found");
  });

  it("4 — patrocinadora bloqueada", async () => {
    rpc.mockResolvedValueOnce({
      data: { valid: false, reason: "blocked", sponsor_reseller_id: null, sponsor_name: null, store_name: null },
      error: null,
    });
    const res = await registerResellerWithReferral({
      fullName: "Ana",
      email: "ana@test.com",
      password: "123456",
      referralCode: "BLOQ",
    });
    expect(res.error).toMatch(/bloqueado/i);
    expect(normalizeError(res.cause, { operation: "sign_up" }).metadata.referral_reason).toBe("blocked");
  });

  it("5 — slug duplicado (23505) é classificado na etapa store", () => {
    const info = classifySignupError({
      message: 'duplicate key value violates unique constraint "seller_stores_store_slug_key" (23505)',
      status: 500,
    });
    expect(info.code).toBe("AUTH_SIGNUP_DB_ERROR");
    expect(info.stage).toBe("store");
    expect(signupErrorMetadata(info).postgres_code).toBe("23505");
    expect(signupErrorMetadata(info).constraint).toBe("seller_stores_store_slug_key");
  });

  it("6 — falha do trigger vira erro amigável, sem detalhe técnico", () => {
    const err = normalizeError(
      { message: "Database error saving new user", status: 500, code: "unexpected_failure" },
      { operation: "sign_up" },
    );
    expect(err.code).toBe("AUTH_SIGNUP_DB_ERROR");
    expect(err.userMessage).toBe("Não foi possível concluir o cadastro agora. Tente novamente em instantes.");
    expect(err.userMessage).not.toMatch(/database|trigger|sql/i);
    expect(err.correlationId).toBeTruthy();
  });

  it("6b — referral_invalid vindo do trigger é reconhecido", () => {
    const err = normalizeError({ message: "referral_invalid:inactive", status: 500 }, { operation: "sign_up" });
    expect(err.code).toBe("AUTH_SIGNUP_REFERRAL_INVALID");
    expect(err.userMessage).toBe("O código de indicação não é mais válido.");
    expect(err.metadata.signup_stage).toBe("referral_link");
  });

  it("7 — repetição do cadastro mantém a mesma classificação", async () => {
    for (let n = 0; n < 2; n += 1) {
      rpc.mockResolvedValueOnce(okSponsor);
      signUp.mockResolvedValueOnce({
        data: { user: null },
        error: { message: "User already registered", code: "user_already_exists", status: 422 },
      });
      const res = await registerResellerWithReferral({
        fullName: "Ana",
        email: "ana@test.com",
        password: "123456",
        referralCode: "PATCODE",
      });
      expect(res.error).toBe("Este e-mail já está cadastrado.");
    }
  });

  it("8 — falha antes do Auth não cria nenhum usuário (sem órfãos no cliente)", async () => {
    rpc.mockResolvedValueOnce({
      data: { valid: false, reason: "inactive", sponsor_reseller_id: null, sponsor_name: null, store_name: null },
      error: null,
    });
    await registerResellerWithReferral({
      fullName: "Ana",
      email: "ana@test.com",
      password: "123456",
      referralCode: "OLD",
    });
    expect(signUp).toHaveBeenCalledTimes(0);
  });

  it("9 — LoginPage envia a causa original para normalizeError", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const src = readFileSync(join(process.cwd(), "src/pages/LoginPage.tsx"), "utf8");
    expect(src).not.toContain("normalizeError(new Error(error)");
    expect(src).toContain('normalizeError(cause ?? { message: error }, { operation: "sign_up" })');
  });

  it("10 — erro de cadastro nunca mais cai em UNKNOWN_ERROR", () => {
    const cases: unknown[] = [
      { message: "User already registered", code: "user_already_exists" },
      { message: "referral_invalid:blocked" },
      { message: "Database error saving new user", status: 500 },
      { message: "algo totalmente inesperado" },
    ];
    for (const c of cases) {
      const err = normalizeError(c, { operation: "sign_up" });
      expect(err.code).not.toBe("UNKNOWN_ERROR");
      expect(err.metadata.signup_stage).toBeTruthy();
    }
  });
});
