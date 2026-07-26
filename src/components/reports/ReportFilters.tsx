import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  search?: string;
  onSearchChange?: (v: string) => void;
  status?: string;
  onStatusChange?: (v: string) => void;
  statusOptions?: { value: string; label: string }[];
  extra?: ReactNode;
};

export function ReportFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  statusOptions,
  extra,
}: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      {onSearchChange && (
        <div className="space-y-1.5 min-w-[200px]">
          <Label htmlFor="report-search">Busca</Label>
          <Input
            id="report-search"
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar…"
          />
        </div>
      )}
      {onStatusChange && statusOptions && (
        <div className="space-y-1.5">
          <Label htmlFor="report-status">Status</Label>
          <select
            id="report-status"
            className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={status ?? ""}
            onChange={(e) => onStatusChange(e.target.value)}
          >
            <option value="">Todos</option>
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      )}
      {extra}
    </div>
  );
}
