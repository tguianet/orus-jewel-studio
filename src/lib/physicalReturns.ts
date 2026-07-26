import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";

export type ReturnItemCondition =
  | "perfeito_estado"
  | "embalagem_aberta"
  | "avariado"
  | "incompleto"
  | "usado"
  | "outro";

export type ReturnStockAction =
  | "retornar_ao_estoque"
  | "nao_retornar_ao_estoque"
  | "enviar_para_avaliacao";

export type ReturnResolution = "devolucao" | "troca";

export type OrderReturnPreviewItem = {
  order_item_id: string;
  product_id: string | null;
  product_name: string;
  quantity_purchased: number;
  quantity_returned: number;
  quantity_remaining: number;
  unit_price: number;
  order_status: string;
  eligible: boolean;
  eligibility_reason: string;
};

export type PhysicalReturnItemInput = {
  order_item_id: string;
  quantity: number;
  condition: ReturnItemCondition;
  stock_action: ReturnStockAction;
  resolution: ReturnResolution;
  reason?: string;
  notes?: string;
  confirm_open_package_restock?: boolean;
  replacement_product_id?: string | null;
  replacement_quantity?: number | null;
};

export type PhysicalReturnSummary = {
  return_id: string;
  order_id: string;
  items_count: number;
  units_returned: number;
  units_restocked: number;
  units_not_restocked: number;
  financial_pending_amount: number;
};

export const RETURN_CONDITION_LABELS: Record<ReturnItemCondition, string> = {
  perfeito_estado: "Perfeito estado",
  embalagem_aberta: "Embalagem aberta",
  avariado: "Avariado",
  incompleto: "Incompleto",
  usado: "Usado",
  outro: "Outro",
};

export const RETURN_STOCK_ACTION_LABELS: Record<ReturnStockAction, string> = {
  retornar_ao_estoque: "Retornar ao estoque",
  nao_retornar_ao_estoque: "Não retornar ao estoque",
  enviar_para_avaliacao: "Enviar para avaliação",
};

export const RETURN_RESOLUTION_LABELS: Record<ReturnResolution, string> = {
  devolucao: "Devolução",
  troca: "Troca",
};

export const RESTOCKABLE_CONDITIONS: ReturnItemCondition[] = [
  "perfeito_estado",
  "embalagem_aberta",
];

export const ORDER_STATUSES_ELIGIBLE_FOR_RETURN = [
  "paid",
  "separated",
  "shipped",
  "delivered",
  "refunded",
  "cancelled",
] as const;

export const isOrderStatusEligibleForReturnUi = (status: string): boolean =>
  (ORDER_STATUSES_ELIGIBLE_FOR_RETURN as readonly string[]).includes(status);

export const canRestockCondition = (condition: ReturnItemCondition): boolean =>
  RESTOCKABLE_CONDITIONS.includes(condition);

export const requiresOpenPackageConfirmation = (
  condition: ReturnItemCondition,
  stockAction: ReturnStockAction,
): boolean =>
  condition === "embalagem_aberta" && stockAction === "retornar_ao_estoque";

export const validateReturnItemDraft = (input: {
  quantity: number;
  remaining: number;
  condition: ReturnItemCondition;
  stock_action: ReturnStockAction;
  resolution: ReturnResolution;
  confirm_open_package_restock?: boolean;
  replacement_product_id?: string | null;
  replacement_quantity?: number | null;
}): string | null => {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    return "Informe a quantidade a devolver.";
  }
  if (input.quantity > input.remaining) {
    return "Quantidade acima do restante disponível.";
  }
  if (input.stock_action === "retornar_ao_estoque" && !canRestockCondition(input.condition)) {
    return "Esta condição não permite retornar ao estoque.";
  }
  if (
    requiresOpenPackageConfirmation(input.condition, input.stock_action)
    && !input.confirm_open_package_restock
  ) {
    return "Confirme a inspeção da embalagem aberta para devolver ao estoque.";
  }
  if (input.resolution === "troca") {
    if (!input.replacement_product_id) return "Selecione o produto substituto.";
    if (!input.replacement_quantity || input.replacement_quantity < 1) {
      return "Informe a quantidade do produto substituto.";
    }
  }
  return null;
};

