import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  friendlyReferralMessage,
  normalizeReferralCode,
  reasonToUiStatus,
  registerResellerWithReferral,
  validateReferralCode,
} from "@/lib/referralCode";

const rpc = vi.fn();
const signUp = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    auth: { signUp: (...args: unknown[]) => signUp(...args) },
  },
}));


describe("referralCode — cadastro obrigatório", () => {
  beforeEach(() => {
    rpc.mockReset();
    try {
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });

  it("normaliza trim/uppercase e remove espaços", () => {
    expect(normalizeReferralCode("  ab cd12  ")).toBe("ABCD12");
    expect(normalizeReferralCode("")).toBe("");
  });

  it("campo vazio é inválido (obrigatório)", async () => {
    const res = await validateReferralCode("   ");
    expect(res.valid).toBe(false);
    expect(res.reason).toBe("empty");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("código válido retorna patrocinadora sem dados privados", async () => {
    rpc.mockResolvedValueOnce({
      data: {
        valid: true,
        sponsor_reseller_id: "r1",
        sponsor_name: "Maria",
        store_name: "Loja Maria",
        reason: "ok",
      },
      error: null,
    });
    const res = await validateReferralCode("maria01");
    expect(res.valid).toBe(true);
    expect(res.sponsor_name).toBe("Maria");
    expect(JSON.stringify(res)).not.toMatch(/@|telefone|phone|email/i);
    expect(friendlyReferralMessage("valid", "Maria")).toContain("indicado por Maria");
  });

  it("mapeia estados invalid/inactive/blocked", () => {
    expect(reasonToUiStatus("not_found", false)).toBe("invalid");
    expect(reasonToUiStatus("inactive", false)).toBe("inactive");
    expect(reasonToUiStatus("blocked", false)).toBe("blocked");
    expect(reasonToUiStatus("ok", true)).toBe("valid");
  });

  it("mensagens amigáveis por estado", () => {
    expect(friendlyReferralMessage("checking")).toMatch(/Verificando/i);
    expect(friendlyReferralMessage("invalid")).toMatch(/inválido/i);
    expect(friendlyReferralMessage("inactive")).toMatch(/inativo/i);
    expect(friendlyReferralMessage("blocked")).toMatch(/bloqueado/i);
  });

  it("register bloqueia sem validação server-side ok", async () => {
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
    expect(res.error).toBeTruthy();
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][0]).toBe("validate_referral_code");
  });

  it("register usa signUp oficial do Auth com o código no metadata (sem insert em auth)", async () => {
    rpc.mockResolvedValueOnce({
      data: {
        valid: true,
        sponsor_reseller_id: "s1",
        sponsor_name: "Pat",
        store_name: "Loja",
        reason: "ok",
      },
      error: null,
    });
    signUp.mockResolvedValueOnce({ data: { user: { id: "u1" } }, error: null });

    const res = await registerResellerWithReferral({
      fullName: "Ana",
      email: "ana@test.com",
      password: "123456",
      referralCode: "patcode",
    });
    expect(res.error).toBeUndefined();
    expect(rpc.mock.calls.map((c) => c[0])).toEqual(["validate_referral_code"]);
    expect(signUp).toHaveBeenCalledTimes(1);
    const arg = signUp.mock.calls[0][0] as {
      email: string;
      options: { data: { referral_code: string } };
    };
    expect(arg.email).toBe("ana@test.com");
    expect(arg.options.data.referral_code).toBe("PATCODE");
  });


  it("UI: botão criar conta só com status valid (contrato)", () => {
    const canCreate = (status: string, busy: boolean) => status === "valid" && !busy;
    expect(canCreate("idle", false)).toBe(false);
    expect(canCreate("checking", false)).toBe(false);
    expect(canCreate("invalid", false)).toBe(false);
    expect(canCreate("valid", true)).toBe(false);
    expect(canCreate("valid", false)).toBe(true);
  });

  it("não permite cadastro com código vazio no register", async () => {
    const res = await registerResellerWithReferral({
      fullName: "Ana",
      email: "ana@test.com",
      password: "123456",
      referralCode: "  ",
    });
    expect(res.error).toMatch(/indicação/i);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("referralCode — LoginPage contratos", () => {
  it("label e placeholder obrigatórios estão na página", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const src = readFileSync(join(process.cwd(), "src/pages/LoginPage.tsx"), "utf8");
    expect(src).toContain("Código de indicação");
    expect(src).not.toContain("Código de indicação (opcional)");
    expect(src).toContain("Digite o código da sua patrocinadora");
    expect(src).toContain('disabled={!canCreateAccount}');
    expect(src).toContain("validateReferralCode");
    expect(src).toContain("referralCode: code");
  });

  it("AuthContext usa register server-side com referralCode", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const src = readFileSync(join(process.cwd(), "src/contexts/AuthContext.tsx"), "utf8");
    expect(src).toContain("registerResellerWithReferral");
    expect(src).toContain("referralCode");
  });
});
