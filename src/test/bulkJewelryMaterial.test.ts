import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  chunkIds,
  confirmBulkClassifyMessage,
  emptyJewelryMaterialSummary,
  runBulkJewelryClassify,
  BULK_JEWELRY_BATCH_SIZE,
} from "@/lib/bulkJewelryMaterial";
import {
  PRODUCT_ACTIVE_WITHOUT_TYPE_WARNING,
  isJewelryMaterial,
} from "@/lib/jewelryMaterial";

const rpcMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

describe("bulk jewelry material helpers", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it("chunkIds deduplica e respeita tamanho do lote", () => {
    const ids = Array.from({ length: 160 }, (_, i) => `id-${i % 150}`);
    const chunks = chunkIds(ids, 75);
    const flat = chunks.flat();
    expect(new Set(flat).size).toBe(150);
    expect(chunks[0]).toHaveLength(75);
    expect(chunks[1]).toHaveLength(75);
    expect(chunks.every((c) => c.length <= 75)).toBe(true);
  });

  it("mensagem de confirmação usa rótulo PT", () => {
    expect(confirmBulkClassifyMessage(3, "gold")).toBe(
      "Você está prestes a classificar 3 produtos como Ouro. Deseja continuar?",
    );
    expect(confirmBulkClassifyMessage(1, "silver")).toMatch(/1 produto como Prata/);
    expect(confirmBulkClassifyMessage(2, "plated")).toMatch(/Folheado/);
  });

  it("rejeita material inválido no runner", async () => {
    await expect(
      runBulkJewelryClassify({
        productIds: ["a"],
        material: "bronze" as "gold",
      }),
    ).rejects.toThrow(/inválido/i);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("processa em lotes e soma updated", async () => {
    const ids = Array.from({ length: 80 }, (_, i) => `p-${i}`);
    rpcMock.mockImplementation(async (_name: string, args: { p_product_ids: string[] }) => ({
      data: {
        ok: true,
        jewelry_material: "gold",
        updated_by: "admin-1",
        requested: args.p_product_ids.length,
        found: args.p_product_ids.length,
        updated: args.p_product_ids.length,
        unchanged: 0,
        not_found: [],
        failed: [],
      },
      error: null,
    }));

    const progressEvents: number[] = [];
    const result = await runBulkJewelryClassify({
      productIds: ids,
      material: "gold",
      batchSize: 50,
      onProgress: (p) => progressEvents.push(p.processed),
    });

    expect(rpcMock).toHaveBeenCalledTimes(2);
    expect(rpcMock.mock.calls[0][0]).toBe("admin_bulk_set_jewelry_material");
    expect(rpcMock.mock.calls[0][1].p_jewelry_material).toBe("gold");
    expect(result.updated).toBe(80);
    expect(result.failedIds).toHaveLength(0);
    expect(result.done).toBe(true);
    expect(progressEvents.at(-1)).toBe(80);
  });

  it("falha parcial marca lote e permite retry dos failedIds", async () => {
    rpcMock
      .mockResolvedValueOnce({
        data: {
          ok: true,
          updated: 2,
          unchanged: 0,
          requested: 2,
          found: 2,
          not_found: [],
          failed: [],
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "timeout" },
      });

    const result = await runBulkJewelryClassify({
      productIds: ["a", "b", "c", "d"],
      material: "silver",
      batchSize: 2,
    });

    expect(result.updated).toBe(2);
    expect(result.failedIds).toEqual(["c", "d"]);
    expect(result.errorMessage).toMatch(/timeout/i);
  });

  it("not_found da RPC entra em failedIds", async () => {
    rpcMock.mockResolvedValue({
      data: {
        ok: true,
        updated: 1,
        unchanged: 0,
        requested: 2,
        found: 1,
        not_found: ["missing"],
        failed: [],
      },
      error: null,
    });

    const result = await runBulkJewelryClassify({
      productIds: ["ok", "missing"],
      material: "plated",
      batchSize: 10,
    });
    expect(result.failedIds).toContain("missing");
  });

  it("impede envio com lista vazia no nível do lote via chunk", async () => {
    const result = await runBulkJewelryClassify({
      productIds: [],
      material: "gold",
    });
    expect(result.total).toBe(0);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("summary vazio e batch size padrão", () => {
    expect(emptyJewelryMaterialSummary().pending).toBe(0);
    expect(BULK_JEWELRY_BATCH_SIZE).toBeLessThanOrEqual(100);
    expect(isJewelryMaterial("gold")).toBe(true);
    expect(isJewelryMaterial("fake")).toBe(false);
    expect(PRODUCT_ACTIVE_WITHOUT_TYPE_WARNING).toMatch(/não pode ser vendido/i);
  });
});
