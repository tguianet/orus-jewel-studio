import { supabase } from "@/integrations/supabase/client";
import {
  JEWELRY_MATERIAL_LABELS,
  isJewelryMaterial,
  type JewelryMaterial,
} from "@/lib/jewelryMaterial";

/** Tamanho de lote no cliente — alinhado ao limite da RPC (100). */
export const BULK_JEWELRY_BATCH_SIZE = 75;

export type JewelryMaterialSummary = {
  total: number;
  pending: number;
  gold: number;
  silver: number;
  plated: number;
  pending_active: number;
  pending_inactive: number;
};

export type BulkSetJewelryBatchResult = {
  ok: boolean;
  jewelry_material: JewelryMaterial;
  updated_by?: string | null;
  requested: number;
  found: number;
  updated: number;
  unchanged: number;
  not_found: string[];
  failed: string[];
};

export type BulkClassifyProgress = {
  total: number;
  processed: number;
  updated: number;
  unchanged: number;
  failedIds: string[];
  currentBatch: number;
  totalBatches: number;
  done: boolean;
  errorMessage?: string;
};

export type BulkClassifyOptions = {
  productIds: string[];
  material: JewelryMaterial;
  batchSize?: number;
  onProgress?: (progress: BulkClassifyProgress) => void;
  signal?: AbortSignal;
};

export function emptyJewelryMaterialSummary(): JewelryMaterialSummary {
  return {
    total: 0,
    pending: 0,
    gold: 0,
    silver: 0,
    plated: 0,
    pending_active: 0,
    pending_inactive: 0,
  };
}

export function chunkIds(ids: string[], size: number): string[][] {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += size) {
    chunks.push(unique.slice(i, i + size));
  }
  return chunks;
}

export function confirmBulkClassifyMessage(count: number, material: JewelryMaterial): string {
  const label = JEWELRY_MATERIAL_LABELS[material];
  return `Você está prestes a classificar ${count} produto${count === 1 ? "" : "s"} como ${label}. Deseja continuar?`;
}

export async function loadJewelryMaterialSummary(): Promise<JewelryMaterialSummary> {
  const { data, error } = await supabase.rpc("admin_get_jewelry_material_summary");
  if (error) throw error;
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    total: Number(row.total ?? 0),
    pending: Number(row.pending ?? 0),
    gold: Number(row.gold ?? 0),
    silver: Number(row.silver ?? 0),
    plated: Number(row.plated ?? 0),
    pending_active: Number(row.pending_active ?? 0),
    pending_inactive: Number(row.pending_inactive ?? 0),
  };
}

export async function adminBulkSetJewelryMaterialBatch(
  productIds: string[],
  material: JewelryMaterial,
): Promise<BulkSetJewelryBatchResult> {
  if (!isJewelryMaterial(material)) {
    throw new Error("jewelry_material inválido. Use gold, silver ou plated");
  }
  if (!productIds.length) {
    throw new Error("Informe ao menos um product_id");
  }
  if (productIds.length > 100) {
    throw new Error("Máximo de 100 produtos por lote");
  }

  const { data, error } = await supabase.rpc("admin_bulk_set_jewelry_material", {
    p_product_ids: productIds,
    p_jewelry_material: material,
  });

  if (error) throw error;

  const row = (data ?? {}) as Record<string, unknown>;
  const notFoundRaw = row.not_found;
  const failedRaw = row.failed;
  return {
    ok: Boolean(row.ok),
    jewelry_material: material,
    updated_by: (row.updated_by as string | null | undefined) ?? null,
    requested: Number(row.requested ?? 0),
    found: Number(row.found ?? 0),
    updated: Number(row.updated ?? 0),
    unchanged: Number(row.unchanged ?? 0),
    not_found: Array.isArray(notFoundRaw) ? notFoundRaw.map(String) : [],
    failed: Array.isArray(failedRaw) ? failedRaw.map(String) : [],
  };
}

/**
 * Processa IDs em lotes sequenciais. Em falha de rede/RPC, marca o lote inteiro
 * como failedIds para retry seletivo.
 */
export async function runBulkJewelryClassify(
  opts: BulkClassifyOptions,
): Promise<BulkClassifyProgress> {
  const { productIds, material, onProgress, signal } = opts;
  if (!isJewelryMaterial(material)) {
    throw new Error("jewelry_material inválido. Use gold, silver ou plated");
  }

  const batchSize = Math.min(Math.max(opts.batchSize ?? BULK_JEWELRY_BATCH_SIZE, 1), 100);
  const batches = chunkIds(productIds, batchSize);
  const uniqueTotal = batches.reduce((acc, b) => acc + b.length, 0);

  let processed = 0;
  let updated = 0;
  let unchanged = 0;
  const failedIds: string[] = [];
  let lastErrorMessage: string | undefined;

  const emit = (partial: Partial<BulkClassifyProgress> & { done: boolean }): BulkClassifyProgress => {
    const progress: BulkClassifyProgress = {
      total: uniqueTotal,
      processed,
      updated,
      unchanged,
      failedIds: [...failedIds],
      currentBatch: partial.currentBatch ?? 0,
      totalBatches: batches.length,
      done: partial.done,
      errorMessage: partial.errorMessage ?? lastErrorMessage,
    };
    onProgress?.(progress);
    return progress;
  };

  if (batches.length === 0) {
    return emit({ done: true, currentBatch: 0 });
  }

  for (let i = 0; i < batches.length; i++) {
    if (signal?.aborted) {
      failedIds.push(...batches.slice(i).flat());
      lastErrorMessage = "Operação cancelada.";
      return emit({
        done: true,
        currentBatch: i,
        errorMessage: lastErrorMessage,
      });
    }

    const batch = batches[i];
    try {
      const result = await adminBulkSetJewelryMaterialBatch(batch, material);
      updated += result.updated;
      unchanged += result.unchanged;
      processed += batch.length;
      if (result.not_found.length) {
        failedIds.push(...result.not_found);
      }
      if (result.failed.length) {
        failedIds.push(...result.failed);
      }
      emit({ done: false, currentBatch: i + 1 });
    } catch (e: unknown) {
      failedIds.push(...batch);
      processed += batch.length;
      lastErrorMessage =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e && "message" in e && typeof (e as { message: unknown }).message === "string"
            ? (e as { message: string }).message
            : "Falha no lote";
      emit({ done: false, currentBatch: i + 1, errorMessage: lastErrorMessage });
    }
  }

  return emit({ done: true, currentBatch: batches.length });
}
