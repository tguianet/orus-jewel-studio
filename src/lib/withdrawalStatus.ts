import type { WithdrawalStatus } from "@/types/withdrawals";

export const WITHDRAWAL_STATUS_LABELS: Record<WithdrawalStatus, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
  paid: "Pago",
  cancelled: "Cancelado",
};

export const WITHDRAWAL_TRANSITIONS: Record<WithdrawalStatus, WithdrawalStatus[]> = {
  pending: ["approved", "rejected", "cancelled"],
  approved: ["paid", "rejected"],
  rejected: [],
  paid: [],
  cancelled: [],
};

export function canTransitionWithdrawal(
  from: WithdrawalStatus,
  to: WithdrawalStatus,
): boolean {
  return WITHDRAWAL_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canSellerCancel(status: WithdrawalStatus): boolean {
  return status === "pending";
}

export function canAdminApprove(status: WithdrawalStatus): boolean {
  return status === "pending";
}

export function canAdminReject(status: WithdrawalStatus): boolean {
  return status === "pending" || status === "approved";
}

export function canAdminPay(status: WithdrawalStatus): boolean {
  return status === "approved";
}

export function isTerminalWithdrawalStatus(status: WithdrawalStatus): boolean {
  return status === "rejected" || status === "paid" || status === "cancelled";
}

export function withdrawalStatusBadgeClass(status: WithdrawalStatus): string {
  switch (status) {
    case "pending":
      return "border-amber-500/40 text-amber-700 bg-amber-500/10";
    case "approved":
      return "border-sky-500/40 text-sky-700 bg-sky-500/10";
    case "paid":
      return "border-emerald-500/40 text-emerald-700 bg-emerald-500/10";
    case "rejected":
      return "border-destructive/40 text-destructive bg-destructive/10";
    case "cancelled":
      return "border-border text-muted-foreground bg-muted/40";
    default:
      return "border-border text-muted-foreground";
  }
}
