import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListPagination } from "@/components/system/ListPagination";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import {
  adminListLegalConsents,
  friendlyLegalError,
  revokeLegalConsent,
} from "@/lib/legalConsents";
import type { AdminLegalConsentListItem } from "@/types/legal";
import { toast } from "sonner";

const AdminLegalConsents = () => {
  const [items, setItems] = useState<AdminLegalConsentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [documentType, setDocumentType] = useState("");
  const [context, setContext] = useState("");
  const [orderId, setOrderId] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    adminListLegalConsents({
      documentType: documentType || undefined,
      context: context || undefined,
      orderId: orderId || undefined,
      page,
      pageSize: DEFAULT_PAGE_SIZE,
    })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((e: unknown) => {
        toast.error("Falha ao listar consentimentos", {
          description: friendlyLegalError(e instanceof Error ? e.message : String(e)),
        });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const onRevoke = async (id: string) => {
    const reason = window.prompt("Motivo da revogação (obrigatório):");
    if (!reason?.trim()) return;
    setBusyId(id);
    try {
      await revokeLegalConsent(id, reason.trim());
      toast.success("Consentimento revogado (histórico preservado)");
      load();
    } catch (e) {
      toast.error("Revogação bloqueada", {
        description: friendlyLegalError(e instanceof Error ? e.message : String(e)),
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        eyebrow="LGPD"
        title="Consentimentos"
        description="Auditoria de aceites. Hashes técnicos sensíveis não são exibidos."
      />

      <div className="grid gap-3 sm:grid-cols-4 mb-4">
        <div>
          <Label>Documento</Label>
          <Input className="mt-1.5" value={documentType} onChange={(e) => setDocumentType(e.target.value)} placeholder="privacy_policy" />
        </div>
        <div>
          <Label>Contexto</Label>
          <Input className="mt-1.5" value={context} onChange={(e) => setContext(e.target.value)} placeholder="checkout" />
        </div>
        <div>
          <Label>Pedido (uuid)</Label>
          <Input className="mt-1.5" value={orderId} onChange={(e) => setOrderId(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button
            variant="gold"
            className="w-full"
            onClick={() => {
              setPage(1);
              load();
            }}
          >
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
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">Nenhum registro.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Documento</th>
                  <th className="px-4 py-3">Versão</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Contexto</th>
                  <th className="px-4 py-3">Aceito em</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-mono text-xs">{c.document_type}</td>
                    <td className="px-4 py-3">{c.version}</td>
                    <td className="px-4 py-3">{c.subject_type}</td>
                    <td className="px-4 py-3">{c.consent_context}</td>
                    <td className="px-4 py-3 text-xs">{new Date(c.accepted_at).toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-3">{c.status}</td>
                    <td className="px-4 py-3 text-right">
                      {c.status === "active" && c.consent_context !== "checkout" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === c.id}
                          onClick={() => onRevoke(c.id)}
                        >
                          Revogar
                        </Button>
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
    </AdminLayout>
  );
};

export default AdminLegalConsents;
