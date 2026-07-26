import { describe, expect, it } from "vitest";
import {
  adminActionLabel,
  canRevokeAdministrator,
  formatAdminDate,
  friendlyAdminManagementError,
} from "@/lib/adminManagement";
import type { AdministratorRow } from "@/types/adminManagement";

const admin = (id: string, status: string = "active"): AdministratorRow => ({
  user_id: id,
  nome: `Admin ${id}`,
  email: `${id}@test.com`,
  status,
  created_at: "2026-01-01T00:00:00.000Z",
  granted_at: "2026-01-02T00:00:00.000Z",
  granted_by: "actor",
});

describe("adminManagement helpers", () => {
  it("mapeia erros amigáveis sem vazar SQL", () => {
    expect(friendlyAdminManagementError("Acesso negado")).toBe("Acesso negado.");
    expect(friendlyAdminManagementError("Usuário não encontrado")).toBe("Usuário não encontrado.");
    expect(friendlyAdminManagementError("Usuário já é admin")).toBe("Usuário já é admin.");
    expect(friendlyAdminManagementError("Não é possível remover o último admin")).toBe(
      "Não é possível remover o último admin.",
    );
    expect(friendlyAdminManagementError("Motivo obrigatório")).toBe("Informe o motivo da remoção.");
    expect(friendlyAdminManagementError("Consulta muito curta")).toBe(
      "Digite ao menos 3 caracteres para buscar.",
    );
    expect(friendlyAdminManagementError("Operação já realizada")).toBe("Operação já realizada.");
    expect(friendlyAdminManagementError("relation does not exist")).toBe(
      "Falha temporária. Tente novamente.",
    );
  });

  it("protege último admin ativo", () => {
    const only = [admin("a1")];
    expect(canRevokeAdministrator("a1", only)).toEqual({
      ok: false,
      reason: "Não é possível remover o último admin.",
    });

    const two = [admin("a1"), admin("a2")];
    expect(canRevokeAdministrator("a1", two)).toEqual({ ok: true });
  });

  it("labels e datas de auditoria", () => {
    expect(adminActionLabel("admin_granted")).toBe("Concedeu admin");
    expect(adminActionLabel("admin_revoked")).toBe("Removeu admin");
    expect(formatAdminDate(null)).toBe("—");
    expect(formatAdminDate("invalid")).toBe("—");
    expect(formatAdminDate("2026-07-26T12:00:00.000Z")).toMatch(/2026/);
  });

  it("motivo obrigatório na remoção (regra de lib)", async () => {
    const { revokeAdminRole } = await import("@/lib/adminManagement");
    await expect(revokeAdminRole("u1", "  ")).rejects.toThrow("Informe o motivo da remoção.");
    await expect(revokeAdminRole("u1", "ab")).rejects.toThrow("Informe o motivo da remoção.");
  });

  it("busca exige mínimo de 3 caracteres", async () => {
    const { searchUsersForAdmin } = await import("@/lib/adminManagement");
    await expect(searchUsersForAdmin("ab")).rejects.toThrow(
      "Digite ao menos 3 caracteres para buscar.",
    );
  });
});
