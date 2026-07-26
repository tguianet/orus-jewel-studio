import { describe, expect, it, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  beginSessionExpiryRedirect,
  endSessionExpiryRedirect,
  friendlyAuthError,
  resetSessionExpiryGuardForTests,
  resolveSessionExpiryLoginPath,
  SESSION_EXPIRED_MESSAGE,
  shouldTreatAsSessionExpiry,
} from "@/lib/authSession";
import { clearAuthStorage, isAuthStorageKey } from "@/lib/authStorage";

const root = path.resolve(__dirname, "../..");

describe("authSession", () => {
  beforeEach(() => {
    resetSessionExpiryGuardForTests();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("M — sessão expirada limpa auth e preserva carrinho", () => {
    localStorage.setItem("sb-xxxx-auth-token", JSON.stringify({ access_token: "x" }));
    localStorage.setItem("amada-cart-public", JSON.stringify([{ id: "1" }]));
    sessionStorage.setItem("sb-yyyy-auth-token", "tok");
    sessionStorage.setItem("cart-draft", "keep-me");

    clearAuthStorage();

    expect(localStorage.getItem("sb-xxxx-auth-token")).toBeNull();
    expect(sessionStorage.getItem("sb-yyyy-auth-token")).toBeNull();
    expect(localStorage.getItem("amada-cart-public")).toBe(JSON.stringify([{ id: "1" }]));
    expect(sessionStorage.getItem("cart-draft")).toBe("keep-me");
    expect(isAuthStorageKey("sb-xxxx-auth-token")).toBe(true);
    expect(isAuthStorageKey("amada-cart-public")).toBe(false);
  });

  it("N — logout manual não mostra aviso de sessão expirada", () => {
    expect(shouldTreatAsSessionExpiry({
      manualSignOut: true,
      reason: "signed_out_unexpected",
    })).toBe(false);

    const ctx = readFileSync(path.join(root, "src/contexts/AuthContext.tsx"), "utf8");
    expect(ctx).toContain("manualSignOutRef");
    expect(ctx).toContain("AUTH_SESSION_EXPIRED");
    expect(ctx).toMatch(/if \(manualSignOutRef\.current\)[\s\S]*return/);
  });

  it("impede múltiplos redirects de sessão expirada", () => {
    expect(beginSessionExpiryRedirect()).toBe(true);
    expect(beginSessionExpiryRedirect()).toBe(false);
    endSessionExpiryRedirect();
    expect(beginSessionExpiryRedirect()).toBe(true);
  });

  it("resolve login com next seguro e mensagem canônica", () => {
    expect(SESSION_EXPIRED_MESSAGE).toBe("Sua sessão expirou. Entre novamente.");
    expect(resolveSessionExpiryLoginPath({
      lastRole: "admin",
      currentPath: "/admin/pedidos",
    })).toBe("/login-admin?next=%2Fadmin%2Fpedidos");
    expect(resolveSessionExpiryLoginPath({
      lastRole: "sacoleira",
      currentPath: "//evil.com",
    })).toBe("/login-sacoleira");
    expect(friendlyAuthError("Invalid login credentials")).toBe("Email ou senha inválidos.");
  });

  it("X — AuthContext expõe refreshUserRole", () => {
    const ctx = readFileSync(path.join(root, "src/contexts/AuthContext.tsx"), "utf8");
    expect(ctx).toContain("refreshUserRole");
    expect(ctx).toContain("refreshUserRoles");
    expect(ctx).toContain("user_roles");
  });
});
