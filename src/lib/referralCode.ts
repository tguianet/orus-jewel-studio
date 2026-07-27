import { supabase } from "@/integrations/supabase/client";
import { classifySignupError } from "@/lib/signupErrors";
import { userMessageForCode } from "@/lib/errors/errorMessages";

export type ReferralValidationReason =
  | "ok"
  | "empty"
  | "not_found"
  | "inactive"
  | "blocked"
  | "rate_limited"
  | "error";

export type ReferralValidationResult = {
  valid: boolean;
  sponsor_reseller_id: string | null;
  sponsor_name: string | null;
  store_name: string | null;
  reason: ReferralValidationReason;
};

export type ReferralUiStatus =
  | "idle"
  | "checking"
  | "valid"
  | "invalid"
  | "inactive"
  | "blocked"
  | "rate_limited";

const CLIENT_KEY_STORAGE = "aa_referral_client_key";

export function normalizeReferralCode(code: string): string {
  return String(code || "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
}

export function getReferralClientKey(): string {
  try {
    const existing = sessionStorage.getItem(CLIENT_KEY_STORAGE);
    if (existing) return existing;
    const next =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `ck_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(CLIENT_KEY_STORAGE, next);
    return next;
  } catch {
    return "anon";
  }
}

export function reasonToUiStatus(reason: ReferralValidationReason, valid: boolean): ReferralUiStatus {
  if (valid && reason === "ok") return "valid";
  if (reason === "inactive") return "inactive";
  if (reason === "blocked") return "blocked";
  if (reason === "rate_limited") return "rate_limited";
  if (reason === "empty" || reason === "not_found" || reason === "error") return "invalid";
  return "invalid";
}

export function friendlyReferralMessage(status: ReferralUiStatus, sponsorName?: string | null): string {
  switch (status) {
    case "checking":
      return "Verificando código…";
    case "valid":
      return `Código válido — indicado por ${sponsorName || "sua patrocinadora"}`;
    case "inactive":
      return "Este código está inativo. Peça um código atualizado à sua patrocinadora.";
    case "blocked":
      return "Este código está bloqueado e não pode receber novas indicações.";
    case "rate_limited":
      return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
    case "invalid":
      return "Código inválido. Confira com a sua patrocinadora e tente de novo.";
    default:
      return "Informe o código de indicação da sua patrocinadora.";
  }
}

export async function validateReferralCode(code: string): Promise<ReferralValidationResult> {
  const normalized = normalizeReferralCode(code);
  if (!normalized) {
    return {
      valid: false,
      sponsor_reseller_id: null,
      sponsor_name: null,
      store_name: null,
      reason: "empty",
    };
  }

  const { data, error } = await supabase.rpc("validate_referral_code", {
    p_code: normalized,
    p_client_key: getReferralClientKey(),
  });

  if (error) {
    return {
      valid: false,
      sponsor_reseller_id: null,
      sponsor_name: null,
      store_name: null,
      reason: "error",
    };
  }

  const row = (data ?? {}) as Record<string, unknown>;
  const reason = String(row.reason ?? "not_found") as ReferralValidationReason;
  return {
    valid: Boolean(row.valid),
    sponsor_reseller_id: row.sponsor_reseller_id == null ? null : String(row.sponsor_reseller_id),
    sponsor_name: row.sponsor_name == null ? null : String(row.sponsor_name),
    store_name: row.store_name == null ? null : String(row.store_name),
    reason: reason || "not_found",
  };
}

/**
 * Cadastro de sacoleira com indicação obrigatória.
 * Usa o signUp oficial do Auth (nunca insert direto no schema auth) e envia o
 * código no metadata — o servidor revalida no trigger handle_new_user.
 */
export async function registerResellerWithReferral(input: {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  referralCode: string;
}): Promise<{ error?: string; cause?: unknown }> {
  const code = normalizeReferralCode(input.referralCode);
  if (!code) return { error: "Informe o código de indicação da sua patrocinadora." };

  // Revalida no servidor antes do cadastro (nunca confiar só no UI)
  const check = await validateReferralCode(code);
  if (!check.valid) {
    return {
      error: friendlyReferralMessage(reasonToUiStatus(check.reason, false), check.sponsor_name),
      cause: { message: `referral_invalid:${check.reason}`, code: "referral_invalid" },
    };
  }

  const { error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      emailRedirectTo: `${window.location.origin}/`,
      data: {
        display_name: input.fullName.trim(),
        phone: input.phone?.trim() || null,
        referral_code: code,
      },
    },
  });

  if (error) {
    const info = classifySignupError(error);
    return { error: userMessageForCode(info.code), cause: error };
  }

  return {};
}


/** Domínio oficial do convite de rede (cadastro). */
export const REFERRAL_INVITE_SIGNUP_URL = "https://amadaamante.app";

export const REFERRAL_CODE_MISSING_MESSAGE =
  "Seu código de indicação ainda não está disponível.";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuidLike(value: string): boolean {
  return UUID_RE.test(String(value || "").trim());
}

/**
 * Código exibido no dashboard/rede: somente `resellers.referral_code`.
 * Nunca usa UUID / reseller id como fallback.
 */
export function resolveOwnReferralCode(
  referralCode: string | null | undefined,
): string | null {
  const code = normalizeReferralCode(String(referralCode || ""));
  if (!code) return null;
  if (isUuidLike(code)) return null;
  return code;
}

export function buildReferralInviteMessage(referralCode: string): string {
  const code = resolveOwnReferralCode(referralCode);
  if (!code) return "";
  return (
    "✨ Quero te convidar para fazer parte da minha rede Amada Amante!\n\n"
    + "Use meu código de indicação no cadastro:\n\n"
    + `${code}\n\n`
    + "Cadastre-se em:\n"
    + REFERRAL_INVITE_SIGNUP_URL
  );
}

export function buildReferralWhatsAppShareHref(referralCode: string): string | null {
  const msg = buildReferralInviteMessage(referralCode);
  if (!msg) return null;
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
}

