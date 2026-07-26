import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type {
  AdminWithdrawalListItem,
  AdminWithdrawalStats,
  PaymentDetails,
  PayoutMethod,
  WithdrawalAuditItem,
  WithdrawalDetails,
  WithdrawalListItem,
  WithdrawalStatus,
  WithdrawalSummary,
} from "@/types/withdrawals";
import { isSafeReceiptUrl } from "@/lib/withdrawalMasking";

export function validateWithdrawalAmount(opts: {
  amount: number;
  available: number;
  minimum: number;
}): { ok: true } | { ok: false; message: string } {
  if (!Number.isFinite(opts.amount) || opts.amount <= 0) {
    return { ok: false as const, message: "Informe um valor válido." };
  }
  const rounded = Math.round(opts.amount * 100) / 100;
  if (Math.abs(opts.amount - rounded) > 0.001) {
    return { ok: false as const, message: "Use no máximo 2 casas decimais." };
  }
  if (rounded < opts.minimum) {
    return { ok: false as const, message: `Valor mínimo para saque: R$ ${opts.minimum.toFixed(2)}.` };
  }
  if (rounded > opts.available + 1e-9) {
    return { ok: false as const, message: "Saldo insuficiente." };
  }
  return { ok: true as const };
}

export function friendlyWithdrawalError(raw: string | null | undefined): string {
  const m = String(raw ?? "").toLowerCase();
  if (!m) return "Não foi possível concluir. Tente novamente.";
  if (m.includes("saldo insuficiente")) return "Saldo insuficiente.";
  if (m.includes("abaixo do mínimo") || m.includes("mínimo")) return "Valor abaixo do mínimo de saque.";
  if (m.includes("idempotency") || m.includes("já processad") || m.includes("idempotent")) {
    return "Solicitação já processada.";
  }
  if (m.includes("dados de recebimento") || m.includes("obrigatór") || m.includes("inválid")) {
    return "Dados de recebimento inválidos.";
  }
  if (m.includes("somente solicitações pendentes")) {
    return "Só é possível cancelar saques pendentes.";
  }
  if (m.includes("transição inválida") || m.includes("pending → paid")) {
    return "Esta ação não é permitida no status atual.";
  }
  if (m.includes("somente administradores") || m.includes("acesso negado")) {
    return "Acesso negado.";
  }
  if (m.includes("network") || m.includes("fetch")) {
    return "Erro temporário de rede. Tente novamente.";
  }
  return "Não foi possível concluir. Tente novamente.";
}

type RpcJson = Record<string, unknown>;

async function rpcJson(name: string, args: Record<string, unknown> = {}): Promise<RpcJson> {
  const { data, error } = await supabase.rpc(name as never, args as never);
  if (error) throw new Error(friendlyWithdrawalError(error.message));
  return (data ?? {}) as RpcJson;
}

export async function fetchMyWithdrawalSummary(): Promise<WithdrawalSummary> {
  const data = await rpcJson("get_my_withdrawal_summary");
  return {
    reseller_id: String(data.reseller_id ?? ""),
    available: Number(data.available ?? 0),
    blocked: Number(data.blocked ?? 0),
    minimum_withdrawal_amount: Number(data.minimum_withdrawal_amount ?? 50),
    open_requests: Number(data.open_requests ?? 0),
    payout_method: (data.payout_method as PayoutMethod | null) ?? null,
    has_payout_profile: Boolean(data.has_payout_profile),
  };
}

export async function listMyWithdrawals(page = 1, pageSize = 20): Promise<{
  items: WithdrawalListItem[];
  total: number;
}> {
  const data = await rpcJson("list_my_withdrawals", { p_page: page, p_page_size: pageSize });
  const items = (Array.isArray(data.items) ? data.items : []) as WithdrawalListItem[];
  return { items, total: Number(data.total ?? 0) };
}

export async function requestWithdrawal(input: {
  amount: number;
  paymentMethod: PayoutMethod;
  paymentDetails: PaymentDetails;
  idempotencyKey: string;
}): Promise<{ withdrawal_id: string; status: string; idempotent: boolean }> {
  const data = await rpcJson("request_withdrawal", {
    p_amount: input.amount,
    p_payment_method: input.paymentMethod,
    p_payment_details: input.paymentDetails as unknown as Json,
    p_idempotency_key: input.idempotencyKey,
  });
  return {
    withdrawal_id: String(data.withdrawal_id ?? ""),
    status: String(data.status ?? "pending"),
    idempotent: Boolean(data.idempotent),
  };
}

export async function cancelWithdrawal(id: string, reason?: string) {
  return rpcJson("cancel_withdrawal", {
    p_withdrawal_id: id,
    p_reason: reason ?? null,
  });
}

export async function approveWithdrawal(id: string) {
  return rpcJson("approve_withdrawal", { p_withdrawal_id: id });
}

export async function rejectWithdrawal(id: string, reason: string) {
  return rpcJson("reject_withdrawal", {
    p_withdrawal_id: id,
    p_reason: reason,
  });
}

export async function markWithdrawalPaid(input: {
  id: string;
  paymentReference?: string;
  receiptUrl?: string;
  idempotencyKey: string;
}) {
  if (input.receiptUrl && !isSafeReceiptUrl(input.receiptUrl)) {
    throw new Error("URL de comprovante inválida.");
  }
  return rpcJson("mark_withdrawal_paid", {
    p_withdrawal_id: input.id,
    p_payment_reference: input.paymentReference ?? null,
    p_receipt_url: input.receiptUrl ?? null,
    p_idempotency_key: input.idempotencyKey,
  });
}

export async function adminListWithdrawals(filters: {
  status?: WithdrawalStatus | "";
  resellerId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  page?: number;
  pageSize?: number;
}): Promise<{
  items: AdminWithdrawalListItem[];
  total: number;
  stats: AdminWithdrawalStats;
}> {
  const data = await rpcJson("admin_list_withdrawals", {
    p_status: filters.status || null,
    p_reseller_id: filters.resellerId || null,
    p_search: filters.search || null,
    p_date_from: filters.dateFrom || null,
    p_date_to: filters.dateTo || null,
    p_amount_min: filters.amountMin ?? null,
    p_amount_max: filters.amountMax ?? null,
    p_page: filters.page ?? 1,
    p_page_size: filters.pageSize ?? 20,
  });
  const stats = (data.stats ?? {}) as Record<string, unknown>;
  return {
    items: (Array.isArray(data.items) ? data.items : []) as AdminWithdrawalListItem[],
    total: Number(data.total ?? 0),
    stats: {
      pending_count: Number(stats.pending_count ?? 0),
      approved_count: Number(stats.approved_count ?? 0),
      paid_count_period: Number(stats.paid_count_period ?? 0),
      pending_amount: Number(stats.pending_amount ?? 0),
    },
  };
}

export async function getWithdrawalDetails(
  id: string,
  reveal = false,
): Promise<WithdrawalDetails> {
  const data = await rpcJson("get_withdrawal_details", {
    p_withdrawal_id: id,
    p_reveal_payment: reveal,
  });
  return data as unknown as WithdrawalDetails;
}

export async function getWithdrawalAudit(id: string): Promise<WithdrawalAuditItem[]> {
  const data = await rpcJson("get_withdrawal_audit", { p_withdrawal_id: id });
  return (Array.isArray(data.items) ? data.items : []) as WithdrawalAuditItem[];
}

export function newIdempotencyKey(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
