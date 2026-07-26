import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  CHECKOUT_REQUIRED_DOCUMENT_TYPES,
  type AdminLegalConsentListItem,
  type CheckoutConsentInput,
  type LegalConsent,
  type LegalConsentContext,
  type LegalDocument,
  type LegalDocumentType,
  type LegalDocumentVersionInput,
} from "@/types/legal";

type RpcJson = Record<string, unknown>;

async function rpcJson(name: string, args: Record<string, unknown> = {}): Promise<RpcJson> {
  const { data, error } = await supabase.rpc(name as never, args as never);
  if (error) throw new Error(friendlyLegalError(error.message));
  return (data ?? {}) as RpcJson;
}

export function friendlyLegalError(raw: string | null | undefined): string {
  const m = String(raw ?? "").toLowerCase();
  if (!m) return "Não foi possível concluir. Tente novamente.";
  if (m.includes("termos foram atualizados") || m.includes("hash") || m.includes("versão")) {
    return "Os termos foram atualizados. Revise e aceite novamente.";
  }
  if (m.includes("obrigatório não aceito") || m.includes("consentimentos legais")) {
    return "Aceite todos os documentos legais obrigatórios para continuar.";
  }
  if (m.includes("documento ativo não encontrado")) {
    return "Documento legal indisponível. Recarregue a página.";
  }
  if (m.includes("somente administradores") || m.includes("acesso negado")) {
    return "Acesso negado.";
  }
  if (m.includes("checkout vinculado")) {
    return "Este consentimento de pedido não pode ser revogado por aqui.";
  }
  return "Não foi possível concluir. Tente novamente.";
}

export function isCheckoutConsentComplete(
  docs: LegalDocument[],
  acceptedTypes: Set<string>,
): boolean {
  const required = docs.filter(
    (d) =>
      d.requires_acceptance
      && CHECKOUT_REQUIRED_DOCUMENT_TYPES.includes(d.document_type),
  );
  if (required.length === 0) return false;
  return required.every((d) => acceptedTypes.has(d.document_type));
}

export function buildCheckoutConsentPayload(
  docs: LegalDocument[],
  acceptedTypes: Set<string>,
): CheckoutConsentInput[] {
  return docs
    .filter(
      (d) =>
        d.requires_acceptance
        && CHECKOUT_REQUIRED_DOCUMENT_TYPES.includes(d.document_type)
        && acceptedTypes.has(d.document_type),
    )
    .map((d) => ({
      document_type: d.document_type,
      version: d.version,
      content_hash: d.content_hash,
      accepted: true as const,
    }));
}

/** Invalida aceites locais quando versão/hash mudou. */
export function reconcileAcceptedWithDocs(
  prevAccepted: Set<string>,
  prevDocs: LegalDocument[],
  nextDocs: LegalDocument[],
): Set<string> {
  const next = new Set<string>();
  const prevByType = new Map(prevDocs.map((d) => [d.document_type, d]));
  for (const type of prevAccepted) {
    const oldDoc = prevByType.get(type as LegalDocumentType);
    const newDoc = nextDocs.find((d) => d.document_type === type);
    if (
      oldDoc
      && newDoc
      && oldDoc.version === newDoc.version
      && oldDoc.content_hash === newDoc.content_hash
    ) {
      next.add(type);
    }
  }
  return next;
}

export async function fetchActiveLegalDocuments(
  audience: string | null = "checkout",
): Promise<LegalDocument[]> {
  const data = await rpcJson("get_active_legal_documents", { p_audience: audience });
  const items = (Array.isArray(data.items) ? data.items : []) as LegalDocument[];
  // Prefer audience customer over public for same type
  const byType = new Map<string, LegalDocument>();
  for (const d of items) {
    const prev = byType.get(d.document_type);
    if (!prev || d.audience === "customer" || d.audience === "reseller") {
      byType.set(d.document_type, d);
    }
  }
  return Array.from(byType.values()).sort((a, b) =>
    a.document_type.localeCompare(b.document_type),
  );
}

export async function fetchMyConsents(): Promise<LegalConsent[]> {
  const data = await rpcJson("get_my_consents");
  return (Array.isArray(data.items) ? data.items : []) as LegalConsent[];
}

export async function recordAuthenticatedConsent(
  documentType: LegalDocumentType,
  context: LegalConsentContext,
  sessionReference?: string,
) {
  return rpcJson("record_authenticated_consent", {
    p_document_type: documentType,
    p_consent_context: context,
    p_session_reference: sessionReference ?? null,
  });
}

export async function hasActiveConsentFor(documentType: LegalDocumentType): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_active_consent_for" as never, {
    p_document_type: documentType,
    p_consent_context: "manual",
  } as never);
  if (error) return false;
  return Boolean(data);
}

export async function adminListLegalDocuments(): Promise<LegalDocument[]> {
  const data = await rpcJson("admin_list_legal_documents");
  return (Array.isArray(data.items) ? data.items : []) as LegalDocument[];
}

export async function publishLegalDocumentVersion(input: LegalDocumentVersionInput) {
  return rpcJson("publish_legal_document_version", {
    p_document_type: input.document_type,
    p_title: input.title,
    p_version: input.version,
    p_content_hash: input.content_hash ?? null,
    p_effective_at: input.effective_at ?? new Date().toISOString(),
    p_audience: input.audience,
    p_route_path: input.route_path,
    p_requires_acceptance: input.requires_acceptance,
  });
}

export async function adminListLegalConsents(filters: {
  documentType?: string;
  version?: string;
  subjectType?: string;
  resellerId?: string;
  orderId?: string;
  context?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: AdminLegalConsentListItem[]; total: number }> {
  const data = await rpcJson("admin_list_legal_consents", {
    p_document_type: filters.documentType || null,
    p_version: filters.version || null,
    p_subject_type: filters.subjectType || null,
    p_reseller_id: filters.resellerId || null,
    p_order_id: filters.orderId || null,
    p_context: filters.context || null,
    p_date_from: filters.dateFrom || null,
    p_date_to: filters.dateTo || null,
    p_page: filters.page ?? 1,
    p_page_size: filters.pageSize ?? 20,
  });
  return {
    items: (Array.isArray(data.items) ? data.items : []) as AdminLegalConsentListItem[],
    total: Number(data.total ?? 0),
  };
}

export async function revokeLegalConsent(id: string, reason: string) {
  return rpcJson("revoke_legal_consent", {
    p_consent_id: id,
    p_reason: reason,
  });
}

export function consentsToJson(consents: CheckoutConsentInput[]): Json {
  return consents as unknown as Json;
}
