import { supabase } from "@/integrations/supabase/client";

import type {
  ExpiredOrdersSummary,
  InventoryReportItem,
  ProductPerformance,
  ReportPagination,
  ResellerPerformance,
  ReturnsReportSummary,
  SalesSummary,
  SalesTimeseriesPoint,
  SellerCommissionSummary,
  WithdrawalReportSummary,
  OrderStatusSummary,
  ReportExportRow,
} from "@/types/reports";

function asNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseSummary(data: unknown): SalesSummary {
  const d = (data ?? {}) as Record<string, unknown>;
  const cmp = (d.comparison_percentages ?? {}) as Record<string, unknown>;
  return {
    gross_revenue: asNum(d.gross_revenue),
    net_revenue: asNum(d.net_revenue),
    paid_orders_count: asNum(d.paid_orders_count),
    pending_orders_count: asNum(d.pending_orders_count),
    cancelled_orders_count: asNum(d.cancelled_orders_count),
    refunded_orders_count: asNum(d.refunded_orders_count),
    average_ticket: asNum(d.average_ticket),
    refunded_amount: asNum(d.refunded_amount),
    cancelled_amount: asNum(d.cancelled_amount),
    returns_amount: asNum(d.returns_amount),
    ticket_base: String(d.ticket_base ?? "net_revenue_over_paid_orders"),
    comparison_percentages: Object.fromEntries(
      Object.entries(cmp).map(([k, v]) => [k, v == null ? null : asNum(v)]),
    ),
    previous: d.previous as SalesSummary["previous"],
    definitions: d.definitions as Record<string, string> | undefined,
  };
}

async function rpcJson(
  name:
    | "admin_get_sales_summary"
    | "admin_get_sales_timeseries"
    | "admin_get_order_status_report"
    | "admin_get_reseller_performance"
    | "admin_get_commission_report"
    | "admin_get_wallet_report"
    | "admin_get_withdrawal_report"
    | "admin_get_returns_report"
    | "admin_get_inventory_report"
    | "admin_get_top_products"
    | "admin_get_expired_orders_report"
    | "admin_export_report"
    | "seller_get_sales_summary"
    | "seller_get_sales_timeseries"
    | "seller_get_commission_summary"
    | "seller_export_my_report",
  args: Record<string, unknown>,
): Promise<unknown> {
  // Nome vem de uma união fechada de RPCs tipados; o cast estreita o overload.
  const { data, error } = await supabase.rpc(name as "admin_get_sales_summary", args as never);

  if (error) {
    const msg = String(error.message ?? "");
    if (/could not find|does not exist|schema cache/i.test(msg)) {
      throw new Error(
        "Relatórios ainda não estão disponíveis neste ambiente. Aplique a migration de relatórios no Lovable Cloud.",
      );
    }
    throw error;
  }
  return data;
}

export async function fetchAdminSalesSummary(opts: {
  start: Date;
  end: Date;
  storeId?: string | null;
  resellerId?: string | null;
}): Promise<SalesSummary> {
  const data = await rpcJson("admin_get_sales_summary", {
    p_start_date: opts.start.toISOString(),
    p_end_date: opts.end.toISOString(),
    p_store_id: opts.storeId ?? null,
    p_reseller_id: opts.resellerId ?? null,
  });
  return parseSummary(data);
}

export async function fetchAdminSalesTimeseries(opts: {
  start: Date;
  end: Date;
  granularity?: string;
  storeId?: string | null;
}): Promise<SalesTimeseriesPoint[]> {
  const data = await rpcJson("admin_get_sales_timeseries", {
    p_start_date: opts.start.toISOString(),
    p_end_date: opts.end.toISOString(),
    p_granularity: opts.granularity ?? "day",
    p_store_id: opts.storeId ?? null,
    p_reseller_id: null,
  }) as { items?: SalesTimeseriesPoint[] };
  return data.items ?? [];
}

