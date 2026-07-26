import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Loader2 } from "lucide-react";
import { SellerLayout } from "@/layouts/SellerLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  fetchActiveLegalDocuments,
  fetchMyConsents,
  friendlyLegalError,
  recordAuthenticatedConsent,
} from "@/lib/legalConsents";
import type { LegalConsent, LegalDocument, LegalDocumentType } from "@/types/legal";
import { toast } from "sonner";

const SellerLegalConsents = () => {
  const [consents, setConsents] = useState<LegalConsent[]>([]);
  const [activeDocs, setActiveDocs] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyType, setBusyType] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    try {
      const [c, d] = await Promise.all([
        fetchMyConsents(),
        fetchActiveLegalDocuments("reseller"),
      ]);
      setConsents(c);
      setActiveDocs(d.filter((x) => x.audience === "reseller" || x.requires_acceptance));
    } catch (e) {
      toast.error("Falha ao carregar consentimentos", {
        description: friendlyLegalError(e instanceof Error ? e.message : String(e)),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const pendingDocs = activeDocs.filter((doc) => {
    const ok = consents.some(
      (c) =>
        c.document_type === doc.document_type
        && c.version === doc.version
        && c.status === "active",
    );
    return doc.requires_acceptance && !ok;
  });

  const accept = async (doc: LegalDocument, context: "manual" | "withdrawal_request" | "commission_enrollment") => {
    if (busyType) return;
    setBusyType(doc.document_type);
    try {
      await recordAuthenticatedConsent(doc.document_type as LegalDocumentType, context);
      toast.success("Aceite registrado");
      await reload();
    } catch (e) {
      toast.error("Não foi possível registrar", {
        description: friendlyLegalError(e instanceof Error ? e.message : String(e)),
      });
    } finally {
      setBusyType(null);
    }
  };

  return (
    <SellerLayout>
      <PageHeader
        eyebrow="LGPD"
        title="Meus consentimentos"
        description="Documentos legais que você aceitou e versões novas pendentes."
      />

      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando…
        </div>
      ) : (
        <div className="space-y-8">
          {pendingDocs.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-3">
              <p className="text-sm font-medium">Há documentos com versão nova ainda não aceita</p>
              {pendingDocs.map((doc) => (
                <div key={doc.id} className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">Versão {doc.version}</p>
                  </div>
                  <div className="flex gap-2">
                    {doc.route_path && (
                      <Button asChild variant="outline" size="sm">
                        <Link to={doc.route_path} target="_blank">Ler</Link>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="gold"
                      disabled={busyType === doc.document_type}
                      onClick={() => accept(doc, "manual")}
                    >
                      {busyType === doc.document_type ? "Salvando…" : "Aceitar versão atual"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="font-display text-xl">Histórico</h3>
            </div>
            {consents.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted-foreground text-center">
                Nenhum aceite registrado ainda.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {consents.map((c) => (
                  <div key={c.id} className="px-5 py-4 flex flex-wrap justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{c.title || c.document_type}</p>
                      <p className="text-xs text-muted-foreground">
                        Versão {c.version} · {c.consent_context} ·{" "}
                        {new Date(c.accepted_at).toLocaleString("pt-BR")}
                        {c.status === "revoked" ? " · revogado" : ""}
                        {c.is_current_version === false ? " · versão antiga" : ""}
                      </p>
                    </div>
                    {c.route_path && (
                      <Button asChild variant="ghost" size="sm">
                        <Link to={c.route_path} target="_blank">Documento atual</Link>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </SellerLayout>
  );
};

export default SellerLegalConsents;
