import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Printer } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/mockData";
import {
  ImageFormat,
  createImageFormat,
  deleteImageFormat,
  loadImageFormats,
  slugify,
  updateImageFormat,
} from "@/lib/marketingBanners";

const AdminSettings = () => {
  const [formats, setFormats] = useState<ImageFormat[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [draft, setDraft] = useState({ name: "", width: 1080, height: 1080, description: "" });

  const printTodayOrders = async () => {
    try {
      setPrinting(true);
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end = new Date(); end.setHours(23, 59, 59, 999);
      const { data, error } = await supabase
        .from("orders")
        .select("id, customer_name, customer_phone, customer_address, total, subtotal, discount, status, notes, created_at, seller_stores(store_name), order_items(product_name, quantity, unit_price, total, products(code))")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: true });
      if (error) throw error;
      const orders = data || [];
      if (orders.length === 0) { toast.info("Nenhum pedido hoje."); return; }
      const today = new Date().toLocaleDateString("pt-BR");
      const totalDay = orders.reduce((s: number, o: any) => s + Number(o.total || 0), 0);
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Pedidos ${today}</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111;padding:24px;}
  h1{font-size:20px;margin:0 0 4px;} .muted{color:#666;font-size:12px;}
  .order{border:1px solid #ddd;border-radius:8px;padding:14px;margin:14px 0;page-break-inside:avoid;}
  .row{display:flex;justify-content:space-between;gap:12px;font-size:13px;}
  table{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px;}
  th,td{border-bottom:1px solid #eee;padding:6px 4px;text-align:left;}
  th:last-child,td:last-child{text-align:right;}
  .total{margin-top:8px;text-align:right;font-weight:600;}
  .summary{margin-top:24px;border-top:2px solid #111;padding-top:10px;font-weight:600;display:flex;justify-content:space-between;}
  @media print{ .noprint{display:none;} }
</style></head><body>
<div class="noprint" style="text-align:right;margin-bottom:8px;"><button onclick="window.print()">Imprimir</button></div>
<h1>Pedidos do dia</h1><p class="muted">${today} · ${orders.length} pedido(s)</p>
${orders.map((o: any) => `
  <div class="order">
    <div class="row"><strong>${o.customer_name || "-"}</strong><span>${new Date(o.created_at).toLocaleTimeString("pt-BR")}</span></div>
    <div class="row muted"><span>${o.customer_phone || ""}${o.seller_stores?.store_name ? " · " + o.seller_stores.store_name : ""}</span><span>Status: ${o.status}</span></div>
    ${o.customer_address ? `<div class="muted" style="margin-top:4px;">${o.customer_address}</div>` : ""}
    ${o.notes ? `<div class="muted" style="margin-top:4px;">Obs: ${o.notes}</div>` : ""}
    <table><thead><tr><th>Produto</th><th>Qtd</th><th>Unit.</th><th>Total</th></tr></thead><tbody>
      ${(o.order_items || []).map((it: any) => `<tr><td>${it.product_name}</td><td>${it.quantity}</td><td>${formatBRL(Number(it.unit_price||0))}</td><td>${formatBRL(Number(it.total||0))}</td></tr>`).join("")}
    </tbody></table>
    <div class="total">Total: ${formatBRL(Number(o.total||0))}</div>
  </div>`).join("")}
<div class="summary"><span>Total do dia</span><span>${formatBRL(totalDay)}</span></div>
<script>window.onload=()=>setTimeout(()=>window.print(),300);</script>
</body></html>`;
      const w = window.open("", "_blank");
      if (!w) { toast.error("Permita pop-ups para imprimir."); return; }
      w.document.write(html); w.document.close();
    } catch (e: any) {
      toast.error("Falha ao gerar impressão", { description: e.message });
    } finally { setPrinting(false); }
  };

  const reload = async () => {
    setLoading(true);
    setFormats(await loadImageFormats(false));
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const addFormat = async () => {
    const name = draft.name.trim();
    if (!name) return toast.error("Dê um nome ao formato.");
    if (!draft.width || !draft.height) return toast.error("Informe largura e altura.");
    const slug = slugify(name);
    if (!slug) return toast.error("Nome inválido.");
    if (formats.some((f) => f.slug === slug)) return toast.error("Já existe um formato com esse nome.");
    try {
      setSaving(true);
      await createImageFormat({ name, slug, width: draft.width, height: draft.height, description: draft.description.trim() });
      setDraft({ name: "", width: 1080, height: 1080, description: "" });
      toast.success("Formato adicionado!");
      await reload();
    } catch {
      toast.error("Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (f: ImageFormat, active: boolean) => {
    try {
      await updateImageFormat(f.id, { active });
      setFormats((c) => c.map((x) => (x.id === f.id ? { ...x, active } : x)));
    } catch { toast.error("Falha ao atualizar."); }
  };

  const remove = async (f: ImageFormat) => {
    if (!confirm(`Remover o formato "${f.name}"? As imagens existentes ficarão sem categoria.`)) return;
    try {
      await deleteImageFormat(f.id);
      setFormats((c) => c.filter((x) => x.id !== f.id));
      toast.success("Formato removido.");
    } catch { toast.error("Falha ao remover."); }
  };

  return (
    <AdminLayout>
      <PageHeader eyebrow="Configurações" title="Ajustes gerais" description="Marca, regras de comissão e formatos de imagem para a rede." />

      <Tabs defaultValue="geral" className="max-w-4xl">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="formatos">Formatos de imagem</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="mt-6 space-y-5">
          <div className="rounded-xl border border-border bg-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-4xl">
            <div>
              <h3 className="font-display text-xl">Pedidos do dia</h3>
              <p className="text-xs text-muted-foreground mt-1">Gere uma folha imprimível com todos os pedidos feitos hoje.</p>
            </div>
            <Button variant="gold" onClick={printTodayOrders} disabled={printing}>
              {printing ? <Loader2 className="h-4 w-4 animate-spin"/> : <Printer className="h-4 w-4"/>}
              Imprimir pedidos de hoje
            </Button>
          </div>
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <h3 className="font-display text-xl">Marca</h3>
              <div><Label>Nome da empresa</Label><Input defaultValue="Aura Store Suite" className="mt-1.5" /></div>
              <div><Label>Email de contato</Label><Input defaultValue="contato@aurastore.com" className="mt-1.5" /></div>
              <div><Label>WhatsApp comercial</Label><Input defaultValue="(11) 99000-0000" className="mt-1.5" /></div>
              <Button variant="gold" className="w-full">Salvar</Button>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <h3 className="font-display text-xl">Regras de atacado</h3>
              <div><Label>Pedido mínimo (R$)</Label><Input defaultValue="200" className="mt-1.5" /></div>
              <div><Label>Desconto padrão (%)</Label><Input defaultValue="10" className="mt-1.5" /></div>
              <div><Label>Desconto VIP (%)</Label><Input defaultValue="15" className="mt-1.5" /></div>
              <Button variant="goldOutline" className="w-full">Atualizar regras</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="formatos" className="mt-6 space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div>
              <h3 className="font-display text-xl">Adicionar formato</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Crie submenus em "Banners" para outros padrões de imagem (Instagram, TikTok, WhatsApp Status, etc.).
              </p>
            </div>
            <div className="grid sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <Label>Nome</Label>
                <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex: TikTok Vertical" className="mt-1.5" maxLength={60} />
              </div>
              <div>
                <Label>Largura (px)</Label>
                <Input type="number" value={draft.width} onChange={(e) => setDraft({ ...draft, width: Number(e.target.value) || 0 })} className="mt-1.5" />
              </div>
              <div>
                <Label>Altura (px)</Label>
                <Input type="number" value={draft.height} onChange={(e) => setDraft({ ...draft, height: Number(e.target.value) || 0 })} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Para que serve esse formato" className="mt-1.5" maxLength={120} />
            </div>
            <Button variant="gold" onClick={addFormat} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Adicionar formato
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-baseline justify-between">
              <h3 className="font-display text-xl">Formatos cadastrados</h3>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{formats.length} no total</span>
            </div>
            {loading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
              </div>
            ) : formats.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Nenhum formato cadastrado.</div>
            ) : (
              <div className="divide-y divide-border">
                {formats.map((f) => (
                  <div key={f.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{f.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.width} × {f.height} px · /{f.slug}
                        {f.description ? ` · ${f.description}` : ""}
                      </p>
                    </div>
                    <Switch checked={f.active} onCheckedChange={(v) => toggleActive(f, v)} />
                    <Button variant="ghost" size="icon" onClick={() => remove(f)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminSettings;
