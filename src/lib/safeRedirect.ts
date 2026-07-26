export type AppRole = "admin" | "sacoleira";

function hasControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

/** Decodifica candidatos de redirect (até 2 passadas). */
export function decodeRedirectCandidate(raw: string | null | undefined): string {
  if (raw == null) return "";
  let value = String(raw).trim();
  if (!value) return "";
  for (let i = 0; i < 2; i += 1) {
    try {
      const decoded = decodeURIComponent(value);
      if (decoded === value) break;
      value = decoded;
    } catch {
      break;
    }
  }
  return value.trim();
}

/**
 * Caminho interno seguro (sem open redirect).
 * Deve começar com uma barra; sem host, protocolo, //, \, javascript:, data:.
 */
export function isSafeInternalPath(raw: string | null | undefined): boolean {
  const path = decodeRedirectCandidate(raw);
  if (!path) return false;
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  if (path.includes("\\")) return false;
  if (hasControlChars(path)) return false;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(path)) return false; // protocol-relative already caught; scheme:
  if (/javascript:/i.test(path) || /data:/i.test(path)) return false;
  if (/https?:/i.test(path)) return false;
  // Rejeita aparência de host embutido após /
  if (/^\/\\/.test(path)) return false;
  // Rejeita %2F%2F já decodificado acima; se ainda restar encoded //
  if (/%2f%2f/i.test(String(raw ?? ""))) return false;
  return true;
}

export function isPathAllowedForRole(path: string, roles: AppRole[]): boolean {
  if (!isSafeInternalPath(path)) return false;
  const p = decodeRedirectCandidate(path);
  const isAdmin = roles.includes("admin");
  const isSeller = roles.includes("sacoleira");

  if (p === "/") return true;

  // Fluxo OAuth interno (Lovable) — qualquer perfil autenticado
  if (p === "/.lovable/oauth/consent" || p.startsWith("/.lovable/oauth/")) {
    return isAdmin || isSeller;
  }

  // Escolha de área — só quem tem as duas roles
  if (p === "/escolher-area" || p.startsWith("/escolher-area/")) {
    return isAdmin && isSeller;
  }

  if (isAdmin && (p === "/admin" || p.startsWith("/admin/"))) return true;
  if (isSeller && (p === "/sacoleira" || p.startsWith("/sacoleira/"))) return true;
  if (isSeller && (p === "/loja" || p.startsWith("/loja/"))) return true;

  // Admin sem role sacoleira não entra em painel seller
  if (isAdmin && !isSeller && (p.startsWith("/sacoleira") || p.startsWith("/loja/"))) return false;
  // Sacoleira sem admin não entra em /admin
  if (isSeller && !isAdmin && p.startsWith("/admin")) return false;

  return false;
}

export function fallbackPathForRoles(roles: AppRole[]): string {
  const isAdmin = roles.includes("admin");
  const isSeller = roles.includes("sacoleira");
  if (isAdmin && isSeller) return "/escolher-area";
  if (isAdmin) return "/admin";
  if (isSeller) return "/sacoleira";
  return "/acesso-pendente";
}

export function loginPathForRole(role: AppRole | "generic" | null | undefined): string {
  if (role === "admin") return "/login-admin";
  if (role === "sacoleira") return "/login-sacoleira";
  return "/login-sacoleira";
}

/** Resolve next seguro para o perfil; fallback se inválido ou fora da allowlist. */
export function getSafeRedirectForRole(
  rawNext: string | null | undefined,
  roles: AppRole[],
): string {
  const fallback = fallbackPathForRoles(roles);
  if (!roles.length) return fallback;
  const path = decodeRedirectCandidate(rawNext);
  if (!isSafeInternalPath(path)) return fallback;
  if (!isPathAllowedForRole(path, roles)) return fallback;
  return path;
}

/** Monta URL de login com next seguro (só path interno). */
export function buildLoginUrlWithNext(
  loginPath: string,
  currentPath: string,
): string {
  if (!isSafeInternalPath(currentPath)) return loginPath;
  const sep = loginPath.includes("?") ? "&" : "?";
  return `${loginPath}${sep}next=${encodeURIComponent(decodeRedirectCandidate(currentPath))}`;
}
