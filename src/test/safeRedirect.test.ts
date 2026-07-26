import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  decodeRedirectCandidate,
  getSafeRedirectForRole,
  isPathAllowedForRole,
  isSafeInternalPath,
} from "@/lib/safeRedirect";

const root = path.resolve(__dirname, "../..");

describe("safeRedirect", () => {
  it("A — next=/admin válido para admin", () => {
    expect(getSafeRedirectForRole("/admin", ["admin"])).toBe("/admin");
    expect(isPathAllowedForRole("/admin", ["admin"])).toBe(true);
  });

  it("B — next=/admin/configuracoes válido para admin", () => {
    expect(getSafeRedirectForRole("/admin/configuracoes", ["admin"])).toBe("/admin/configuracoes");
  });

  it("C — next=/sacoleira válido para sacoleira", () => {
    expect(getSafeRedirectForRole("/sacoleira", ["sacoleira"])).toBe("/sacoleira");
  });

  it("D — //evil.com rejeitado", () => {
    expect(isSafeInternalPath("//evil.com")).toBe(false);
    expect(getSafeRedirectForRole("//evil.com", ["admin"])).toBe("/admin");
  });

  it("E — /\\evil rejeitado", () => {
    expect(isSafeInternalPath("/\\evil")).toBe(false);
    expect(isSafeInternalPath("/\\evil.com")).toBe(false);
  });

  it("F — %2F%2Fevil.com rejeitado", () => {
    expect(isSafeInternalPath("%2F%2Fevil.com")).toBe(false);
    expect(decodeRedirectCandidate("%2F%2Fevil.com")).toBe("//evil.com");
    expect(getSafeRedirectForRole("%2F%2Fevil.com", ["admin"])).toBe("/admin");
  });

  it("G — javascript: rejeitado", () => {
    expect(isSafeInternalPath("javascript:alert(1)")).toBe(false);
    expect(isSafeInternalPath("/javascript:alert(1)")).toBe(false);
  });

  it("H — data: rejeitado", () => {
    expect(isSafeInternalPath("data:text/html,hi")).toBe(false);
    expect(isSafeInternalPath("/data:text/html,hi")).toBe(false);
  });

  it("I — URL absoluta rejeitada", () => {
    expect(isSafeInternalPath("https://evil.com")).toBe(false);
    expect(isSafeInternalPath("http://evil.com/path")).toBe(false);
    expect(getSafeRedirectForRole("https://evil.com", ["sacoleira"])).toBe("/sacoleira");
  });

  it("J — admin puro com next=/sacoleira cai em /admin", () => {
    expect(getSafeRedirectForRole("/sacoleira", ["admin"])).toBe("/admin");
  });

  it("K — sacoleira pura com next=/admin cai em /sacoleira", () => {
    expect(getSafeRedirectForRole("/admin", ["sacoleira"])).toBe("/sacoleira");
  });

  it("multi — admin+sacoleira pode ir a ambas áreas; fallback é escolher-area", () => {
    expect(isPathAllowedForRole("/admin", ["admin", "sacoleira"])).toBe(true);
    expect(isPathAllowedForRole("/sacoleira", ["admin", "sacoleira"])).toBe(true);
    expect(getSafeRedirectForRole(null, ["admin", "sacoleira"])).toBe("/escolher-area");
    expect(getSafeRedirectForRole("/sacoleira/pedidos", ["admin", "sacoleira"])).toBe("/sacoleira/pedidos");
  });

  it("L — usuário sem role não acessa área protegida", () => {
    expect(getSafeRedirectForRole("/admin", [])).toBe("/acesso-pendente");
    expect(isPathAllowedForRole("/admin", [])).toBe(false);
    expect(isPathAllowedForRole("/sacoleira", [])).toBe(false);
  });

  it("W — next de login não cria loop para área protegida", () => {
    // next apontando para login não é allowlisted → fallback do perfil
    expect(getSafeRedirectForRole("/login-admin", ["admin"])).toBe("/admin");
    expect(getSafeRedirectForRole("/login-sacoleira", ["sacoleira"])).toBe("/sacoleira");
  });

  it("V — ProtectedRoute não renderiza conteúdo antes da validação", () => {
    const src = readFileSync(path.join(root, "src/components/ProtectedRoute.tsx"), "utf8");
    expect(src).toContain("if (loading)");
    expect(src).toContain("RouteFallback");
    expect(src).toMatch(/if \(loading\)[\s\S]*return <RouteFallback/);
    // children só após hasRequired
    expect(src).toContain("if (!hasRequired)");
    expect(src).toContain("return <>{children}</>");
  });
});