/** Diferença financeira espelhando a fórmula do banco (testável). */
export const computeValueDifference = (
  quantity: number,
  unitPriceOriginal: number,
  replacementQuantity: number,
  unitPriceReplacement: number,
): number =>
  replacementQuantity * unitPriceReplacement - quantity * unitPriceOriginal;

export const loadOrderReturnPreview = async (
  orderId: string,
): Promise<OrderReturnPreviewItem[]> => {
  const { data, error } = await supabase.rpc("get_order_return_preview", {
    _order_id: orderId,
  });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    order_item_id: row.order_item_id,
    product_id: row.product_id,
    product_name: row.product_name,
    quantity_purchased: Number(row.quantity_purchased ?? 0),
    quantity_returned: Number(row.quantity_returned ?? 0),
    quantity_remaining: Number(row.quantity_remaining ?? 0),
    unit_price: Number(row.unit_price ?? 0),
    order_status: String(row.order_status ?? ""),
    eligible: Boolean(row.eligible),
    eligibility_reason: String(row.eligibility_reason ?? ""),
  }));
};

export const registerPhysicalReturn = async (
  orderId: string,
  items: PhysicalReturnItemInput[],
  reason: string,
  notes?: string,
): Promise<PhysicalReturnSummary> => {
  const payload = items.map((item) => ({
    order_item_id: item.order_item_id,
    quantity: item.quantity,
    condition: item.condition,
    stock_action: item.stock_action,
    resolution: item.resolution,
    reason: item.reason ?? null,
    notes: item.notes ?? null,
    confirm_open_package_restock: item.confirm_open_package_restock ?? false,
    replacement_product_id:
      item.resolution === "troca" ? item.replacement_product_id ?? null : null,
    replacement_quantity:
      item.resolution === "troca" ? item.replacement_quantity ?? null : null,
  }));

  const { data, error } = await supabase.rpc("register_physical_return", {
    _order_id: orderId,
    _items: payload,
    _reason: reason,
    _notes: notes ?? null,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") {
    throw new Error("Resposta inválida da devolução física.");
  }
  const r = row as Record<string, unknown>;
  return {
    return_id: String(r.return_id ?? ""),
    order_id: String(r.order_id ?? ""),
    items_count: Number(r.items_count ?? 0),
    units_returned: Number(r.units_returned ?? 0),
    units_restocked: Number(r.units_restocked ?? 0),
    units_not_restocked: Number(r.units_not_restocked ?? 0),
    financial_pending_amount: Number(r.financial_pending_amount ?? 0),
  };
};

export const formatPhysicalReturnToast = (summary: PhysicalReturnSummary): string => {
  const parts = [
    `${summary.units_returned} unidade(s) devolvida(s)`,
    `${summary.units_restocked} ao estoque`,
    `${summary.units_not_restocked} sem restock`,
  ];
  if (summary.financial_pending_amount !== 0) {
    parts.push(`pendência ${formatBRL(summary.financial_pending_amount)}`);
  }
  return parts.join(" · ");
};

export type ProductReturnListRow = {
  id: string;
  order_id: string;
  customer_name: string;
  reason: string;
  created_at: string;
  units_returned: number;
  units_restocked: number;
  financial_pending_amount: number;
  has_exchange: boolean;
};

export type ProductReturnsPageResult = {
  rows: ProductReturnListRow[];
  total: number;
  page: number;
  pageSize: number;
};

const mapProductReturnListRow = (raw: unknown): ProductReturnListRow => {
  const row = raw as {
    id: string;
    order_id: string;
    reason: string;
    created_at: string;
    financial_pending_amount: number;
    orders: { customer_name: string } | { customer_name: string }[] | null;
    product_return_items:
      | { quantity: number; stock_action: string; resolution: string }[]
      | null;
  };
  const orderRel = Array.isArray(row.orders) ? row.orders[0] : row.orders;
  const items = row.product_return_items ?? [];
  return {
    id: row.id,
    order_id: row.order_id,
    customer_name: orderRel?.customer_name ?? "—",
    reason: row.reason,
    created_at: row.created_at,
    units_returned: items.reduce((s, i) => s + Number(i.quantity || 0), 0),
    units_restocked: items
      .filter((i) => i.stock_action === "retornar_ao_estoque")
      .reduce((s, i) => s + Number(i.quantity || 0), 0),
    financial_pending_amount: Number(row.financial_pending_amount || 0),
    has_exchange: items.some((i) => i.resolution === "troca"),
  };
};

/** Listagem paginada; detalhes completos só via loadProductReturnDetail. */
export const loadProductReturnsPage = async (opts: {
  page: number;
  pageSize?: number;
}): Promise<ProductReturnsPageResult> => {
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 25));
  const page = Math.max(1, Math.floor(opts.page || 1));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("product_returns")
    .select(
      `
      id,
      order_id,
      reason,
      created_at,
      financial_pending_amount,
      orders!inner(customer_name),
      product_return_items(quantity, stock_action, resolution)
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw error;

  return {
    rows: (data ?? []).map(mapProductReturnListRow),
    total: count ?? 0,
    page,
    pageSize,
  };
};

export const loadProductReturns = async (): Promise<ProductReturnListRow[]> => {
  const page = await loadProductReturnsPage({ page: 1, pageSize: 25 });
  return page.rows;
};

export type ProductReturnDetail = {
  id: string;
  order_id: string;
  customer_name: string;
  reason: string;
  notes: string | null;
  created_at: string;
  financial_pending_amount: number;
  financial_pending_notes: string | null;
  items: {
    id: string;
    product_id: string;
    quantity: number;
    condition: string;
    stock_action: string;
    resolution: string;
    stock_before: number | null;
    stock_after: number | null;
    replacement_product_id: string | null;
    replacement_quantity: number | null;
    unit_price_original: number;
    unit_price_replacement: number | null;
    value_difference: number;
    reason: string | null;
    notes: string | null;
  }[];
};

export const loadProductReturnDetail = async (
  returnId: string,
): Promise<ProductReturnDetail | null> => {
  const { data, error } = await supabase
    .from("product_returns")
    .select(`
      id,
      order_id,
      reason,
      notes,
      created_at,
      financial_pending_amount,
      financial_pending_notes,
      orders!inner(customer_name),
      product_return_items(
        id,
        product_id,
        quantity,
        condition,
        stock_action,
        resolution,
        stock_before,
        stock_after,
        replacement_product_id,
        replacement_quantity,
        unit_price_original,
        unit_price_replacement,
        value_difference,
        reason,
        notes
      )
    `)
    .eq("id", returnId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as {
    id: string;
    order_id: string;
    reason: string;
    notes: string | null;
    created_at: string;
    financial_pending_amount: number;
    financial_pending_notes: string | null;
    orders: { customer_name: string } | { customer_name: string }[] | null;
    product_return_items: ProductReturnDetail["items"] | null;
  };
  const orderRel = Array.isArray(row.orders) ? row.orders[0] : row.orders;

  return {
    id: row.id,
    order_id: row.order_id,
    customer_name: orderRel?.customer_name ?? "—",
    reason: row.reason,
    notes: row.notes,
    created_at: row.created_at,
    financial_pending_amount: Number(row.financial_pending_amount || 0),
    financial_pending_notes: row.financial_pending_notes,
    items: (row.product_return_items ?? []).map((i) => ({
      ...i,
      quantity: Number(i.quantity || 0),
      unit_price_original: Number(i.unit_price_original || 0),
      unit_price_replacement:
        i.unit_price_replacement == null ? null : Number(i.unit_price_replacement),
      value_difference: Number(i.value_difference || 0),
      replacement_quantity:
        i.replacement_quantity == null ? null : Number(i.replacement_quantity),
    })),
  };
};
