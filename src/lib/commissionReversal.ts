import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";

export type CommissionReversalSummary = {
  order_id: string;
  commissions_reversed: number;
  wallet_reversals_created: number;
  total_reversed: number;
  already_reversed: boolean;
};

export type OrderCommissionPreview = {
  count: number;
  totalAmount: number;
};

/** Espelha a decisão financeira do SQL (testável sem I/O). */
export type ReversalDecision =
  | "credit_cancelled"
  | "paid_credit_preserved_and_debit_created"
  | "commission_cancelled_without_wallet"
  | "already_reversed";

export const decideReversalAction = (input: {
  alreadyHasReversal: boolean;
  walletFound: boolean;
  walletStatus: string | null;
  commissionStatus: string;
}): ReversalDecision => {
  if (input.alreadyHasReversal) return "already_reversed";
  if (input.walletFound && (input.walletStatus === "pending" || input.walletStatus === "available")) {
    return "credit_cancelled";
  }
  if (input.walletFound && input.walletStatus === "paid") {
    return "paid_credit_preserved_and_debit_created";
  }
  if (!input.walletFound && input.commissionStatus === "paid") {
    return "paid_credit_preserved_and_debit_created";
  }
  return "commission_cancelled_without_wallet";
};

export const shouldCreateAvailableDebit = (action: ReversalDecision): boolean =>
  action === "paid_credit_preserved_and_debit_created";

const parseSummary = (data: unknown): CommissionReversalSummary => {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") {
    throw new Error("Resposta inválida do estorno.");
  }
  const r = row as Record<string, unknown>;
  return {
    order_id: String(r.order_id ?? ""),
    commissions_reversed: Number(r.commissions_reversed ?? 0),
    wallet_reversals_created: Number(r.wallet_reversals_created ?? 0),
    total_reversed: Number(r.total_reversed ?? 0),
    already_reversed: Boolean(r.already_reversed),
  };
};

/** Preview só leitura: soma amounts já gravados em commissions (não recalcula taxa). */
export const loadOrderCommissionPreview = async (
  orderId: string,
): Promise<OrderCommissionPreview> => {
  const { data, error } = await supabase
    .from("commissions")
    .select("amount")
    .eq("order_id", orderId);
  if (error) throw error;
  const rows = data ?? [];
  return {
    count: rows.length,
    totalAmount: rows.reduce((s, c) => s + Number(c.amount || 0), 0),
  };
};

export const cancelPaidOrder = async (
  orderId: string,
  reason: string,
): Promise<CommissionReversalSummary> => {
  const { data, error } = await supabase.rpc("cancel_paid_order", {
    _order_id: orderId,
    _reason: reason,
  });
  if (error) throw error;
  return parseSummary(data);
};

export const refundPaidOrder = async (
  orderId: string,
  reason: string,
): Promise<CommissionReversalSummary> => {
  const { data, error } = await supabase.rpc("refund_paid_order", {
    _order_id: orderId,
    _reason: reason,
  });
  if (error) throw error;
  return parseSummary(data);
};

export const formatReversalToast = (summary: CommissionReversalSummary): string => {
  if (summary.already_reversed && summary.wallet_reversals_created === 0) {
    return "Operação já realizada anteriormente. Nenhum novo débito criado.";
  }

  const parts = [
    `${summary.commissions_reversed} comissão(ões) cancelada(s)`,
    `${summary.wallet_reversals_created} débito(s) de compensação criado(s)`,
  ];

  if (summary.wallet_reversals_created > 0 && summary.total_reversed > 0) {
    parts.push(`total a compensar ${formatBRL(summary.total_reversed)}`);
  } else {
    parts.push("sem débito disponível (créditos pending/available apenas cancelados)");
  }

  return parts.join(" · ");
};

/** Helpers testáveis (sem I/O) */
export const toReversalAmount = (commissionAmount: number): number =>
  -Math.abs(Number(commissionAmount) || 0);

export const isSafeUnpaidCancelStatus = (status: string): boolean =>
  !["paid", "refunded"].includes(status);

/** Saldo available da view após uma ação (modelo simplificado de 1 lançamento). */
export const viewAvailableAfter = (input: {
  originalWalletStatus: "pending" | "available" | "paid" | null;
  originalAmount: number;
  action: ReversalDecision;
}): number => {
  if (input.action === "paid_credit_preserved_and_debit_created") {
    return toReversalAmount(input.originalAmount);
  }
  // credit_cancelled / without_wallet / already_reversed: crédito sai da view; sem débito novo
  return 0;
};
