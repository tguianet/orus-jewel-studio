/** Comparação percentual segura — nunca retorna Infinity. */
export function percentChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) {
    if (current === 0) return 0;
    return null;
  }
  return Math.round(((current - previous) / Math.abs(previous)) * 10000) / 100;
}

export function formatPercentChange(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

export function averageTicket(netRevenue: number, paidOrders: number): number {
  if (!paidOrders || paidOrders <= 0) return 0;
  return Math.round((netRevenue / paidOrders) * 100) / 100;
}

export function netRevenue(opts: {
  gross: number;
  refunded: number;
  returnsFinancial: number;
}): number {
  return opts.gross - opts.refunded - opts.returnsFinancial;
}

export function estimatedMargin(opts: {
  netRevenue: number;
  quantity: number;
  costPrice: number | null | undefined;
}): { margin: number | null; pct: number | null; label: string } {
  if (opts.costPrice == null || !Number.isFinite(opts.costPrice)) {
    return { margin: null, pct: null, label: "custo não informado" };
  }
  const margin = opts.netRevenue - opts.quantity * opts.costPrice;
  const pct = opts.netRevenue === 0 ? null : Math.round((margin / opts.netRevenue) * 10000) / 100;
  return { margin, pct, label: "estimativa" };
}

export function stockStatusLabel(status: string): string {
  switch (status) {
    case "critico": return "Crítico";
    case "baixo": return "Baixo";
    case "sem_estoque": return "Sem estoque";
    case "parado": return "Parado";
    default: return "Normal";
  }
}

export function staleRecommendation(days: number, stock: number): string {
  if (stock <= 0) return "Sem estoque — avaliar reposição sob demanda.";
  if (days >= 90) return "Parado há 90+ dias — considerar promoção ou remanejamento.";
  if (days >= 60) return "Parado há 60+ dias — revisar preço/destaque.";
  if (days >= 30) return "Sem venda recente — monitorar giro.";
  return "Giro saudável no período configurado.";
}
