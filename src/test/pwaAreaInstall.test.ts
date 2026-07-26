import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  extractInstallAreaSlug,
  getCurrentPwaManifest,
  getInstallButtonLabel,
} from "@/lib/pwaInstall";
import { isPathWithinManifestScope } from "@/pwa/manifestConfig";

describe("pwaAreaInstall", () => {
  it("G — Admin instala manifest Admin", () => {
    const m = getCurrentPwaManifest("/admin/configuracoes");
    expect(m.kind).toBe("admin");
    expect(m.id).toBe("/admin-app");
    expect(m.startUrl).toBe("/admin");
    expect(m.scope).toBe("/admin/");
    expect(m.manifestHref).toContain("manifest-admin");
    expect(getInstallButtonLabel("admin")).toBe("Instalar Admin");
  });

  it("H — Sacoleira instala manifest Sacoleira", () => {
    const m = getCurrentPwaManifest("/sacoleira/configuracoes");
    expect(m.kind).toBe("sacoleira");
    expect(m.id).toBe("/sacoleira-app");
    expect(m.scope).toBe("/sacoleira/");
    expect(m.manifestHref).toContain("manifest-sacoleira");
  });

  it("I — Loja preserva slug", () => {
    const slug = extractInstallAreaSlug("/loja/jessica-ifangee/carrinho");
    expect(slug).toBe("jessica-ifangee");
    const m = getCurrentPwaManifest("/loja/jessica-ifangee");
    expect(m.id).toBe("/loja/jessica-ifangee");
    expect(m.scope).toBe("/loja/jessica-ifangee/");
    expect(m.startUrl).toBe("/loja/jessica-ifangee");
    expect(isPathWithinManifestScope("/loja/jessica-ifangee/carrinho", m.scope)).toBe(true);
    expect(isPathWithinManifestScope("/admin", m.scope)).toBe(false);
  });

  it("R — manifestos continuam separados", () => {
    const a = getCurrentPwaManifest("/admin");
    const s = getCurrentPwaManifest("/sacoleira");
    const l = getCurrentPwaManifest("/loja/demo");
    expect(new Set([a.id, s.id, l.id]).size).toBe(3);
    expect(a.scope).not.toBe(s.scope);
    expect(s.scope).not.toBe(l.scope);
  });

  it("S — nenhum uninstall é necessário (código não chama unregister)", () => {
    const register = readFileSync(join(process.cwd(), "src/pwa/registerPwa.ts"), "utf8");
    expect(register).not.toMatch(/\bregistration\.unregister\b|\.unregister\(/);
    expect(register).toContain("onNeedRefresh");
    expect(register).toContain("autoUpdate");
    const vite = readFileSync(join(process.cwd(), "vite.config.ts"), "utf8");
    expect(vite).toContain('registerType: "autoUpdate"');
    expect(vite).not.toContain('registerType: "prompt"');
  });

  it("UI por área referencia botão de instalação", () => {
    const admin = readFileSync(join(process.cwd(), "src/pages/admin/AdminSettings.tsx"), "utf8");
    const seller = readFileSync(join(process.cwd(), "src/pages/seller/SellerSettings.tsx"), "utf8");
    const store = readFileSync(join(process.cwd(), "src/pages/store/StoreLayout.tsx"), "utf8");
    expect(admin).toContain("PwaInstallButton");
    expect(seller).toContain("PwaInstallButton");
    expect(store).toContain("PwaInstallButton");
  });
});
