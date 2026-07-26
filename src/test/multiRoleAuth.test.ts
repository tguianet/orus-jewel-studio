import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  fallbackPathForRoles,
  getSafeRedirectForRole,
  isPathAllowedForRole,
} from "@/lib/safeRedirect";
import {
  areaFromPath,
  pathForArea,
  readAreaPreference,
  userHasBothRoles,
  writeAreaPreference,
  clearAreaPreference,
} from "@/lib/areaPreference";
import { administratorBadge } from "@/lib/adminManagement";

describe("multi-role auth", () => {
  it("AuthContext expõe roles[], hasRole, isAdmin, isReseller, refreshUserRoles", () => {
    const src = readFileSync(join(process.cwd(), "src/contexts/AuthContext.tsx"), "utf8");
    expect(src).toContain("roles: AppRole[]");
    expect(src).toContain("hasRole:");
    expect(src).toContain("isAdmin:");
    expect(src).toContain("isReseller:");
    expect(src).toContain("refreshUserRoles");
    expect(src).toContain('from("user_roles")');
    expect(src).not.toMatch(/localStorage\.setItem\(["']role/);
  });

  it("usuário com uma role vai direto à área", () => {
    expect(fallbackPathForRoles(["admin"])).toBe("/admin");
    expect(fallbackPathForRoles(["sacoleira"])).toBe("/sacoleira");
    expect(getSafeRedirectForRole(null, ["admin"])).toBe("/admin");
  });

  it("usuário com duas roles vê escolha", () => {
    expect(userHasBothRoles(["admin", "sacoleira"])).toBe(true);
    expect(fallbackPathForRoles(["admin", "sacoleira"])).toBe("/escolher-area");
    expect(isPathAllowedForRole("/escolher-area", ["admin", "sacoleira"])).toBe(true);
    expect(isPathAllowedForRole("/escolher-area", ["admin"])).toBe(false);
  });

  it("preferência de área não concede permissão", () => {
    clearAreaPreference();
    writeAreaPreference("admin");
    expect(readAreaPreference()).toBe("admin");
    // Preferência é só navegação; allowlist continua baseada em roles do banco
    expect(isPathAllowedForRole("/admin", ["sacoleira"])).toBe(false);
    expect(pathForArea("reseller")).toBe("/sacoleira");
    expect(areaFromPath("/sacoleira/pedidos")).toBe("reseller");
    clearAreaPreference();
  });

  it("badge Admin + Sacoleira", () => {
    expect(
      administratorBadge({
        user_id: "1",
        nome: "A",
        email: "a@a.com",
        status: "active",
        created_at: "",
        granted_at: null,
        granted_by: null,
        is_sacoleira: true,
      }),
    ).toBe("Admin + Sacoleira");
    expect(
      administratorBadge({
        user_id: "1",
        nome: "A",
        email: "a@a.com",
        status: "active",
        created_at: "",
        granted_at: null,
        granted_by: null,
        is_sacoleira: false,
      }),
    ).toBe("Admin");
  });

  it("migration garante UNIQUE(user_id, role) e RPCs reseller", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/20260805120000_multi_role_users.sql"),
      "utf8",
    );
    expect(sql).toContain("UNIQUE (user_id, role)");
    expect(sql).toContain("admin_grant_reseller_role");
    expect(sql).toContain("admin_revoke_reseller_role");
    expect(sql).toContain("current_reseller_id");
    expect(sql).toContain("reseller_granted");
    expect(sql).toContain("SET search_path = public");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.admin_grant_reseller_role");
  });
});
