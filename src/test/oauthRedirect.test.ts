import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  isAllowedOAuthRedirect,
  resolveOAuthRedirect,
} from "@/lib/oauthRedirect";

const root = path.resolve(__dirname, "../..");

describe("oauthRedirect", () => {
  const hosts = ["app.amadaamante.com.br", "lovable.app"];

  it("S — OAuth para host autorizado funciona", () => {
    expect(isAllowedOAuthRedirect("https://app.amadaamante.com.br/callback", hosts)).toBe(true);
    expect(isAllowedOAuthRedirect("/sacoleira", hosts)).toBe(true);
    const ok = resolveOAuthRedirect("https://app.amadaamante.com.br/ok", "/", hosts);
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.url).toContain("app.amadaamante.com.br");
  });

  it("T — OAuth para host malicioso é bloqueado", () => {
    expect(isAllowedOAuthRedirect("https://evil.com/phish", hosts)).toBe(false);
    expect(isAllowedOAuthRedirect("https://lovable.app.evil.com", hosts)).toBe(false);
    expect(isAllowedOAuthRedirect("https://evil-lovable.app", hosts)).toBe(false);
    const bad = resolveOAuthRedirect("https://evil.com", "/", hosts);
    expect(bad.ok).toBe(false);
  });

  it("U — redirect codificado malicioso é bloqueado", () => {
    expect(isAllowedOAuthRedirect("%2F%2Fevil.com", hosts)).toBe(false);
    expect(isAllowedOAuthRedirect("javascript:alert(1)", hosts)).toBe(false);
    expect(isAllowedOAuthRedirect("data:text/html,hi", hosts)).toBe(false);
    expect(isAllowedOAuthRedirect("//evil.com", hosts)).toBe(false);
    expect(isAllowedOAuthRedirect("https://app.amadaamante.com.br.evil.com", hosts)).toBe(false);
  });

  it("OAuthConsent valida redirect antes de window.location", () => {
    const src = readFileSync(path.join(root, "src/pages/OAuthConsent.tsx"), "utf8");
    expect(src).toContain("isAllowedOAuthRedirect");
    expect(src).toContain("resolveOAuthRedirect");
    expect(src).toMatch(/isAllowedOAuthRedirect[\s\S]*window\.location\.href/);
  });
});
