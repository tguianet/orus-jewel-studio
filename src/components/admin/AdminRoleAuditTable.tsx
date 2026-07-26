import { Loader2 } from "lucide-react";
import { adminActionLabel, formatAdminDate } from "@/lib/adminManagement";
import type { AdminRoleAuditRow } from "@/types/adminManagement";
import { ListPagination } from "@/components/system/ListPagination";

type Props = {
  items: AdminRoleAuditRow[];
  total: number;
  page: number;
  pageSize: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
};

export function AdminRoleAuditTable({
  items,
  total,
  page,
  pageSize,
  loading,
  onPageChange,
}: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-xl">Histórico de alterações</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Quem promoveu ou removeu administradores.
        </p>
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando histórico...
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma alteração registrada ainda.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Quando</th>
                <th className="px-3 py-2 font-medium">Ação</th>
                <th className="px-3 py-2 font-medium">Alvo</th>
                <th className="px-3 py-2 font-medium">Por</th>
                <th className="px-3 py-2 font-medium">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-border/70 last:border-0">
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                    {formatAdminDate(row.created_at)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        row.action === "admin_granted"
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-destructive"
                      }
                    >
                      {adminActionLabel(row.action)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{row.target_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{row.target_email || "—"}</div>
                  </td>
                  <td className="px-3 py-2">{row.performed_by_name || "—"}</td>
                  <td className="max-w-[220px] px-3 py-2 text-muted-foreground">
                    {row.reason || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ListPagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
      />
    </div>
  );
}
