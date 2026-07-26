import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildStoreOgHtml,
  buildStoreWhatsAppMessage,
  buildWhatsAppShareHref,
  DEFAULT_STORE_OG_IMAGE_PATH,
  extractLojaSlugFromPath,
  isSocialCrawler,
  isUsableOgImageUrl,
  officialStoreUrl,
  resolveStoreOgImageUrl,
  storeOgTitle,
} from "@/lib/storeShare";

describe("storeShare — WhatsApp + Open Graph", () => {
  it("1 — mensagem correta sem 'garimpar'", () => {
    const msg = buildStoreWhatsAppMessage("jessica-ifangee");
    expect(msg).toBe(
      "✨ Separei joias incríveis para você!\n\n"
      + "Conheça minha loja Amada Amante e escolha suas favoritas:\n\n"
      + "https://amadaamante.app/loja/jessica-ifangee",
    );
    expect(msg.toLowerCase()).not.toContain("garimpar");
  });

  it("2 — domínio oficial amadaamante.app", () => {
    expect(officialStoreUrl("jessica-ifangee")).toBe(
      "https://amadaamante.app/loja/jessica-ifangee",
    );
    expect(officialStoreUrl("jessica-ifangee")).not.toMatch(/lovable/i);
  });

  it("3 — slug correto no href WhatsApp (encodeURIComponent)", () => {
    const href = buildWhatsAppShareHref("jessica-ifangee");
    expect(href.startsWith("https://api.whatsapp.com/send?text=")).toBe(true);
    const text = decodeURIComponent(href.split("text=")[1] || "");
    expect(text).toContain("https://amadaamante.app/loja/jessica-ifangee");
    expect(extractLojaSlugFromPath("/loja/jessica-ifangee/carrinho")).toBe(
      "jessica-ifangee",
    );
  });

  it("4 — logo padrão quando não houver logo", () => {
    const img = resolveStoreOgImageUrl({ version: "1" });
    expect(img).toBe(`https://amadaamante.app${DEFAULT_STORE_OG_IMAGE_PATH}?v=1`);
    expect(isUsableOgImageUrl("https://cdn.x/logo.svg")).toBe(false);
    expect(isUsableOgImageUrl("https://x.lovable.app/preview.png")).toBe(false);
  });

  it("5 — logo própria quando houver HTTPS não-SVG", () => {
    const img = resolveStoreOgImageUrl({
      logoUrl: "https://cdn.example.com/loja/logo.png",
      version: "abc",
    });
    expect(img).toContain("https://cdn.example.com/loja/logo.png");
    expect(img).toContain("v=abc");
  });

  it("6 — HTML OG sem depender de JavaScript (crawler)", () => {
    expect(isSocialCrawler("WhatsApp/2.0")).toBe(true);
    expect(isSocialCrawler("Mozilla/5.0")).toBe(false);
    const html = buildStoreOgHtml({
      slug: "jessica-ifangee",
      storeName: "Jessica Ifangee",
      imageUrl: "https://amadaamante.app/og/amada-amante-store.jpg?v=1",
    });
    expect(html).toContain('property="og:title" content="Amada Amante — Jessica Ifangee"');
    expect(html).toContain('property="og:url" content="https://amadaamante.app/loja/jessica-ifangee"');
    expect(html).toContain('property="og:image" content="https://amadaamante.app/og/amada-amante-store.jpg?v=1"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('property="og:type" content="website"');
    expect(html).not.toContain("<script");
    expect(storeOgTitle("Loja X")).toBe("Amada Amante — Loja X");
  });

  it("7 — cache-bust na imagem e ausência de preview Lovable no index", () => {
    const withVersion = resolveStoreOgImageUrl({
      bannerUrl: "https://cdn.example.com/banner.jpg",
      version: "2026-07-26",
    });
    expect(withVersion).toContain("v=2026-07-26");

    const index = readFileSync(join(process.cwd(), "index.html"), "utf8");
    expect(index).toContain("https://amadaamante.app/og/amada-amante-store.jpg");
    expect(index).not.toMatch(/lovable\.app-.*\.png/);

    const seller = readFileSync(
      join(process.cwd(), "src/pages/seller/SellerStore.tsx"),
      "utf8",
    );
    expect(seller).toContain("buildWhatsAppShareHref");
    expect(seller).toContain("officialStoreUrl");
    expect(seller).not.toContain("garimpar");

    const api = readFileSync(join(process.cwd(), "api/og-loja.ts"), "utf8");
    expect(api).toContain("buildStoreOgHtml");
    const mw = readFileSync(join(process.cwd(), "middleware.ts"), "utf8");
    expect(mw).toContain("isSocialCrawler");
    expect(mw).toContain("/api/og-loja");
  });
});
