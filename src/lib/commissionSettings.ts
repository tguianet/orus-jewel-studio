import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { CommissionLevel } from "@/types/commerce";
import {
  JEWELRY_MATERIALS,
  type JewelryMaterial,
  isJewelryMaterial,
} from "@/lib/jewelryMaterial";

export type CommissionSettings = Tables<"commission_settings">;

export type CurrentCommissionRates = {
  level_1_rate: number;
  level_2_rate: number;
  level_3_rate: number;
};

export type CommissionRule = {
  level: CommissionLevel;
  rate: number;
  label: string;
};

export type MlmCommissionRateRow = {
  jewelry_material: JewelryMaterial;
  level: 1 | 2 | 3;
  percentage: number;
  updated_at?: string;
  updated_by?: string | null;
};

/** Matriz 3×3 editável na UI (percentuais 0–100). */
export type MlmCommissionMatrixPercents = Record<
  JewelryMaterial,
  { 1: string; 2: string; 3: string }
>;

export const emptyMatrixPercents = (): MlmCommissionMatrixPercents => ({
  gold: { 1: "", 2: "", 3: "" },
  silver: { 1: "", 2: "", 3: "" },
  plated: { 1: "", 2: "", 3: "" },
});

export const settingsToRules = (settings: Pick<
  CurrentCommissionRates,
  "level_1_rate" | "level_2_rate" | "level_3_rate"
>): CommissionRule[] => [
  { level: 1, rate: Number(settings.level_1_rate), label: "Nível 1" },
  { level: 2, rate: Number(settings.level_2_rate), label: "Nível 2" },
  { level: 3, rate: Number(settings.level_3_rate), label: "Nível 3" },
];

/** Carrega configuração completa (admin SELECT). Propaga erro — sem fallback silencioso. */
export const loadCommissionSettings = async (): Promise<CommissionSettings> => {
  const { data, error } = await supabase
    .from("commission_settings")
    .select("*")
    .eq("id", "00000000-0000-4000-8000-000000000001")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Configuração de comissões não encontrada no banco.");
  return data;
};

/**
 * Taxas vigentes para qualquer authenticated via RPC segura.
 * Não usa SELECT em commission_settings. Propaga erro (sem fallback visual).
 */
export const getCurrentCommissionRates = async (): Promise<CurrentCommissionRates> => {
  const { data, error } = await supabase.rpc("get_current_commission_rates");

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("Resposta inválida ao carregar taxas de comissão.");

  return {
    level_1_rate: Number(row.level_1_rate),
    level_2_rate: Number(row.level_2_rate),
    level_3_rate: Number(row.level_3_rate),
  };
};

/** @deprecated Prefer updateMlmCommissionRates (matriz por material). */
export const updateCommissionSettings = async (rates: {
  level1: number;
  level2: number;
  level3: number;
}): Promise<CommissionSettings> => {
  const { data, error } = await supabase.rpc("update_commission_settings", {
    p_level_1_rate: rates.level1,
    p_level_2_rate: rates.level2,
    p_level_3_rate: rates.level3,
  });

  if (error) throw error;
  if (!data) throw new Error("Resposta inválida ao salvar comissões.");
  return data;
};

/** Classifica falhas da RPC de comissões em AppError com diagnóstico sanitizado. */
const toCommissionAppError = (
  raw: unknown,
  rpcName: string,
  operation: string,
): AppError => {
  const err = (raw ?? {}) as {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  };
  const code = String(err.code ?? "");
  const message = String(err.message ?? "");

  // Migration ausente: função inexistente / schema cache desatualizado
  const missingModule =
    code === "PGRST202" ||
    code === "42883" ||
    code === "42P01" ||
    /could not find the function|does not exist|schema cache/i.test(message);

  // Permissão / RLS
  const denied =
    code === "42501" ||
    code === "PGRST301" ||
    /permission denied|apenas administradores|não autenticado/i.test(message);

  const appCode = missingModule
    ? "MLM_COMMISSIONS_MODULE_MISSING"
    : denied
      ? "AUTH_ACCESS_DENIED"
      : "MLM_COMMISSIONS_LOAD_FAILED";

  return new AppError({
    code: appCode,
    technicalMessage: message || "Falha desconhecida na RPC de comissões.",
    originalError: raw,
    operation,
    entityType: "mlm_commission_rates",
    metadata: {
      rpc_name: rpcName,
      pg_code: err.code ?? null,
      pg_details: err.details ?? null,
      pg_hint: err.hint ?? null,
    },
  });
};

