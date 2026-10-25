import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { JfCatalogPreview } from "../components/admin/JfCatalogPreview";
import { loadJfCatalogPreview } from "../lib/jfCatalogPreview";

vi.mock("../lib/jfCatalogPreview", () => ({ loadJfCatalogPreview: vi.fn() }));
afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.clearAllMocks(); });

it("does not query JF or offer purchases while disabled", () => {
  vi.stubEnv("VITE_JF_CATALOG_PREVIEW_ENABLED", "false");
  render(<JfCatalogPreview />);
  expect(screen.getByText("Prévia desativada neste ambiente.")).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(loadJfCatalogPreview).not.toHaveBeenCalled();
});

it("only queries on click and displays a consultation without adding products to the shop", async () => {
  vi.stubEnv("VITE_JF_CATALOG_PREVIEW_ENABLED", "true");
  vi.stubEnv("VITE_JF_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  vi.mocked(loadJfCatalogPreview).mockResolvedValue({ products: [{ sourceId: "jf1", name: "Anel JF", sku: "A1", stock: 5, image: null, variants: [] }], hasMore: false });
  render(<JfCatalogPreview />);
  expect(loadJfCatalogPreview).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Consultar catálogo JF" }));
  expect(await screen.findByText("Anel JF")).toBeInTheDocument();
  expect(screen.getByText("Estoque consultado: 5")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /comprar|adicionar/i })).not.toBeInTheDocument();
});
