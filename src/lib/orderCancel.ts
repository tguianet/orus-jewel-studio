import { supabase } from "@/integrations/supabase/client";

export const STOCK_CANCEL_ELIGIBLE_STATUSES = [
  "new",
  "confirmed",
  "separated",
  "shipped",
  "delivered",
] as const;

export type StockCancelEligibleStatus = (typeof STOCK_CANCEL_ELIGIBLE_STATUSES)[number];

export type CancelRestoreDetail = {
  product_id?: string;
  qty_purchased?: number;
  qty_physically_returned?: number;
  qty_cancel_restored?: number;
  qty_remaining_to_restore?: number;
  stock_before?: number | null;
  stock_after?: number | null;
  action?: string;
};

export type CancelOrderWithStockSummary = {
  order_id: string;
  units_restored: number;
  products_touched: number;
  skipped_zero: number;
  details: CancelRestoreDetail[];
};

/** Cálculo espelhando o SQL (testável sem I/O). */
export const computeRemainingToRestore = (input: {
  qtyPurchased: number;
  qtyPhysicallyReturned: number;
  qtyCancelRestored: number;
}): number =>
  Math.max(
    0,
    Number(input.qtyPurchased || 0)
      - Number(input.qtyPhysicallyReturned || 0)
      - Number(input.qtyCancelRestored || 0),
  );

export const isStockCancelEligibleStatus = (status: string): boolean =>
  (STOCK_CANCEL_ELIGIBLE_STATUSES as readonly string[]).includes(status);

/** Status que NÃO devem oferecer cancelled no Select. */
export const shouldHideCancelledInStatusSelect = (status: string): boolean =>
  isStockCancelEligibleStatus(status) || status === "paid" || status === "refunded";

export const cancelOrderWithStockRestore = async (
  orderId: string,
  reason: string,
): Promise<CancelOrderWithStockSummary> => {
  const { data, error } = await supabase.rpc("cancel_order_with_stock_restore", {
    _order_id: orderId,
    _reason: reason,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") {
    throw new Error("Resposta inválida do cancelamento com restore.");
  }
  const r = row as Record<string, unknown>;
  const rawDetails = r.details;
  const details: CancelRestoreDetail[] = Array.isArray(rawDetails)
    ? (rawDetails as CancelRestoreDetail[])
    : [];
  return {
    order_id: String(r.order_id ?? ""),
    units_restored: Number(r.units_restored ?? 0),
    products_touched: Number(r.products_touched ?? 0),
    skipped_zero: Number(r.skipped_zero ?? 0),
    details,
  };
};

export const formatStockCancelToast = (summary: CancelOrderWithStockSummary): string => {
  if (
    summary.units_restored === 0
    && summary.products_touched === 0
    && summary.details.some((d) => d.action === "already_cancelled")
  ) {
    return "Pedido já estava cancelado. Nenhuma alteração de estoque.";
  }
  return [
    `${summary.units_restored} unidade(s) restaurada(s)`,
    `${summary.products_touched} produto(s) alterado(s)`,
    `${summary.skipped_zero} produto(s) sem restante`,
  ].join(" · ");
};

/** Helper de UI: updateOrderStatus não deve receber cancelled. */
export const assertNotDirectCancelledStatus = (status: string): void => {
  if (status === "cancelled") {
    throw new Error(
      "Cancelamento direto depreciado. Use cancel_order_with_stock_restore ou cancel_paid_order.",
    );
  }
};

export const formatDetailLine = (d: CancelRestoreDetail): string => {
  if (d.action === "skipped_zero") {
    return `Produto ${(d.product_id || "").slice(0, 8)} · sem restante (devolvido ${d.qty_physically_returned ?? 0} / comprado ${d.qty_purchased ?? 0})`;
  }
  if (d.action === "restored") {
    return `Produto ${(d.product_id || "").slice(0, 8)} · +${d.qty_remaining_to_restore ?? 0} (estoque ${d.stock_before} → ${d.stock_after})`;
  }
  return d.action || "—";
};
