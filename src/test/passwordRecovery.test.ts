import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  canSubmitPasswordRecovery,
  isPasswordRecoveryEvent,
  isPasswordStrongEnough,
  isExpiredRecoveryMessage,
  parseRecoveryParams,
  passwordsMatch,
  RECOVERY_ERROR_INVALID,
  RECOVERY_SUCCESS_MESSAGE,
} from "@/lib/authSession";

const root = path.resolve(__dirname, "../..");
const page = () => readFileSync(path.join(root, "src/pages/ResetPasswordPage.tsx"), "utf8");

describe("passwordRecovery", () => {
  it("O — recovery válido aceita PASSWORD_RECOVERY", () => {
    expect(isPasswordRecoveryEvent("PASSWORD_RECOVERY")).toBe(true);
    expect(page()).toContain("isPasswordRecoveryEvent");
    expect(page()).toContain("PASSWORD_RECOVERY");
  });

  it("P — SIGNED_IN comum não permite reset", () => {
    expect(isPasswordRecoveryEvent("SIGNED_IN")).toBe(false);
    expect(isPasswordRecoveryEvent("TOKEN_REFRESHED")).toBe(false);
    const src = page();
    expect(src).not.toMatch(/event === ["']SIGNED_IN["']/);
    expect(src).toMatch(/SIGNED_IN comum não libera|SIGNED_IN existente NÃO autoriza/i);
  });

  it("Q — token expirado mostra erro", () => {
    const src = page();
    expect(src).toContain("expired");
    expect(src).toContain("Este link de recuperação expirou");
    expect(src).toContain('"expired"');
  });

  it("R — duplo envio de nova senha é bloqueado", () => {
    expect(canSubmitPasswordRecovery({
      recoveryConfirmed: true,
      busy: false,
      alreadySucceeded: false,
    })).toBe(true);
    expect(canSubmitPasswordRecovery({
      recoveryConfirmed: true,
      busy: true,
      alreadySucceeded: false,
    })).toBe(false);
    expect(canSubmitPasswordRecovery({
      recoveryConfirmed: true,
      busy: false,
      alreadySucceeded: true,
    })).toBe(false);
    expect(canSubmitPasswordRecovery({
      recoveryConfirmed: false,
      busy: false,
      alreadySucceeded: false,
    })).toBe(false);

    expect(isPasswordStrongEnough("1234567")).toBe(false);
    expect(isPasswordStrongEnough("12345678")).toBe(true);
    expect(passwordsMatch("abc", "abc")).toBe(true);
    expect(passwordsMatch("abc", "xyz")).toBe(false);

    const src = page();
    expect(src).toContain("canSubmitPasswordRecovery");
    expect(src).toContain("alreadySucceeded");
  });
});

describe("recovery link parsing (/redefinir-senha)", () => {
  it("aceita fluxo PKCE com ?code", () => {
    const p = parseRecoveryParams("?code=abc123", "");
    expect(p.code).toBe("abc123");
    expect(p.errorDescription).toBeNull();
  });

  it("aceita fluxo legado com hash recovery", () => {
    const p = parseRecoveryParams("", "#access_token=aa&refresh_token=bb&type=recovery");
    expect(p.accessToken).toBe("aa");
    expect(p.refreshToken).toBe("bb");
    expect(p.isRecoveryType).toBe(true);
  });

  it("detecta link expirado", () => {
    const p = parseRecoveryParams("?error=access_denied&error_code=otp_expired", "");
    expect(p.expired).toBe(true);
    expect(isExpiredRecoveryMessage("Email link is invalid or has expired")).toBe(true);
  });

  it("rota pública /redefinir-senha registrada e usada no redirectTo", () => {
    const app = readFileSync(path.join(root, "src/App.tsx"), "utf8");
    expect(app).toContain('path="/redefinir-senha"');
    const login = readFileSync(path.join(root, "src/pages/LoginPage.tsx"), "utf8");
    expect(login).toContain("${window.location.origin}/redefinir-senha");
    expect(app).not.toMatch(/ProtectedRoute[^>]*redefinir-senha/);
  });

  it("mensagens de erro e sucesso padronizadas", () => {
    const src = page();
    expect(src).toContain("RECOVERY_SUCCESS_MESSAGE");
    expect(RECOVERY_SUCCESS_MESSAGE).toBe("Senha alterada com sucesso. Entre novamente.");
    expect(RECOVERY_ERROR_INVALID).toBe("Este link de recuperação não é mais válido.");
  });
});