export async function fetchAdminOrderStatus(opts: {
  start: Date;
  end: Date;
}): Promise<OrderStatusSummary[]> {
  const data = await rpcJson("admin_get_order_status_report", {
    p_start_date: opts.start.toISOString(),
    p_end_date: opts.end.toISOString(),
    p_store_id: null,
    p_reseller_id: null,
  }) as { items?: OrderStatusSummary[] };
  return data.items ?? [];
}

export async function fetchAdminResellerPerformance(opts: {
  start: Date;
  end: Date;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: string;
  search?: string;
}): Promise<{ items: ResellerPerformance[] } & ReportPagination> {
  const data = await rpcJson("admin_get_reseller_performance", {
    p_start_date: opts.start.toISOString(),
    p_end_date: opts.end.toISOString(),
    p_page: opts.page,
    p_page_size: opts.pageSize,
    p_sort_by: opts.sortBy ?? "gross_revenue",
    p_sort_direction: opts.sortDirection ?? "desc",
    p_search: opts.search || null,
  }) as {
    items?: ResellerPerformance[];
    page?: number;
    page_size?: number;
    total_count?: number;
    total_pages?: number;
  };
  return {
    items: data.items ?? [],
    page: data.page ?? opts.page,
    pageSize: data.page_size ?? opts.pageSize,
    totalCount: data.total_count ?? 0,
    totalPages: data.total_pages ?? 1,
  };
}

export async function fetchAdminCommissionReport(opts: {
  start: Date;
  end: Date;
  page?: number;
  status?: string | null;
  jewelryMaterial?: string | null;
}): Promise<{ summary: Record<string, number>; items: unknown[] } & ReportPagination> {
  const data = await rpcJson("admin_get_commission_report", {
    p_start_date: opts.start.toISOString(),
    p_end_date: opts.end.toISOString(),
    p_level: null,
    p_status: opts.status ?? null,
    p_reseller_id: null,
    p_jewelry_material: opts.jewelryMaterial ?? null,
    p_page: opts.page ?? 1,
    p_page_size: 25,
  }) as {
    summary?: Record<string, number>;
    items?: unknown[];
    page?: number;
    page_size?: number;
    total_count?: number;
    total?: number;
    total_pages?: number;
  };
  const totalCount = data.total_count ?? data.total ?? 0;
  return {
    summary: data.summary ?? {},
    items: data.items ?? [],
    page: data.page ?? 1,
    pageSize: data.page_size ?? 25,
    totalCount,
    totalPages: data.total_pages ?? Math.max(1, Math.ceil(totalCount / (data.page_size ?? 25))),
  };
}

export async function fetchAdminWalletReport(opts: {
  start: Date;
  end: Date;
  page?: number;
}): Promise<{ summary: unknown; items: unknown[] } & ReportPagination> {
  const data = await rpcJson("admin_get_wallet_report", {
    p_start_date: opts.start.toISOString(),
    p_end_date: opts.end.toISOString(),
    p_reseller_id: null,
    p_type: null,
    p_page: opts.page ?? 1,
    p_page_size: 25,
  }) as {
    summary?: unknown;
    items?: unknown[];
    page?: number;
    page_size?: number;
    total_count?: number;
    total_pages?: number;
  };
  return {
    summary: data.summary,
    items: data.items ?? [],
    page: data.page ?? 1,
    pageSize: data.page_size ?? 25,
    totalCount: data.total_count ?? 0,
    totalPages: data.total_pages ?? 1,
  };
}

export async function fetchAdminWithdrawalReport(opts: {
  start: Date;
  end: Date;
}): Promise<WithdrawalReportSummary> {
  return (await rpcJson("admin_get_withdrawal_report", {
    p_start_date: opts.start.toISOString(),
    p_end_date: opts.end.toISOString(),
    p_status: null,
    p_reseller_id: null,
  })) as WithdrawalReportSummary;
}

