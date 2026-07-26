import { afterEach, describe, expect, it } from "vitest";
import {
  buildWebManifest,
  extractLojaSlug,
  getLojaManifestConfig,
  getPwaManifestConfig,
  isPathWithinManifestScope,
  lojaAppId,
  lojaManifestPath,
  lojaScope,
  lojaStartUrl,
  resolvePwaKind,
  titleFromSlug,
  truncateShortName,
  writeCachedLojaBranding,
  LOJA_BRANDING_STORAGE_PREFIX,
} from "@/pwa/manifestConfig";
import { resetPwaManifestApplyStateForTests } from "@/pwa/applyManifest";

afterEach(() => {
  resetPwaManifestApplyStateForTests();
  localStorage.clear();
});

describe("PWA multi-app — scopes e identidades", () => {
  it("A — Admin: id, start_url /admin, scope /admin/, display standalone", () => {
    const cfg = getPwaManifestConfig("/admin/pedidos");
    const m = buildWebManifest(cfg);
    expect(cfg.kind).toBe("admin");
    expect(m.id).toBe("/admin-app");
    expect(m.start_url).toBe("/admin");
    expect(m.scope).toBe("/admin/");
    expect(m.display).toBe("standalone");
    expect(m.name).toBe("Amada Amante Admin");
    expect(m.short_name).toBe("Admin");
    expect(m.scope).not.toBe("/");
  });

  it("B — Sacoleira: id, start_url /sacoleira, scope /sacoleira/", () => {
    const cfg = getPwaManifestConfig("/sacoleira/pedidos");
    const m = buildWebManifest(cfg);
    expect(m.id).toBe("/sacoleira-app");
    expect(m.start_url).toBe("/sacoleira");
    expect(m.scope).toBe("/sacoleira/");
    expect(m.name).toBe("Amada Amante Sacoleira");
    expect(m.short_name).toBe("Sacoleira");
  });

  it("C — Loja Jessica: id/start/scope preservam slug", () => {
    const slug = "jessica-ifangee";
    const cfg = getLojaManifestConfig(slug, {
      slug,
      name: "Jessica Ifangee",
      shortName: "Jessica",
      themeColor: "#112233",
    });
    const m = buildWebManifest(cfg);
    expect(m.id).toBe(`/loja/${slug}`);
    expect(m.start_url).toBe(`/loja/${slug}`);
    expect(m.scope).toBe(`/loja/${slug}/`);
    expect(m.name).toBe("Jessica Ifangee");
    expect(m.short_name).toBe("Jessica");
    expect(m.theme_color).toBe("#112233");
    expect(lojaManifestPath(slug)).toBe(`/loja/${slug}/manifest.webmanifest`);
  });

  it("D — Admin scope nao captura /loja/*", () => {
    const admin = getPwaManifestConfig("/admin");
    expect(isPathWithinManifestScope("/loja/jessica-ifangee", admin.scope)).toBe(false);
    expect(isPathWithinManifestScope("/sacoleira", admin.scope)).toBe(false);
    expect(isPathWithinManifestScope("/admin", admin.scope)).toBe(true);
    expect(isPathWithinManifestScope("/admin/financeiro", admin.scope)).toBe(true);
  });

  it("E — Loja scope nao captura /admin", () => {
    const loja = getLojaManifestConfig("jessica-ifangee");
    expect(isPathWithinManifestScope("/admin", loja.scope)).toBe(false);
    expect(isPathWithinManifestScope("/sacoleira", loja.scope)).toBe(false);
    expect(isPathWithinManifestScope("/loja/jessica-ifangee", loja.scope)).toBe(true);
    expect(isPathWithinManifestScope("/loja/jessica-ifangee/checkout", loja.scope)).toBe(true);
  });

  it("F — duas lojas tem ids e scopes distintos", () => {
    const a = buildWebManifest(getLojaManifestConfig("jessica-ifangee"));
    const b = buildWebManifest(getLojaManifestConfig("maria-joias"));
    expect(a.id).not.toBe(b.id);
    expect(a.scope).not.toBe(b.scope);
    expect(a.start_url).not.toBe(b.start_url);
    expect(isPathWithinManifestScope("/loja/maria-joias", a.scope)).toBe(false);
    expect(isPathWithinManifestScope("/loja/jessica-ifangee", b.scope)).toBe(false);
  });

  it("G — branding da loja (nome, icone, slug) e fallback Amada Amante", () => {
    writeCachedLojaBranding({
      slug: "jessica-ifangee",
      name: "Loja da Jessica",
      shortName: "Jessica",
      logoUrl: "https://cdn.example/logo.png",
      themeColor: "#aabbcc",
    });
    const withBrand = getLojaManifestConfig("jessica-ifangee");
    expect(withBrand.name).toBe("Loja da Jessica");
    expect(withBrand.icons[0].src).toBe("https://cdn.example/logo.png");
    expect(localStorage.getItem(`${LOJA_BRANDING_STORAGE_PREFIX}jessica-ifangee`)).toBeTruthy();

    const fallback = getLojaManifestConfig("nova-loja-sem-cache");
    expect(fallback.name).toBe(titleFromSlug("nova-loja-sem-cache"));
    expect(fallback.icons[0].src).toContain("/icons/loja-192.png");
  });

  it("H — links fora do scope sao detectados (abrir no Chrome)", () => {
    const admin = getPwaManifestConfig("/admin");
    const loja = getLojaManifestConfig("jessica-ifangee");
    expect(isPathWithinManifestScope("/politica-de-privacidade", admin.scope)).toBe(false);
    expect(isPathWithinManifestScope("/loja/outra", loja.scope)).toBe(false);
    expect(isPathWithinManifestScope("/login-admin", admin.scope)).toBe(false);
    expect(isPathWithinManifestScope("/", loja.scope)).toBe(false);
  });

  it("I — ids exclusivos entre areas (update nao troca identidade)", () => {
    const admin = buildWebManifest(getPwaManifestConfig("/admin"));
    const sac = buildWebManifest(getPwaManifestConfig("/sacoleira"));
    const loja = buildWebManifest(getLojaManifestConfig("jessica-ifangee"));
    const ids = new Set([admin.id, sac.id, loja.id]);
    expect(ids.size).toBe(3);
    expect(admin.id).toBe("/admin-app");
    expect(sac.id).toBe("/sacoleira-app");
    expect(loja.id).toBe(lojaAppId("jessica-ifangee"));
  });

  it("J — helpers de slug/path e kind; landing nao e instalavel de dominio", () => {
    expect(resolvePwaKind("/admin")).toBe("admin");
    expect(resolvePwaKind("/login-admin")).toBe("admin");
    expect(resolvePwaKind("/sacoleira/loja")).toBe("sacoleira");
    expect(resolvePwaKind("/loja/jessica-ifangee/carrinho")).toBe("loja");
    expect(resolvePwaKind("/")).toBe("default");
    expect(extractLojaSlug("/loja/jessica-ifangee/produto/1")).toBe("jessica-ifangee");
    expect(lojaStartUrl("jessica-ifangee")).toBe("/loja/jessica-ifangee");
    expect(lojaScope("jessica-ifangee")).toBe("/loja/jessica-ifangee/");
    expect(truncateShortName("Nome Muito Longo Da Loja").length).toBeLessThanOrEqual(12);

    const landing = getPwaManifestConfig("/");
    expect(landing.kind).toBe("default");
    expect(landing.scope).not.toBe("/");
    expect(landing.scope).toBe("/__pwa_none__/");
  });
});
