import { useEffect, useState } from "react";
import { Loader2, ExternalLink, Check, Ban } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { loadAllSellers, updateResellerStatus } from "@/lib/cloudStore";
import { toast } from "sonner";

const tone: Record<string, string> = {
  approved: "bg-success/15 text-success border-success/30",
  pending: "bg-warning/15 text-warning border-warning/30",
  blocked: "bg-destructive/15 text-destructive border-destructive/30",
};

const AdminSellers = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => loadAllSellers().then((data) => { setRows(data); setLoading(false); });
  useEffect(() => { refresh(); }, []);

  const setStatus = async (id: string, status: "approved" | "pending" | "blocked") => {
    try { await updateResellerStatus(id, status); toast.success("Status atualizado"); refresh(); }
    catch (e: any) { toast.error("Falhou", { description: e.message }); }
  };

  return (
    <AdminLayout>
      <PageHeader eyebrow="Rede de revenda" title="Sacoleiras" description="Aprove, bloqueie e acompanhe revendedoras." />
      {loading ? <div className="flex items-center justify-center h-40 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2"/> Carregando...</div> : (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-secondary/40 text-left">
              <th className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Sacoleira</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium hidden md:table-cell">Loja</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Status</th>
              <th className="px-5 py-3" />
            </tr></thead>
            <tbody className="divide-y divide-border">
              {rows.map((s: any) => {
                const store = s.seller_stores?.[0];
                return (
                <tr key={s.id} className="hover:bg-secondary/30">
                  <td className="px-5 py-4">
                    <p className="font-medium">{s.display_name}</p>
                    <p className="text-xs text-muted-foreground">{s.email}</p>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    {store ? <><p className="font-medium">{store.store_name}</p><p className="text-xs text-muted-foreground">/loja/{store.store_slug}</p></> : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${tone[s.status]}`}>{s.status}</span>
                  </td>
                  <td className="px-5 py-4 text-right space-x-1">
                    {s.status !== "approved" && <Button size="sm" variant="outline" onClick={() => setStatus(s.id, "approved")}><Check className="h-3 w-3"/> Aprovar</Button>}
                    {s.status !== "blocked" && <Button size="sm" variant="ghost" onClick={() => setStatus(s.id, "blocked")}><Ban className="h-3 w-3"/> Bloquear</Button>}
                    {store && <Link to={`/loja/${store.store_slug}`} target="_blank"><Button variant="ghost" size="icon" className="h-8 w-8"><ExternalLink className="h-4 w-4"/></Button></Link>}
                  </td>
                </tr>);
              })}
              {rows.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-muted-foreground">Nenhuma sacoleira cadastrada ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </AdminLayout>
  );
};

export default AdminSellers;
