import type { ReportExportRow } from "@/types/reports";

const BOM = "\uFEFF";
const SEP = ";";

/** Proteção contra CSV injection (Excel). */
export function sanitizeCsvCell(value: unknown): string {
  if (value == null) return "";
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }
  if (/[";\n\r]/.test(s)) {
    s = `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function formatCsvNumber(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatCsvDate(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR");
}

export function rowsToCsv(rows: ReportExportRow[], columns?: string[]): string {
  if (!rows.length) return BOM + "";
  const cols = columns ?? Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const header = cols.map(sanitizeCsvCell).join(SEP);
  const body = rows.map((row) => cols.map((c) => sanitizeCsvCell(row[c])).join(SEP)).join("\n");
  return `${BOM}${header}\n${body}`;
}

export function buildReportFilename(reportSlug: string, date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const slug = reportSlug.replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
  return `amada-amante-relatorio-${slug}-${y}-${m}-${d}.csv`;
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const SENSITIVE_EXPORT_KEYS = /^(password|token|checkout_token|payment_details|pix_key|access_token|refresh_token|authorization|customer_phone|customer_address|document|cpf|cnpj|ip|user_agent|hash)$/i;

export function stripSensitiveExportFields(rows: ReportExportRow[]): ReportExportRow[] {
  return rows.map((row) => {
    const out: ReportExportRow = {};
    for (const [k, v] of Object.entries(row)) {
      if (SENSITIVE_EXPORT_KEYS.test(k)) continue;
      out[k] = v;
    }
    return out;
  });
}