export const loadMlmCommissionRates = async (): Promise<MlmCommissionRateRow[]> => {
  const { data, error } = await supabase.rpc("get_mlm_commission_rates");
  if (error) {
    throw toCommissionAppError(error, "get_mlm_commission_rates", "admin.commissions.load");
  }
  const rows = Array.isArray(data) ? data : [];
  if (rows.length === 0) {
    throw new AppError({
      code: "MLM_COMMISSIONS_MODULE_MISSING",
      technicalMessage: "get_mlm_commission_rates retornou 0 linhas.",
      operation: "admin.commissions.load",
      entityType: "mlm_commission_rates",
      metadata: { rpc_name: "get_mlm_commission_rates" },
    });
  }
  return rows.map((r) => {
    const material = r.jewelry_material;
    if (!isJewelryMaterial(material)) {
      throw new Error(`Material inválido na matriz: ${String(material)}`);
    }
    const level = Number(r.level);
    if (level !== 1 && level !== 2 && level !== 3) {
      throw new Error(`Nível inválido na matriz: ${String(r.level)}`);
    }
    return {
      jewelry_material: material,
      level,
      percentage: Number(r.percentage),
      updated_at: r.updated_at ?? undefined,
      updated_by: r.updated_by ?? null,
    };
  });
};

export const ratesToMatrixPercents = (rows: MlmCommissionRateRow[]): MlmCommissionMatrixPercents => {
  const matrix = emptyMatrixPercents();
  for (const row of rows) {
    matrix[row.jewelry_material][row.level] = String(rateToPercent(row.percentage));
  }
  return matrix;
};

export const updateMlmCommissionRates = async (
  matrix: MlmCommissionMatrixPercents,
): Promise<MlmCommissionRateRow[]> => {
  const payload: { jewelry_material: JewelryMaterial; level: number; percentage: number }[] = [];
  for (const material of JEWELRY_MATERIALS) {
    for (const level of [1, 2, 3] as const) {
      const raw = matrix[material][level];
      const percent = parsePercentInput(raw);
      if (!Number.isFinite(percent)) {
        throw new Error("Informe percentuais válidos (sem campos vazios).");
      }
      payload.push({
        jewelry_material: material,
        level,
        percentage: percentToRate(percent),
      });
    }
  }

  const { data, error } = await supabase.rpc("update_mlm_commission_rates", {
    p_rates: payload,
  });
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  return rows.map((r: { jewelry_material: string; level: number; percentage: number }) => ({
    jewelry_material: r.jewelry_material as JewelryMaterial,
    level: Number(r.level) as 1 | 2 | 3,
    percentage: Number(r.percentage),
  }));
};

export const countProductsPendingJewelryMaterial = async (): Promise<number> => {
  const { data, error } = await supabase.rpc("admin_count_products_pending_jewelry_material");
  if (error) throw error;
  return Number(data ?? 0);
};

export const percentToRate = (percent: number) => percent / 100;
export const rateToPercent = (rate: number) => rate * 100;

export const parsePercentInput = (raw: string): number => {
  const normalized = raw.trim().replace(",", ".");
  if (normalized === "") return Number.NaN;
  return Number(normalized);
};

/** Formata fração (0–1) como percentual pt-BR, preservando decimais úteis. */
export const formatRateAsPercent = (rate: number): string => {
  const percent = rate * 100;
  if (!Number.isFinite(percent)) return "—";
  return `${percent.toLocaleString("pt-BR", {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
  })}%`;
};

export const validateCommissionPercents = (
  p1: number,
  p2: number,
  p3: number,
): string | null => {
  const values = [p1, p2, p3];
  if (values.some((v) => !Number.isFinite(v))) {
    return "Informe percentuais válidos (sem campos vazios).";
  }
  if (values.some((v) => v < 0)) {
    return "Nenhum percentual pode ser negativo.";
  }
  if (values.some((v) => v > 100)) {
    return "Nenhum percentual pode ser maior que 100.";
  }
  if (p1 + p2 + p3 > 100) {
    return "A soma dos níveis não pode ultrapassar 100%.";
  }
  return null;
};

export const validateMlmMatrixPercents = (
  matrix: MlmCommissionMatrixPercents,
): string | null => {
  for (const material of JEWELRY_MATERIALS) {
    const p1 = parsePercentInput(matrix[material][1]);
    const p2 = parsePercentInput(matrix[material][2]);
    const p3 = parsePercentInput(matrix[material][3]);
    const err = validateCommissionPercents(p1, p2, p3);
    if (err) {
      return `${material === "gold" ? "Ouro" : material === "silver" ? "Prata" : "Folheado"}: ${err}`;
    }
  }
  return null;
};
