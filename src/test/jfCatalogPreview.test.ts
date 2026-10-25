import { describe, expect, it, vi } from "vitest";
import { loadJfCatalogPreview, mapJfPreviewProduct, type JfCatalogRow } from "../lib/jfCatalogPreview";

const config = { enabled: true, publicKey: "sb_publishable_test" };
const row: JfCatalogRow = {
  id: "jf-1", name: "Anel", sku: "A1", stock: 999,
  product_images: [{ url: "second.jpg", sort_order: 2 }, { url: "first.jpg", sort_order: 0 }],
  product_variants: [
    { id: "v1", size: "18", stock: 2, active: true },
    { id: "v2", size: "20", stock: 3, active: true },
    { id: "v3", size: "22", stock: 100, active: false },
  ],
};

describe("JF preview isolation", () => {
  it("makes no requests when disabled or given a privileged key", async () => {
    const request = vi.fn();
    await expect(loadJfCatalogPreview({ ...config, enabled: false }, 0, request)).rejects.toThrow("desativada");
    await expect(loadJfCatalogPreview({ ...config, publicKey: "sb_secret_bad" }, 0, request)).rejects.toThrow("pública");
    const token = `header.${btoa(JSON.stringify({ role: "service_role" }))}.signature`;
    await expect(loadJfCatalogPreview({ ...config, publicKey: token }, 0, request)).rejects.toThrow("pública");
    expect(request).not.toHaveBeenCalled();
  });
  it("uses only anonymous GET, no cookies or Orus session, and restricts the catalog to JF", async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify([row])));
    const result = await loadJfCatalogPreview(config, 1, request);
    const [url, options] = request.mock.calls[0];
    expect(url.origin).toBe("https://wbvnvmyhqshzacgjexec.supabase.co");
    expect(url.pathname).toBe("/rest/v1/products");
    expect(url.searchParams.get("catalog_origin")).toBe("eq.jf_metais");
    expect(url.searchParams.get("offset")).toBe("100");
    expect(options).toMatchObject({ method: "GET", credentials: "omit", cache: "no-store" });
    expect(options.headers).toEqual({ apikey: config.publicKey, Accept: "application/json" });
    expect(options.body).toBeUndefined();
    expect(result.products[0].sourceId).toBe("jf-1");
  });
  it("uses active variation stock instead of adding the parent stock twice", () => {
    expect(mapJfPreviewProduct(row)).toMatchObject({ stock: 5, image: "first.jpg" });
    expect(mapJfPreviewProduct({ ...row, stock: 4, product_variants: [] }).stock).toBe(4);
    expect(row.product_images[0].url).toBe("second.jpg");
  });
  it("fails closed on permissions errors rather than falling back to another database", async () => {
    const request = vi.fn().mockResolvedValue(new Response("denied", { status: 403 }));
    await expect(loadJfCatalogPreview(config, 0, request)).rejects.toThrow("403");
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("paginates without silently presenting an incomplete page as the entire catalog", async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify(Array.from({ length: 101 }, (_, i) => ({ ...row, id: `p${i}` })))));
    const result = await loadJfCatalogPreview(config, 0, request);
    expect(result.products).toHaveLength(100);
    expect(result.hasMore).toBe(true);
  });
});
