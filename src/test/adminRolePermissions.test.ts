import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const rpc = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    from: vi.fn(),
  },
}));

import {
  canRevokeAdministrator,
  getAdminRoleAudit,
  grantAdminRole,
  listAdministrators,
  revokeAdminRole,
  searchUsersForAdmin,
} from "@/lib/adminManagement";
import type { AdministratorRow } from "@/types/adminManagement";

beforeEach(() => {
  rpc.mockReset();
});

describe("admin role permissions (frontend)", () => {
  it("somente admin vê página — rota protegida por role admin", () => {
    const app = readFileSync(join(process.cwd(), "src/App.tsx"), "utf8");
    expect(app).toContain('/admin/configuracoes/administradores');
    expect(app).toContain("AdminAdministrators");
    // Rota aninhada no wrapper Admin (= ProtectedRoute role=admin)
    expect(app).toMatch(
      /path="\/admin\/configuracoes\/administradores"\s+element=\{<Admin><AdminAdministrators/,
    );
  });

  it("menu Configurações aponta para Administradores", () => {
    const settings = readFileSync(join(process.cwd(), "src/pages/admin/AdminSettings.tsx"), "utf8");
    expect(settings).toContain("/admin/configuracoes/administradores");
    expect(settings).toContain("Administradores");
  });

  it("busca chama RPC admin_search_users", async () => {
    rpc.mockResolvedValueOnce({
      data: {
        items: [
          {
            user_id: "u1",
            nome: "Ana",
            email: "ana@test.com",
            is_admin: false,
            is_sacoleira: true,
            created_at: "2026-01-01",
          },
        ],
        query: "ana",
        limit: 20,
      },
      error: null,
    });
    const result = await searchUsersForAdmin("ana@test.com");
    expect(rpc).toHaveBeenCalledWith("admin_search_users", {
      p_query: "ana@test.com",
      p_limit: 20,
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].email).toBe("ana@test.com");
  });

  it("confirmação de grant chama RPC sem alterar user_roles direto", async () => {
    rpc.mockResolvedValueOnce({
      data: { ok: true, already_admin: false, user_id: "u2", new_role: "admin" },
      error: null,
    });
    const result = await grantAdminRole("u2", "promocao");
    expect(result.ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith("admin_grant_role", {
      p_user_id: "u2",
      p_reason: "promocao",
    });
    expect(rpc.mock.calls[0][0]).not.toBe("from");
  });

  it("remoção exige motivo e bloqueia último admin na UI", async () => {
    const only: AdministratorRow[] = [
      {
        user_id: "solo",
        nome: "Solo",
        email: "solo@test.com",
        status: "active",
        created_at: "2026-01-01",
        granted_at: "2026-01-01",
        granted_by: null,
      },
    ];
    expect(canRevokeAdministrator("solo", only).ok).toBe(false);

    rpc.mockResolvedValueOnce({
      data: { ok: true, already_revoked: false, user_id: "u3", self_revoke: false },
      error: null,
    });
    await revokeAdminRole("u3", "saída da equipe");
    expect(rpc).toHaveBeenCalledWith("admin_revoke_role", {
      p_user_id: "u3",
      p_reason: "saída da equipe",
    });
  });

  it("lista e auditoria atualizam via RPC", async () => {
    rpc
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              user_id: "a1",
              nome: "Admin",
              email: "a@test.com",
              status: "active",
              created_at: "2026-01-01",
              granted_at: "2026-01-02",
              granted_by: "b1",
            },
          ],
          total: 1,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              id: "log1",
              target_user_id: "a1",
              target_name: "Admin",
              target_email: "a@test.com",
              action: "admin_granted",
              previous_role: "sacoleira",
              new_role: "admin",
              performed_by: "b1",
              performed_by_name: "Boss",
              reason: "ok",
              created_at: "2026-01-02",
            },
          ],
          total: 1,
          page: 1,
          page_size: 20,
        },
        error: null,
      });

    const list = await listAdministrators();
    const audit = await getAdminRoleAudit(1, 20);
    expect(list.total).toBe(1);
    expect(audit.items[0].action).toBe("admin_granted");
    expect(rpc).toHaveBeenNthCalledWith(1, "admin_list_administrators", {});
    expect(rpc).toHaveBeenNthCalledWith(2, "admin_get_role_audit", {
      p_page: 1,
      p_page_size: 20,
    });
  });

  it("página integra refreshUserRole e botão desabilitado durante envio", () => {
    const page = readFileSync(join(process.cwd(), "src/pages/admin/AdminAdministrators.tsx"), "utf8");
    const dialog = readFileSync(
      join(process.cwd(), "src/components/admin/AdminRoleConfirmDialog.tsx"),
      "utf8",
    );
    expect(page).toContain("refreshUserRole");
    expect(page).toContain("submitting");
    expect(page).toContain("disabled={submitting");
    expect(dialog).toContain("Este usuário terá acesso total ao sistema.");
    expect(dialog).toContain("(obrigatório)");
    expect(dialog).toContain("disabled={submitting || !reasonOk}");
    expect(page).not.toMatch(/:\s*any\b|<any>|as any/);
    expect(page).not.toContain('from("user_roles")');
  });

  it("AuthContext expõe refreshUserRole para invalidar acesso", () => {
    const ctx = readFileSync(join(process.cwd(), "src/contexts/AuthContext.tsx"), "utf8");
    expect(ctx).toContain("refreshUserRole");
    expect(ctx).toContain('from("user_roles")');
  });

  it("migration endurece user_roles e cria auditoria", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/20260804120000_admin_management.sql"),
      "utf8",
    );
    expect(sql).toContain("admin_role_audit_log");
    expect(sql).toContain("SET search_path = public");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.admin_grant_role");
    expect(sql).toContain("Não é possível remover o último admin");
    expect(sql).toContain("REVOKE INSERT, UPDATE, DELETE ON TABLE public.user_roles");
    expect(sql).toContain("public.is_admin(auth.uid())");
  });
});
