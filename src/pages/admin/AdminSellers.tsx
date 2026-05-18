import { useEffect, useMemo, useState } from "react";
import { Loader2, ExternalLink, Check, Ban, Eye, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { loadAllSellers, updateResellerStatus } from "@/lib/cloudStore";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const tone: Record<string, string> = {
  approved: "bg-success/15 text-success border-success/30",
  pending: "bg-warning/15 text-warning border-warning/30",
  blocked: "bg-destructive/15 text-destructive border-destructive/30",
};

const AdminSellers = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewStore, setPreviewStore] = useState<{ slug: string; name: string } | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((s: any) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (!q) return true;
      const store = s.seller_stores?.[0];
      return [s.display_name, s.email, s.phone, store?.store_name, store?.store_slug]
        .filter(Boolean).some((v: string) => v.toLowerCase().includes(q));
    });
  }, [rows, search, statusFilter]);

  const refresh = () => loadAllSellers().then((data) => { setRows(data); setLoading(false); });
  useEffect(() => { refresh(); }, []);

  const setStatus = async (id: string, status: "approved" | "pending" | "blocked") => {
    try { await updateResellerStatus(id, status); toast.success("Status atualizado"); refresh(); }
    catch (e: any) { toast.error("Falhou", { description: e.message }); }
  };

  return (
    <AdminLayout>
      <PageHeader
        eyebrow="Rede de revenda"
        title="Sacoleiras"
        description="Aprove, bloqueie e acompanhe revendedoras."
        actions={
          <div className="rounded-xl border border-primary/30 bg-gradient-gold-soft px-4 py-2 text-right">
            <p className="text-[10px] uppercase tracking-[0.25em] text-primary">Cadastradas</p>
            <p className="font-display text-2xl text-foreground leading-tight">{loading ? "…" : rows.length}</p>
            <p className="text-[10px] text-muted-foreground">{rows.filter((r:any)=>r.status==="approved").length} aprovadas · {rows.filter((r:any)=>r.status==="pending").length} pendentes</p>
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email, telefone ou loja…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="approved">Aprovadas</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="blocked">Bloqueadas</SelectItem>
          </SelectContent>
        </Select>
        {(search || statusFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusFilter("all"); }}>
            <X className="h-4 w-4 mr-1" /> Limpar
          </Button>
        )}
        <div className="ml-auto text-xs text-muted-foreground">{filtered.length} resultado(s)</div>
      </div>
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
                  <td className="px-5 py-4 text-right space-x-1 whitespace-nowrap">
                    {store && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPreviewStore({ slug: store.store_slug, name: store.store_name })}
                        title="Visualizar loja sem sair"
                      >
                        <Eye className="h-3 w-3" /> Visualizar
                      </Button>
                    )}
                    {s.status !== "approved" && <Button size="sm" variant="outline" onClick={() => setStatus(s.id, "approved")}><Check className="h-3 w-3"/> Aprovar</Button>}
                    {s.status !== "blocked" && <Button size="sm" variant="ghost" onClick={() => setStatus(s.id, "blocked")}><Ban className="h-3 w-3"/> Bloquear</Button>}
                    {store && <Link to={`/loja/${store.store_slug}`} target="_blank"><Button variant="ghost" size="icon" className="h-8 w-8" title="Abrir em nova aba"><ExternalLink className="h-4 w-4"/></Button></Link>}
                  </td>
                </tr>);
              })}
              {rows.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-muted-foreground">Nenhuma sacoleira cadastrada ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      )}

      <Dialog open={!!previewStore} onOpenChange={(o) => !o && setPreviewStore(null)}>
        <DialogContent className="max-w-6xl w-[95vw] h-[88vh] p-0 gap-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-5 py-3 border-b border-border flex-row items-center justify-between space-y-0">
            <div>
              <DialogTitle className="text-base">{previewStore?.name}</DialogTitle>
              <p className="text-xs text-muted-foreground">/loja/{previewStore?.slug}</p>
            </div>
            {previewStore && (
              <Link to={`/loja/${previewStore.slug}`} target="_blank" className="mr-8">
                <Button variant="ghost" size="sm"><ExternalLink className="h-4 w-4" /> Abrir em nova aba</Button>
              </Link>
            )}
          </DialogHeader>
          {previewStore && (
            <iframe
              src={`/loja/${previewStore.slug}`}
              title={`Pré-visualização ${previewStore.name}`}
              className="flex-1 w-full bg-background"
            />
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminSellers;
