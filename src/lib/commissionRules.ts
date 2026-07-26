import type { CommissionLevel } from "@/types/commerce";

/**
 * Fallback técnico interno (valores oficiais).
 * Fonte visual/produção: commission_settings / get_current_commission_rates.
 * Não usar este arquivo como fonte principal das telas de rede.
 */
export const FALLBACK_COMMISSION_RULES: {
  level: CommissionLevel;
  rate: number;
  label: string;
}[] = [
  { level: 1, rate: 0.25, label: "Nível 1" },
  { level: 2, rate: 0.03, label: "Nível 2" },
  { level: 3, rate: 0.02, label: "Nível 3" },
];

/** @deprecated Uso interno/legado apenas. Prefira getCurrentCommissionRates. */
export const commissionRules = FALLBACK_COMMISSION_RULES;
