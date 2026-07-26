import { Button } from "@/components/ui/button";
import {
  buildReportFilename,
  downloadCsv,
  rowsToCsv,
  stripSensitiveExportFields,
} from "@/lib/reports/csvExport";
import type { ReportExportRow } from "@/types/reports";

type Props = {
  slug: string;
  rows: ReportExportRow[];
  disabled?: boolean;
  label?: string;
};

export function ExportCsvButton({ slug, rows, disabled, label = "Exportar CSV" }: Props) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="print:hidden"
      disabled={disabled || rows.length === 0}
      onClick={() => {
        const safe = stripSensitiveExportFields(rows);
        downloadCsv(buildReportFilename(slug), rowsToCsv(safe));
      }}
    >
      {label}
    </Button>
  );
}
