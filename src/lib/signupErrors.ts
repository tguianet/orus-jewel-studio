import type { AppErrorCode } from "@/lib/errors/errorCodes";

/** Etapa do cadastro onde a falha ocorreu (observabilidade). */
export type SignupStage =
  | "auth_user"
  | "profile"
  | "role"
  | "reseller"
  | "store"
  | "referral_link";

export type SignupErrorInfo = {
  code: AppErrorCode;
  stage: SignupStage;
  authErrorCode?: string;
  httpStatus?: number;
  postgresCode?: string;
  constraint?: string;
  referralReason?: string;
  /** Mensagem técnica curta — nunca exibida ao usuário. */
  technicalMessage: string;
};

type LooseAuthError = {
  message?: string;
  code?: string | number;
  status?: number;
  error_description?: string;
};

const PG_CODE_RE = /\b(23505|23503|23514|40001|40P01|22P02|P0001)\b/;

export function extractReferralReason(message: string): string | undefined {
  const m = message.match(/referral_invalid:([a-z_]+)/i);
  return m?.[1]?.toLowerCase();
}

export function extractConstraint(message: string): string | undefined {
  const m = message.match(/constraint\s+"([^"]+)"/i);
  return m?.[1];
}

/**
 * Classifica um erro do supabase.auth.signUp (ou do trigger handle_new_user,
 * que o GoTrue mascara como "Database error saving new user").
 */
export function classifySignupError(error: unknown): SignupErrorInfo {
  const raw: LooseAuthError = error && typeof error === "object" ? (error as LooseAuthError) : {};
  const message = typeof error === "string"
    ? error
    : String(raw.message ?? raw.error_description ?? "");
  const lower = message.toLowerCase();
  const authErrorCode = typeof raw.code === "string" ? raw.code : undefined;
  const httpStatus = typeof raw.status === "number" ? raw.status : undefined;
  const postgresCode = message.match(PG_CODE_RE)?.[1];
  const constraint = extractConstraint(message);
  const referralReason = extractReferralReason(message);

  const base = {
    authErrorCode,
    httpStatus,
    postgresCode,
    constraint,
    referralReason,
    technicalMessage: message.slice(0, 300) || "signup_failed",
  };

  if (
    authErrorCode === "user_already_exists"
    || authErrorCode === "email_exists"
    || lower.includes("already registered")
    || lower.includes("already been registered")
    || lower.includes("user already exists")
    || lower.includes("email address is already")
  ) {
    return { ...base, code: "AUTH_EMAIL_TAKEN", stage: "auth_user" };
  }

  if (referralReason || lower.includes("código de indicação") || lower.includes("codigo de indicacao")) {
    return { ...base, code: "AUTH_SIGNUP_REFERRAL_INVALID", stage: "referral_link" };
  }

  if (lower.includes("database error saving new user") || lower.includes("unexpected_failure")) {
    return { ...base, code: "AUTH_SIGNUP_DB_ERROR", stage: "profile" };
  }

  if (postgresCode === "23505") {
    return {
      ...base,
      code: "AUTH_SIGNUP_DB_ERROR",
      stage: constraint?.includes("slug") ? "store" : "reseller",
    };
  }

  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return { ...base, code: "NETWORK_OFFLINE", stage: "auth_user" };
  }

  if (lower.includes("password")) {
    return { ...base, code: "VALIDATION_FAILED", stage: "auth_user" };
  }

  return { ...base, code: "AUTH_SIGNUP_DB_ERROR", stage: "auth_user" };
}

/** Contexto sanitizado para o log operacional — sem e-mail, senha ou payload bruto. */
export function signupErrorMetadata(info: SignupErrorInfo): Record<string, unknown> {
  return {
    signup_stage: info.stage,
    auth_error_code: info.authErrorCode ?? null,
    http_status: info.httpStatus ?? null,
    postgres_code: info.postgresCode ?? null,
    constraint: info.constraint ?? null,
    referral_reason: info.referralReason ?? null,
  };
}
