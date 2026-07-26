import { FormEvent, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  adminListLegalDocuments,
  friendlyLegalError,
  publishLegalDocumentVersion,
} from "@/lib/legalConsents";
import type { LegalAudience, LegalDocument, LegalDocumentType } from "@/types/legal";
import { toast } from "sonner";

const DOC_TYPES: LegalDocumentType[] = [
  "privacy_policy",
  "terms_of_use",
  "returns_policy",
  "delivery_policy",
  "commission_policy",
  "withdrawal_policy",
];

const AdminLegalDocuments = () => {
  const [items, setItems] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    document_type: "privacy_policy" as LegalDocumentType,
    title: "",
    version: "",
    audience: "customer" as LegalAudience,
    route_path: "",
    requires_acceptance: true,
  });

  const reload = () => {
    setLoading(true);
    adminListLegalDocuments()
      .then(setItems)
      .catch((e: unknown) => {
        toast.error("Falha ao listar documentos", {
          description: friendlyLegalError(e instanceof Error ? e.message : String(e)),
        });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);

  const onPublish = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await publishLegalDocumentVersion({
        document_type: form.document_type,
        title: form.title,
        version: form.version,
        audience: form.audience,
        route_path: form.route_path,
        requires_acceptance: form.requires_acceptance,
      });
      toast.success("Nova versão publicada");
      reload();
    } catch (err) {
      toast.error("Falha ao publicar", {
        description: friendlyLegalError(err instanceof Error ? err.message : String(err)),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        eyebrow="LGPD"
        title="Documentos legais"
        description="Versionamento de políticas. Não edite hash/conteúdo histórico já aceito."
      />

      <form onSubmit={onPublish} className="rounded-xl border border-border bg-card p-5 mb-8 grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Tipo</Label>
          <select
            className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={form.document_type}
            onChange={(e) => setForm({ ...form, document_type: e.target.value as LegalDocumentType })}
          >
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Audiência</Label>
          <select
            className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={form.audience}
            onChange={(e) => setForm({ ...form, audience: e.target.value as LegalAudience })}
          >
            <option value="customer">customer</option>
            <option value="public">public</option>
            <option value="reseller">reseller</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <div>
          <Label>Título</Label>
          <Input className="mt-1.5" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <Label>Versão (YYYY-MM-DD)</Label>
          <Input className="mt-1.5" required placeholder="2026-08-01" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
        </div>
        <div>
          <Label>Rota</Label>
          <Input className="mt-1.5" required placeholder="/politica-de-privacidade" value={form.route_path} onChange={(e) => setForm({ ...form, route_path: e.target.value })} />
        </div>
        <div className="flex items-end">
          <Button type="submit" variant="gold" disabled={busy} className="w-full">
            {busy ? "Publicando…" : "Publicar nova versão"}
          </Button>
        </div>
      </form>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="px-5 py-10 text-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin inline mr-2" />Carregando…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Versão</th>
                  <th className="px-4 py-3">Audiência</th>
                  <th className="px-4 py-3">Ativo</th>
                  <th className="px-4 py-3">Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((d) => (
                  <tr key={d.id}>
                    <td className="px-4 py-3 font-mono text-xs">{d.document_type}</td>
                    <td className="px-4 py-3">{d.title}</td>
                    <td className="px-4 py-3">{d.version}</td>
                    <td className="px-4 py-3">{d.audience}</td>
                    <td className="px-4 py-3">{d.is_active ? "sim" : "não"}</td>
                    <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">
                      {d.content_hash.slice(0, 12)}…
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminLegalDocuments;
