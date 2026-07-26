import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListPagination } from "@/components/system/ListPagination";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { normalizeError, showAppError } from "@/lib/errors";
import { supabase } from "@/integrations/supabase/client";
import { sbLoose } from "@/lib/supabaseLoose";
import { toast } from "sonner";

type OpErrorRow = {
  id: string;
  correlation_id: string;
  error_code: string;
  category: string;
  severity: string;
  operation?: string | null;
  route?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  occurred_at: string;
  resolved_at?: string | null;
  technical_summary?: string | null;
};

type Stats = { critical: number; error: number; warning: number; resolved: number };

const AdminOperationalErrors = () => {
  const [items, setItems] = useState<OpErrorRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ critical: 0, error: 0, warning: 0, resolved: 0 });
  const [severity, setSeverity] = useState("");
  const [category, setCategory] = useState("");
  const [code, setCode] = useState("");
  const [resolved, setResolved] = useState<"all" | "open" | "done">("open");
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await sbLoose.rpc("admin_list_operational_errors", {
        p_severity: severity || null,
        p_category: category || null,
        p_error_code: code || null,
        p_route: null,
        p_operation: null,
        p_resolved: resolved === "all" ? null : resolved === "done",
        p_date_from: null,
        p_date_to: null,
        p_page: page,
        p_page_size: DEFAULT_PAGE_SIZE,
      });
      if (error) throw error;
      const payload = (data ?? {}) as {
        items?: OpErrorRow[];
        total?: number;
        stats?: Stats;
      };
      setItems(payload.items ?? []);
      setTotal(Number(payload.total ?? 0));
      setStats(payload.stats ?? { critical: 0, error: 0, warning: 0, resolved: 0 });
    } catch (e) {
      showAppError(normalizeError(e, { operation: "admin_list_operational_errors" }));
    } finally {
      setLoading(false);
    }
  }, [category, code, page, resolved, severity]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = async (id: string) => {
    try {
      const { data, error } = await sbLoose.rpc("admin_get_operational_error", {
        p_error_id: id,
      });
      if (error) throw error;
      setDetail((data ?? {}) as Record<string, unknown>);
    } catch (e) {
      showAppError(normalizeError(e, { operation: "admin_get_operational_error" }));
    }
  };

  const resolve = async (id: string) => {
    const notes = window.prompt("Notas de resolução (opcional):") ?? "";
    try {
      const { error } = await sbLoose.rpc("admin_resolve_operational_error", {
        p_error_id: id,
        p_resolution_notes: notes,
      });
      if (error) throw error;
      toast.success("Marcado como resolvido");
      setDetail(null);
      await load();
    } catch (e) {
      showAppError(normalizeError(e, { operation: "admin_resolve_operational_error" }));
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        eyebrow="Observabilidade"
        title="Erros operacionais"
        description="Diagnóstico sanitizado. Sem PII, tokens ou payloads brutos."
      />

      <div className="grid gap-4 sm:grid-cols-4 mb-6">
        <StatCard label="Críticos abertos" value={String(stats.critical)} icon={AlertTriangle} />
        <StatCard label="Erros abertos" value={String(stats.error)} icon={AlertTriangle} />
        <StatCard label="Avisos abertos" value={String(stats.warning)} icon={AlertTriangle} />
        <StatCard label="Resolvidos" value={String(stats.resolved)} icon={AlertTriangle} />
      </div>

      <div className="grid gap-3 sm:grid-cols-5 mb-4">
        <div>
          <Label>Severidade</Label>
          <select className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="">Todas</option>
            <option value="critical">critical</option>
            <option value="error">error</option>
            <option value="warning">warning</option>
            <option value="info">info</option>
          </select>
        </div>
        <div>
          <Label>Categoria</Label>
          <Input className="mt-1.5" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="checkout" />
        </div>
        <div>
          <Label>Código</Label>
          <Input className="mt-1.5" value={code} onChange={(e) => setCode(e.target.value)} placeholder="CHECKOUT_FAILED" />
        </div>
        <div>
          <Label>Status</Label>
          <select className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={resolved} onChange={(e) => setResolved(e.target.value as typeof resolved)}>
            <option value="open">Abertos</option>
            <option value="done">Resolvidos</option>
            <option value="all">Todos</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button variant="gold" className="w-full" onClick={() => { setPage(1); void load(); }}>
            Filtrar
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="px-5 py-10 text-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin inline mr-2" />Carregando…
          </div>
        ) : items.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">Nenhum erro registrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Quando</th>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Severidade</th>
                  <th className="px-4 py-3">Operação</th>
                  <th className="px-4 py-3">Correlação</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 text-xs">{new Date(row.occurred_at).toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.error_code}</td>
                    <td className="px-4 py-3">{row.severity}</td>
                    <td className="px-4 py-3 text-xs">{row.operation || row.route || "—"}</td>
                    <td className="px-4 py-3 font-mono text-[10px]">{row.correlation_id}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => void openDetail(row.id)}>Detalhe</Button>
                      {!row.resolved_at && (
                        <Button size="sm" variant="ghost" onClick={() => void resolve(row.id)}>Resolver</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <ListPagination page={page} total={total} pageSize={DEFAULT_PAGE_SIZE} onPageChange={setPage} disabled={loading} />
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4">
          <div className="max-w-lg w-full rounded-2xl border border-border bg-card p-6 space-y-3 max-h-[80vh] overflow-y-auto">
            <h2 className="font-display text-xl">Detalhe sanitizado</h2>
            <pre className="text-xs whitespace-pre-wrap break-all bg-muted/40 p-3 rounded">
              {JSON.stringify(detail, null, 2)}
            </pre>
            <Button variant="outline" onClick={() => setDetail(null)}>Fechar</Button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminOperationalErrors;
