import type { AppRole } from "@/lib/safeRedirect";
import { buildLoginUrlWithNext, isSafeInternalPath, loginPathForRole } from "@/lib/safeRedirect";
import { isRefreshTokenError } from "@/lib/authStorage";

export const SESSION_EXPIRED_MESSAGE = "Sua sessão expirou. Entre novamente.";

export type SessionExpiryReason =
  | "refresh_invalid"
  | "signed_out_unexpected"
  | "auth_401"
  | "auth_403";

let expiryRedirectInFlight = false;

export function resetSessionExpiryGuardForTests() {
  expiryRedirectInFlight = false;
}

export function beginSessionExpiryRedirect(): boolean {
  if (expiryRedirectInFlight) return false;
  expiryRedirectInFlight = true;
  return true;
}

export function endSessionExpiryRedirect() {
  expiryRedirectInFlight = false;
}

export function shouldTreatAsSessionExpiry(opts: {
  manualSignOut: boolean;
  reason?: SessionExpiryReason | null;
  error?: unknown;
}): boolean {
  if (opts.manualSignOut) return false;
  if (opts.reason) return true;
  return isRefreshTokenError(opts.error);
}

export function resolveSessionExpiryLoginPath(opts: {
  lastRole?: AppRole | null;
  currentPath?: string;
}): string {
  const login = loginPathForRole(opts.lastRole ?? "sacoleira");
  const path = opts.currentPath || "/";
  if (!isSafeInternalPath(path)) return login;
  // Não redirecionar de volta ao próprio login
  if (path.startsWith("/login")) return login;
  if (path.startsWith("/reset-password")) return login;
  return buildLoginUrlWithNext(login, path);
}

/** Recovery: só PASSWORD_RECOVERY autoriza a tela. */
export function isPasswordRecoveryEvent(event: string): boolean {
  return event === "PASSWORD_RECOVERY";
}

export function canSubmitPasswordRecovery(opts: {
  recoveryConfirmed: boolean;
  busy: boolean;
  alreadySucceeded: boolean;
}): boolean {
  return opts.recoveryConfirmed && !opts.busy && !opts.alreadySucceeded;
}

export function isPasswordStrongEnough(password: string, minLength = 8): boolean {
  return password.length >= minLength;
}

export function passwordsMatch(a: string, b: string): boolean {
  return a.length > 0 && a === b;
}

export function friendlyAuthError(raw: string | null | undefined): string {
  const m = String(raw ?? "").toLowerCase();
  if (!m) return "Não foi possível concluir. Tente novamente.";
  if (m.includes("invalid login") || m.includes("invalid credentials") || m.includes("wrong password")) {
    return "Email ou senha inválidos.";
  }
  if (m.includes("email not confirmed")) return "Confirme seu email antes de entrar.";
  if (m.includes("user banned") || m.includes("disabled") || m.includes("blocked")) {
    return "Esta conta está desativada. Fale com o suporte.";
  }
  if (m.includes("not approved") || m.includes("pending")) {
    return "Sua conta ainda não foi aprovada.";
  }
  if (m.includes("refresh token") || (m.includes("session") && m.includes("expired"))) {
    return SESSION_EXPIRED_MESSAGE;
  }
  if (m.includes("network") || m.includes("fetch")) {
    return "Falha temporária de rede. Tente novamente.";
  }
  if (m.includes("expired") && m.includes("link")) {
    return "Este link de recuperação expirou. Solicite um novo.";
  }
  // Evita vazar detalhes técnicos demais
  if (m.includes("permission") || m.includes("rls") || m.includes("jwt")) {
    return "Acesso negado. Verifique suas permissões.";
  }
  return "Não foi possível concluir. Tente novamente.";
}
