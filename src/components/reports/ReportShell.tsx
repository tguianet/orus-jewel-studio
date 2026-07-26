import { ReactNode } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { ReportTabs } from "./ReportTabs";
import { ADMIN_REPORT_TABS } from "./reportTabConfig";
import { ReportDateRangePicker } from "./ReportDateRangePicker";
import { ReportPrintButton } from "./ReportPrintButton";
import type { ReportDateRange } from "@/types/reports";

type Props = {
  title: string;
  description: string;
  range: ReportDateRange;
  onRangeChange: (r: ReportDateRange) => void;
  actions?: ReactNode;
  children: ReactNode;
};

export function ReportShell({ title, description, range, onRangeChange, actions, children }: Props) {
  return (
    <AdminLayout>
      <div className="print:hidden">
        <PageHeader
          eyebrow="Relatórios"
          title={title}
          description={description}
          actions={
            <div className="flex flex-wrap gap-2">
              {actions}
              <ReportPrintButton />
            </div>
          }
        />
        <ReportTabs tabs={ADMIN_REPORT_TABS} />
        <div className="mb-6">
          <ReportDateRangePicker value={range} onChange={onRangeChange} />
        </div>
      </div>
      <div className="hidden print:block mb-4 text-sm">
        <p className="font-display text-2xl">Amada Amante</p>
        <p>{title}</p>
        <p>
          Período: {range.start.toLocaleDateString("pt-BR")} —{" "}
          {new Date(range.end.getTime() - 1).toLocaleDateString("pt-BR")}
        </p>
        <p>Gerado em: {new Date().toLocaleString("pt-BR")}</p>
      </div>
      {children}
    </AdminLayout>
  );
}
