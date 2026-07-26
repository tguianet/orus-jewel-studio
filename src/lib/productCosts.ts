import { supabase } from "@/integrations/supabase/client";

export type AdminProductCostRow = {
  id: string;
  cost_price: number;
  wholesale_price: number;
};

/** Carrega custos via RPC admin_product_costs (somente is_admin). */
export async function loadAdminProductCosts(): Promise<Map<string, AdminProductCostRow>> {
  const { data, error } = await supabase.rpc("admin_product_costs");
  if (error) throw error;
  const map = new Map<string, AdminProductCostRow>();
  for (const row of data ?? []) {
    map.set(row.id, {
      id: row.id,
      cost_price: Number(row.cost_price ?? 0),
      wholesale_price: Number(row.wholesale_price ?? 0),
    });
  }
  return map;
}

export function mergeAdminCost(
  productId: string,
  costs: Map<string, AdminProductCostRow>,
  fallbackWholesale?: number,
): { costPrice: number | undefined; wholesalePrice: number | undefined } {
  const row = costs.get(productId);
  if (!row) {
    return {
      costPrice: undefined,
      wholesalePrice: fallbackWholesale,
    };
  }
  return {
    costPrice: Number(row.cost_price),
    wholesalePrice: Number(row.wholesale_price),
  };
}

/** Helpers de teste / auditoria de selects. */
export function selectIncludesCostPrice(selectClause: string): boolean {
  return /(^|[,\s(])cost_price([,\s)]|$)/i.test(selectClause);
}

export function isResellerSafeProductSelect(selectClause: string): boolean {
  return !selectIncludesCostPrice(selectClause) && !/\*/.test(selectClause);
}

export function isPublicSafeProductSelect(selectClause: string): boolean {
  return (
    !selectIncludesCostPrice(selectClause)
    && !/(^|[,\s(])wholesale_price([,\s)]|$)/i.test(selectClause)
    && !/\*/.test(selectClause)
  );
}
