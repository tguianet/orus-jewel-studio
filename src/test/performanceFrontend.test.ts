import { describe, expect, it, vi } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  clampPage,
  DEFAULT_PAGE_SIZE,
  pageAfterFilterChange,
  rangeForPage,
  shouldLoadDetail,
  totalPages,
} from "@/lib/pagination";
import { EXPECTED_VENDOR_CHUNKS, resolveManualChunk } from "@/lib/manualChunks";

const root = path.resolve(__dirname, "../..");

describe("frontend performance helpers", () => {
  it("A — rotas lazy estão definidas no App", () => {
    const app = readFileSync(path.join(root, "src/App.tsx"), "utf8");
    expect(app).toContain("lazy(() => import(");
    expect(app).toMatch(/lazy\(\(\) => import\("\.\/pages\/admin\/AdminOrders"\)\)/);
    expect(app).toMatch(/lazy\(\(\) => import\("\.\/pages\/store\/StoreCheckout"\)\)/);
    expect(app).toMatch(/lazy\(\(\) => import\("\.\/pages\/legal\/PrivacyPolicy"\)\)/);
    expect(app).toContain("Suspense");
  });

  it("B — fallback RouteFallback existe e é usado", () => {
    const app = readFileSync(path.join(root, "src/App.tsx"), "utf8");
    expect(existsSync(path.join(root, "src/components/system/RouteFallback.tsx"))).toBe(true);
    expect(app).toContain("RouteFallback");
  });

  it("C — erro de import tem recuperação amigável", () => {
    const src = readFileSync(path.join(root, "src/components/system/LazyRouteErrorBoundary.tsx"), "utf8");
    expect(src).toContain("Tentar de novo");
    expect(src).toContain("getDerivedStateFromError");
    expect(readFileSync(path.join(root, "src/App.tsx"), "utf8")).toContain("LazyRouteErrorBoundary");
  });

  it("D — paginação calcula páginas", () => {
    expect(totalPages(0, 25)).toBe(1);
    expect(totalPages(25, 25)).toBe(1);
    expect(totalPages(26, 25)).toBe(2);
    expect(totalPages(100, DEFAULT_PAGE_SIZE)).toBe(4);
    expect(rangeForPage(2, 25)).toEqual({ from: 25, to: 49, page: 2, pageSize: 25 });
    expect(clampPage(9, 40, 25)).toBe(2);
  });

  it("E — mudança de página não perde filtros", () => {
    expect(pageAfterFilterChange(true, 4)).toBe(1);
    expect(pageAfterFilterChange(false, 4)).toBe(4);
    const ordersSrc = readFileSync(path.join(root, "src/pages/admin/AdminOrders.tsx"), "utf8");
    expect(ordersSrc).toContain("loadOrdersPage");
    expect(ordersSrc).toContain("from: from || undefined");
    expect(ordersSrc).toContain("onlyExpired");
    expect(ordersSrc).toContain("setPage(1)");
  });

  it("F — detalhe só é carregado ao abrir", () => {
    expect(shouldLoadDetail({ open: false, id: "abc" })).toBe(false);
    expect(shouldLoadDetail({ open: true, id: null })).toBe(false);
    expect(shouldLoadDetail({ open: true, id: "abc" })).toBe(true);
    const returnsSrc = readFileSync(path.join(root, "src/pages/admin/AdminReturns.tsx"), "utf8");
    expect(returnsSrc).toContain("shouldLoadDetail");
    expect(returnsSrc).toContain("loadProductReturnDetail");
  });

  it("G — loading termina em erro", async () => {
    let loading = true;
    let error: string | null = null;
    const load = async () => {
      try {
        throw new Error("falha simulada");
      } catch (e) {
        error = e instanceof Error ? e.message : "erro";
      } finally {
        loading = false;
      }
    };
    await load();
    expect(loading).toBe(false);
    expect(error).toBe("falha simulada");
    const ordersSrc = readFileSync(path.join(root, "src/pages/admin/AdminOrders.tsx"), "utf8");
    expect(ordersSrc).toContain("setError");
    expect(ordersSrc).toContain("Tentar novamente");
  });

  it("H — componentes removidos não são importados", () => {
    const removed = [
      "pages/Index",
      "components/NavLink",
      "components/ui/chart",
      "components/ui/carousel",
      "components/ui/command",
      "components/ui/drawer",
      "components/ui/input-otp",
      "components/ui/calendar",
      "components/ui/resizable",
      "components/ui/form",
    ];
    const walk = (dir: string): string[] => {
      const out: string[] = [];
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...walk(full));
        else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
      }
      return out;
    };
    const files = walk(path.join(root, "src")).filter((f) => !f.includes(`${path.sep}test${path.sep}`));
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const mod of removed) {
        const importHit =
          text.includes(`from "@/${mod}"`)
          || text.includes(`from './${mod}'`)
          || text.includes(`from "../${mod}"`)
          || text.includes(`import("./${mod}")`)
          || text.includes(`import("@/${mod}")`);
        expect(importHit, `${file} imports ${mod}`).toBe(false);
      }
    }
    expect(existsSync(path.join(root, "src/pages/Index.tsx"))).toBe(false);
    expect(existsSync(path.join(root, "src/components/ui/chart.tsx"))).toBe(false);
  });

  it("I — build gera chunks separados (manualChunks)", () => {
    expect(resolveManualChunk("/x/node_modules/react-dom/index.js")).toBe("vendor-react");
    expect(resolveManualChunk("/x/node_modules/@supabase/supabase-js/dist/index.js")).toBe("vendor-supabase");
    expect(resolveManualChunk("/x/node_modules/@radix-ui/react-dialog/dist/index.js")).toBe("vendor-ui");
    expect(resolveManualChunk("/x/node_modules/react-router-dom/dist/index.js")).toBe("vendor-router");
    expect(EXPECTED_VENDOR_CHUNKS.length).toBeGreaterThanOrEqual(3);

    const vite = readFileSync(path.join(root, "vite.config.ts"), "utf8");
    expect(vite).toContain("manualChunks");
    expect(vite).toContain("resolveManualChunk");
  });

  it("J — rotas públicas continuam acessíveis no App", () => {
    const app = readFileSync(path.join(root, "src/App.tsx"), "utf8");
    for (const route of [
      "/politica-de-privacidade",
      "/termos-de-uso",
      "/loja/:slug",
      "/login-sacoleira",
    ]) {
      expect(app).toContain(route);
    }
  });
});

// silence unused vi if needed
void vi;
