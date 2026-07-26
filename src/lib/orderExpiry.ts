export const CANONICAL_EXPIRATION_REASON = "abandoned_checkout_expired" as const;

export const DEFAULT_RESERVE_MINUTES = 60;

export const EXPIRATION_REASON_LABELS: Record<string, string> = {
  abandoned_checkout_expired: "Reserva de checkout expirada",
};

export const isExpiredOrder = (order: {
  status?: string | null;
  expired_at?: string | null;
  expiration_reason?: string | null;
}): boolean =>
  Boolean(order.expired_at) || Boolean(order.expiration_reason);

export const displayOrderStatusLabel = (order: {
  status: string;
  expired_at?: string | null;
  expiration_reason?: string | null;
}, statusLabels: Record<string, string>): string => {
  if (isExpiredOrder(order) && order.status === "cancelled") {
    return "Expirado";
  }
  return statusLabels[order.status] || order.status;
};

export const displayOrderStatusColor = (order: {
  status: string;
  expired_at?: string | null;
}, statusColors: Record<string, string>): string => {
  if (isExpiredOrder(order) && order.status === "cancelled") {
    return "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400";
  }
  return statusColors[order.status] || "border-border text-muted-foreground";
};

export const translateExpirationReason = (reason: string | null | undefined): string => {
  if (!reason) return "—";
  return EXPIRATION_REASON_LABELS[reason] || reason;
};

/** Regra de exibição (não é a fonte de verdade — o banco é). */
export const isReservationExpiredByClock = (
  expiresAt: string | null | undefined,
  nowMs: number = Date.now(),
): boolean => {
  if (!expiresAt) return false;
  const t = new Date(expiresAt).getTime();
  if (Number.isNaN(t)) return false;
  return t <= nowMs;
};

export const formatExpiresAt = (expiresAt: string | null | undefined): string => {
  if (!expiresAt) return "—";
  try {
    return new Date(expiresAt).toLocaleString("pt-BR");
  } catch {
    return expiresAt;
  }
};

export const remainingSecondsUntil = (
  expiresAt: string | null | undefined,
  nowMs: number = Date.now(),
): number | null => {
  if (!expiresAt) return null;
  const t = new Date(expiresAt).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((t - nowMs) / 1000));
};

export const formatCountdown = (totalSeconds: number): string => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

export const isTerminalCheckoutTokenError = (message: string): boolean => {
  const m = message.toLowerCase();
  return (
    m.includes("checkout_token já utilizado")
    || m.includes("reserva expirada")
    || m.includes("gere um novo token")
  );
};

/** Espelha elegibilidade do SQL para testes. */
export const canExpireOrderRow = (row: {
  status: string;
  expires_at: string | null;
  expired_at: string | null;
  nowIso: string;
}): boolean => {
  if (!["new", "confirmed"].includes(row.status)) return false;
  if (!row.expires_at || row.expired_at) return false;
  return new Date(row.expires_at).getTime() <= new Date(row.nowIso).getTime();
};
