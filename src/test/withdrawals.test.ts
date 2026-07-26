import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  friendlyWithdrawalError,
  validateWithdrawalAmount,
} from "@/lib/withdrawals";
import { isPathAllowedForRole } from "@/lib/safeRedirect";

const root = path.resolve(__dirname, "../..");

describe("withdrawals", () => {
  it("valida valor, mínimo e saldo", () => {
    expect(validateWithdrawalAmount({ amount: 50, available: 100, minimum: 50 }).ok).toBe(true);
    expect(validateWithdrawalAmount({ amount: 49.99, available: 100, minimum: 50 }).ok).toBe(false);
    expect(validateWithdrawalAmount({ amount: 120, available: 100, minimum: 50 }).ok).toBe(false);
    expect(validateWithdrawalAmount({ amount: 0, available: 100, minimum: 50 }).ok).toBe(false);
    expect(validateWithdrawalAmount({ amount: -10, available: 100, minimum: 50 }).ok).toBe(false);
  });

  it("mensagens amigáveis e anti-duplo envio no modal", () => {
    expect(friendlyWithdrawalError("Saldo insuficiente")).toBe("Saldo insuficiente.");
    expect(friendlyWithdrawalError("Valor abaixo do mínimo de saque (50).")).toContain("mínimo");
    expect(friendlyWithdrawalError("network fetch failed")).toContain("rede");

    const modal = readFileSync(
      path.join(root, "src/components/withdrawals/WithdrawalRequestModal.tsx"),
      "utf8",
    );
    expect(modal).toContain("if (busy) return");
    expect(modal).toContain("idempotencyKey");
    expect(modal).toContain("disabled={busy}");
  });

  it("rotas por perfil", () => {
    expect(isPathAllowedForRole("/sacoleira/saques", ["sacoleira"])).toBe(true);
    expect(isPathAllowedForRole("/admin/saques", ["admin"])).toBe(true);
    expect(isPathAllowedForRole("/admin/saques", ["sacoleira"])).toBe(false);
    expect(isPathAllowedForRole("/sacoleira/saques", ["admin"])).toBe(false);

    const app = readFileSync(path.join(root, "src/App.tsx"), "utf8");
    expect(app).toContain('/sacoleira/saques');
    expect(app).toContain('/admin/saques');
  });

  it("resposta idempotente tratada no fluxo", () => {
    const lib = readFileSync(path.join(root, "src/lib/withdrawals.ts"), "utf8");
    expect(lib).toContain("idempotent");
    expect(lib).toContain("p_idempotency_key");
  });
});
