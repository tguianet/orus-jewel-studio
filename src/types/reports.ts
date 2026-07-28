export type ReportGranularity = "hour" | "day" | "week" | "month";

export type ReportPreset =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "current_month"
  | "previous_month"
  | "current_quarter"
  | "current_year"
  | "custom";

export type ReportDateRange = {
  start: Date;
  end: Date;
  preset: ReportPreset;
};

export type ReportSortDirection = "asc" | "desc";

export type ReportPagination = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type ReportSort = {
  sortBy: string;
  sortDirection: ReportSortDirection;
};

export type ReportFilter = {
  storeId?: string | null;
  resellerId?: string | null;
  status?: string | null;
  search?: string | null;
  metric?: string | null;
  staleDays?: number;
};

export type SalesSummary = {
  gross_revenue: number;
  net_revenue: number;
  paid_orders_count: number;
  pending_orders_count: number;
  cancelled_orders_count?: number;
  refunded_orders_count?: number;
  average_ticket: number;
  refunded_amount?: number;
  cancelled_amount?: number;
  returns_amount?: number;
  ticket_base?: string;
  comparison_percentages?: Record<string, number | null>;
  previous?: Partial<SalesSummary>;
  definitions?: Record<string, string>;
};

export type SalesTimeseriesPoint = {
  bucket: string;
  label: string;
  gross_revenue: number;
  paid_orders_count: number;
};

export type OrderStatusSummary = {
  status: string;
  orders_count: number;
  amount: number;
};

export type ResellerPerformance = {
  reseller_id: string;
  reseller_name: string;
  store_id?: string | null;
  store_name: string;
  paid_orders: number;
  gross_revenue: number;
  net_revenue: number;
  average_ticket: number;
  commission_generated: number;
  commission_available: number;
  commission_paid: number;
  returns_count: number;
  cancelled_orders: number;
  ranking?: number;
};

export type CommissionReportItem = {
  id: string;
  reseller_id: string;
  order_id: string;
  order_item_id?: string | null;
  product_id?: string | null;
  level: number;
  rate: number;
  percentage_applied?: number | null;
  base_amount?: number | null;
  amount: number;
  jewelry_material?: "gold" | "silver" | "plated" | null;
  status: string;
  created_at: string;
  commission_mode?: "legacy_order" | "per_item";
};

export type WalletReportItem = {
  id: string;
  reseller_id: string;
  type: string;
  amount: number;
  status: string;
  reason?: string | null;
  created_at: string;
  commission_id?: string | null;
  withdrawal_id?: string | null;
};

export type WithdrawalReportSummary = {
  available?: boolean;
  requested_count?: number;
  requested_amount?: number;
  pending_count?: number;
  pending_amount?: number;
  approved_count?: number;
  approved_amount?: number;
  paid_count?: number;
  paid_amount?: number;
  rejected_count?: number;
  rejected_amount?: number;
  cancelled_count?: number;
  cancelled_amount?: number;
  blocked_balance?: number;
  avg_processing_hours?: number;
  message?: string;
};

export type ReturnsReportSummary = {
  returns_count: number;
  items_count: number;
  exchange_items: number;
  return_items: number;
  stock_restored_qty: number;
  stock_discarded_qty: number;
  financial_returned_amount: number;
  exchange_not_refund: boolean;
};

export type InventoryReportItem = {
  product_id: string;
  name: string;
  code: string;
  stock: number;
  reserved_stock: number;
  available_stock: number;
  cost_price: number | null;
  wholesale_price: number;
  suggested_price: number;
  immobilized_value: number | null;
  last_sale_at: string | null;
  days_without_sale: number;
  stock_status: string;
  cost_informed: boolean;
  cost_label?: string | null;
};

export type ProductPerformance = {
  product_id: string;
  product_name: string;
  quantity_sold: number;
  gross_revenue: number;
  net_revenue: number;
  returns_qty: number;
  returns_amount: number;
  cost_price?: number | null;
  estimated_margin?: number | null;
  estimated_margin_pct?: number | null;
  current_stock?: number;
  turnover?: number | null;
};

export type ExpiredOrdersSummary = {
  expired_count: number;
  abandoned_amount: number;
  avg_hours_to_expiry: number;
  units_released: number;
  checkout_orders_base: number;
  abandonment_rate_pct: number | null;
};

export type ReportExportRow = Record<string, string | number | boolean | null | undefined>;

export type SellerCommissionSummary = {
  generated: number;
  pending: number;
  available: number;
  paid: number;
  cancelled: number;
  blocked: number;
};
