import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { CommissionLevel } from "@/types/commerce";

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

export const percentToRate = (percent: number) => percent / 100;
export const rateToPercent = (rate: number) => rate * 100;

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