export async function fetchAdminReturnsReport(opts: {
  start: Date;
  end: Date;
}): Promise<ReturnsReportSummary> {
  return (await rpcJson("admin_get_returns_report", {
    p_start_date: opts.start.toISOString(),
    p_end_date: opts.end.toISOString(),
    p_reseller_id: null,
    p_product_id: null,
  })) as ReturnsReportSummary;
}

export async function fetchAdminInventoryReport(opts: {
  page: number;
  staleDays?: number;
  status?: string | null;
  search?: string;
}): Promise<{ items: InventoryReportItem[] } & ReportPagination> {
  const data = await rpcJson("admin_get_inventory_report", {
    p_stale_days: opts.staleDays ?? 30,
    p_page: opts.page,
    p_page_size: 25,
    p_status: opts.status ?? null,
    p_search: opts.search || null,
    p_sort_by: "stock",
    p_sort_direction: "asc",
  }) as {
    items?: InventoryReportItem[];
    page?: number;
    page_size?: number;
    total_count?: number;
    total_pages?: number;
  };
  return {
    items: data.items ?? [],
    page: data.page ?? opts.page,
    pageSize: data.page_size ?? 25,
    totalCount: data.total_count ?? 0,
    totalPages: data.total_pages ?? 1,
  };
}

export async function fetchAdminTopProducts(opts: {
  start: Date;
  end: Date;
  metric?: string;
  limit?: number;
}): Promise<ProductPerformance[]> {
  const data = await rpcJson("admin_get_top_products", {
    p_start_date: opts.start.toISOString(),
    p_end_date: opts.end.toISOString(),
    p_metric: opts.metric ?? "quantity",
    p_limit: opts.limit ?? 20,
    p_store_id: null,
  }) as { items?: ProductPerformance[] };
  return data.items ?? [];
}

export async function fetchAdminExpiredOrders(opts: {
  start: Date;
  end: Date;
}): Promise<ExpiredOrdersSummary> {
  return (await rpcJson("admin_get_expired_orders_report", {
    p_start_date: opts.start.toISOString(),
    p_end_date: opts.end.toISOString(),
    p_store_id: null,
    p_reseller_id: null,
  })) as ExpiredOrdersSummary;
}

export async function exportAdminReport(
  reportType: string,
  filters: { start: Date; end: Date },
): Promise<ReportExportRow[]> {
  const data = await rpcJson("admin_export_report", {
    p_report_type: reportType,
    p_filters: {
      start_date: filters.start.toISOString(),
      end_date: filters.end.toISOString(),
    },
  }) as { rows?: ReportExportRow[]; items?: ReportExportRow[] };
  return data.rows ?? data.items ?? [];
}

export async function fetchSellerSalesSummary(start: Date, end: Date): Promise<SalesSummary> {
  return parseSummary(await rpcJson("seller_get_sales_summary", {
    p_start_date: start.toISOString(),
    p_end_date: end.toISOString(),
  }));
}

export async function fetchSellerTimeseries(start: Date, end: Date): Promise<SalesTimeseriesPoint[]> {
  const data = await rpcJson("seller_get_sales_timeseries", {
    p_start_date: start.toISOString(),
    p_end_date: end.toISOString(),
    p_granularity: "day",
  }) as { items?: SalesTimeseriesPoint[] };
  return data.items ?? [];
}

export async function fetchSellerCommissionSummary(start: Date, end: Date): Promise<SellerCommissionSummary> {
  return (await rpcJson("seller_get_commission_summary", {
    p_start_date: start.toISOString(),
    p_end_date: end.toISOString(),
  })) as SellerCommissionSummary;
}

export async function exportSellerReport(
  reportType: string,
  filters: { start: Date; end: Date },
): Promise<ReportExportRow[]> {
  const data = await rpcJson("seller_export_my_report", {
    p_report_type: reportType,
    p_filters: {
      start_date: filters.start.toISOString(),
      end_date: filters.end.toISOString(),
    },
  }) as { rows?: ReportExportRow[] };
  return data.rows ?? [];
}
