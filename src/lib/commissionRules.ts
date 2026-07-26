import type { CommissionLevel } from "@/types/commerce";

export const commissionRules: { level: CommissionLevel; rate: number; label: string }[] = [
  { level: 1, rate: 0.25, label: "Nível 1" },
  { level: 2, rate: 0.03, label: "Nível 2" },
  { level: 3, rate: 0.02, label: "Nível 3" },
];
