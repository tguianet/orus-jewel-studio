export const DEFAULT_PAGE_SIZE = 25;

export type PageParams = {
  page: number;
  pageSize?: number;
};

export type PageResult<T> = {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
};

export function normalizePage(page: number): number {
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.floor(page);
}

export function normalizePageSize(pageSize: number | undefined, fallback = DEFAULT_PAGE_SIZE): number {
  const n = pageSize ?? fallback;
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(100, Math.floor(n));
}

/** D — calcula total de páginas */
export function totalPages(total: number, pageSize: number): number {
  const size = normalizePageSize(pageSize);
  if (total <= 0) return 1;
  return Math.max(1, Math.ceil(total / size));
}

export function rangeForPage(page: number, pageSize?: number): { from: number; to: number; page: number; pageSize: number } {
  const size = normalizePageSize(pageSize);
  const p = normalizePage(page);
  const from = (p - 1) * size;
  return { from, to: from + size - 1, page: p, pageSize: size };
}

/** E — ao mudar filtros, volta para página 1 sem perder os filtros */
export function pageAfterFilterChange(filtersChanged: boolean, currentPage: number): number {
  return filtersChanged ? 1 : normalizePage(currentPage);
}

export function clampPage(page: number, total: number, pageSize: number): number {
  const max = totalPages(total, pageSize);
  return Math.min(normalizePage(page), max);
}

/** F — detalhe sob demanda: só carrega quando aberto */
export function shouldLoadDetail(opts: { open: boolean; id: string | null | undefined }): boolean {
  return Boolean(opts.open && opts.id);
}
