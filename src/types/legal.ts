export type LegalDocumentType =
  | "privacy_policy"
  | "terms_of_use"
  | "returns_policy"
  | "delivery_policy"
  | "commission_policy"
  | "withdrawal_policy";

export type LegalAudience = "public" | "customer" | "reseller" | "admin";

export type LegalConsentContext =
  | "checkout"
  | "registration"
  | "login"
  | "withdrawal_request"
  | "commission_enrollment"
  | "manual";

export type LegalConsentSource =
  | "checkbox"
  | "authenticated_action"
  | "admin_record"
  | "migration";

export type LegalConsentStatus = "active" | "revoked";

export type LegalDocument = {
  id: string;
  document_type: LegalDocumentType;
  title: string;
  version: string;
  content_hash: string;
  effective_at: string;
  route_path: string | null;
  requires_acceptance: boolean;
  audience: LegalAudience;
  published_at?: string | null;
  is_active?: boolean;
};

export type CheckoutConsentInput = {
  document_type: LegalDocumentType;
  version: string;
  content_hash: string;
  accepted: true;
};

export type LegalConsent = {
  id: string;
  document_type: LegalDocumentType;
  version: string;
  consent_context: LegalConsentContext;
  accepted_at: string;
  revoked_at?: string | null;
  status: LegalConsentStatus;
  route_path?: string | null;
  title?: string;
  document_is_current_active?: boolean;
  is_current_version?: boolean;
};

export type AdminLegalConsentListItem = {
  id: string;
  document_type: LegalDocumentType;
  version: string;
  subject_type: "customer" | "reseller" | "admin";
  reseller_id?: string | null;
  order_id?: string | null;
  store_id?: string | null;
  consent_context: LegalConsentContext;
  consent_source: LegalConsentSource;
  accepted_at: string;
  revoked_at?: string | null;
  status: LegalConsentStatus;
};

export type LegalDocumentVersionInput = {
  document_type: LegalDocumentType;
  title: string;
  version: string;
  content_hash?: string;
  effective_at?: string;
  audience: LegalAudience;
  route_path: string;
  requires_acceptance: boolean;
};

/** Documentos obrigatórios no checkout público (não hardcodar hashes/versões). */
export const CHECKOUT_REQUIRED_DOCUMENT_TYPES: LegalDocumentType[] = [
  "privacy_policy",
  "terms_of_use",
  "returns_policy",
  "delivery_policy",
];
