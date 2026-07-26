import { decodeRedirectCandidate, isSafeInternalPath } from "@/lib/safeRedirect";

/** Hosts externos autorizados para redirect OAuth (match exato do hostname). */
export function getDefaultOAuthAllowedHosts(appOriginHostname?: string): string[] {
  const hosts = new Set<string>();
  if (appOriginHostname) hosts.add(appOriginHostname.toLowerCase());
  if (typeof window !== "undefined" && window.location?.hostname) {
    hosts.add(window.location.hostname.toLowerCase());
  }
  // Lovable / Cloud comuns
  [
    "lovable.app",
    "lovable.dev",
    "lovableproject.com",
  ].forEach((h) => hosts.add(h));
  return Array.from(hosts);
}

export function isAllowedOAuthRedirect(
  raw: string | null | undefined,
  allowedHosts: string[] = getDefaultOAuthAllowedHosts(),
): boolean {
  const value = decodeRedirectCandidate(raw);
  if (!value) return false;

  // Caminho interno relativo
  if (value.startsWith("/") && isSafeInternalPath(value)) return true;

  // Rejeita esquemas perigosos / protocol-relative
  if (/^javascript:/i.test(value) || /^data:/i.test(value)) return false;
  if (value.startsWith("//")) return false;
  if (value.includes("\\")) return false;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  if (url.username || url.password) return false;

  const host = url.hostname.toLowerCase();
  const allow = new Set(allowedHosts.map((h) => h.toLowerCase()));
  // Match exato — não includes
  return allow.has(host);
}

export function resolveOAuthRedirect(
  raw: string | null | undefined,
  fallbackPath = "/",
  allowedHosts?: string[],
): { ok: true; url: string } | { ok: false; reason: string } {
  if (isAllowedOAuthRedirect(raw, allowedHosts)) {
    return { ok: true, url: decodeRedirectCandidate(raw) };
  }
  if (isSafeInternalPath(fallbackPath)) {
    return { ok: false, reason: "redirect_oauth_invalido" };
  }
  return { ok: false, reason: "redirect_oauth_invalido" };
}
