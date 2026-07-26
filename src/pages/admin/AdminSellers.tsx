import { useEffect, useMemo, useState } from "react";
import { Loader2, ExternalLink, Check, Ban, Eye, Search, X, Copy, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  AdminSellerRow,
  adminRegenerateReferralCode,
  adminSetResellerSponsor,
  loadAllSellers,
  updateResellerStatus,
} from "@/lib/cloudStore";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const tone: Record<string, string> = {
  approved: "bg-success/15 text-success border-success/30",
  pending: "bg-warning/15 text-warning border-warning/30",
  blocked: "bg-destructive/15 text-destructive border-destructive/30",
};

const AdminSellers = () => {
  const [rows, setRows] = useState<AdminSellerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewStore, setPreviewStore] = useState<{ slug: string; name: string } | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [regenTarget, setRegenTarget] = useState<AdminSellerRow | null>(null);
  const [sponsorTarget, setSponsorTarget] = useState<AdminSellerRow | null>(null);
  const [sponsorId, setSponsorId] = useState("");
  const [sponsorReason, setSponsorReason] = useState("");
  const [busyAction, setBusyAction] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (!q) return true;
      const store = s.seller_stores?.[0];
      return [s.display_name, s.email, s.phone, store?.store_name, store?.store_slug, s.referral_code, s.sponsor_name]
        .filter((v): v is string => Boolean(v))
        .some((v) => v.toLowerCase().includes(q));
    });
  }, [rows, search, statusFilter]);

  const refresh = () => loadAllSellers().then((data) => { setRows(data); setLoading(false); });
  useEffect(() => { refresh(); }, []);

  const setStatus = async (id: string, status: "approved" | "pending" | "blocked") => {
    try { await updateResellerStatus(id, status); toast.success("Status atualizado"); refresh(); }
    catch (e: unknown) { toast.error("Falhou", { description: e instanceof Error ? e.message : "Erro desconhecido." }); }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Código copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
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
            <p className="text-[10px] text-muted-foreground">{rows.filter((r) => r.status === "approved").length} aprovadas · {rows.filter((r) => r.status === "pending").length} pendentes</p>
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email, código ou loja…"
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
              <th className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium hidden lg:table-cell">Indicação</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium hidden md:table-cell">Loja</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Status</th>
              <th className="px-5 py-3" />
            </tr></thead>
            <tbody className="divide-y divide-border">
              {filtered.map((s) => {
                const store = s.seller_stores?.[0];
                return (
                <tr key={s.id} className="hover:bg-secondary/30">
                  <td className="px-5 py-4">
                    <p className="font-medium">
                      {s.display_name}
                      {s.is_admin && (
                        <span className="ml-2 inline-block rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-primary">
                          Admin
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.email}</p>
                    {s.referral_code && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <code className="text-[11px] font-mono tracking-wider text-primary">{s.referral_code}</code>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          title="Copiar código"
                          onClick={() => void copyCode(s.referral_code!)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          title="Regenerar código"
                          onClick={() => setRegenTarget(s)}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    {s.sponsor_name ? (
                      <div>
                        <p className="text-sm">{s.sponsor_name}</p>
                        <button
                          type="button"
                          className="text-[11px] text-primary hover:underline"
                          onClick={() => {
                            setSponsorTarget(s);
                            setSponsorId("");
                            setSponsorReason("");
                          }}
                        >
                          Corrigir patrocinadora
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-muted-foreground">Raiz / sem patrocinadora</p>
                        <button
                          type="button"
                          className="text-[11px] text-primary hover:underline"
                          onClick={() => {
                            setSponsorTarget(s);
                            setSponsorId("");
                            setSponsorReason("");
                          }}
                        >
                          Definir patrocinadora
                        </button>
                      </div>
                    )}
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
              {filtered.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">Nenhuma sacoleira encontrada.</td></tr>}
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

      <Dialog open={!!regenTarget} onOpenChange={(o) => !o && setRegenTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerar código de indicação?</DialogTitle>
            <DialogDescription>
              O código atual de <strong>{regenTarget?.display_name}</strong> (
              <code>{regenTarget?.referral_code}</code>) deixará de funcionar. Indicadas novas precisarão do código novo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={busyAction} onClick={() => setRegenTarget(null)}>Cancelar</Button>
            <Button
              variant="gold"
              disabled={busyAction || !regenTarget}
              onClick={() => {
                if (!regenTarget) return;
                void (async () => {
                  try {
                    setBusyAction(true);
                    const res = await adminRegenerateReferralCode(regenTarget.id, "admin regenerate");
                    toast.success("Código regenerado", { description: res.referral_code });
                    setRegenTarget(null);
                    refresh();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Falha ao regenerar");
                  } finally {
                    setBusyAction(false);
                  }
                })();
              }}
            >
              {busyAction ? "Regenerando…" : "Confirmar regeneração"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!sponsorTarget} onOpenChange={(o) => !o && setSponsorTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Corrigir patrocinadora</DialogTitle>
            <DialogDescription>
              Altere a patrocinadora de <strong>{sponsorTarget?.display_name}</strong>. A operação é auditada e bloqueia ciclos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="sponsor-id">ID da nova patrocinadora (reseller id)</Label>
              <Input
                id="sponsor-id"
                className="mt-1.5 font-mono text-xs"
                value={sponsorId}
                onChange={(e) => setSponsorId(e.target.value)}
                placeholder="uuid da patrocinadora"
              />
            </div>
            <div>
              <Label htmlFor="sponsor-reason">Motivo (obrigatório)</Label>
              <Input
                id="sponsor-reason"
                className="mt-1.5"
                value={sponsorReason}
                onChange={(e) => setSponsorReason(e.target.value)}
                placeholder="Ex.: correção de indicação incorreta"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={busyAction} onClick={() => setSponsorTarget(null)}>Cancelar</Button>
            <Button
              variant="gold"
              disabled={busyAction || !sponsorTarget || !sponsorId.trim() || !sponsorReason.trim()}
              onClick={() => {
                if (!sponsorTarget) return;
                void (async () => {
                  try {
                    setBusyAction(true);
                    await adminSetResellerSponsor(sponsorTarget.id, sponsorId.trim(), sponsorReason.trim());
                    toast.success("Patrocinadora atualizada");
                    setSponsorTarget(null);
                    refresh();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Falha ao corrigir");
                  } finally {
                    setBusyAction(false);
                  }
                })();
              }}
            >
              {busyAction ? "Salvando…" : "Salvar com auditoria"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminSellers;
