/**
 * Regras de classificação de URL para cache PWA.
 * Espelham a intenção do runtimeCaching em vite.config.ts (testável no frontend).
 */

export function toUrl(input: string | URL): URL {
  if (input instanceof URL) return input;
  try {
    return new URL(input, "https://amadaamante.local");
  } catch {
    return new URL("https://amadaamante.local/invalid");
  }
}

export function isSupabaseHost(hostname: string): boolean {
  return /\.supabase\.co$/i.test(hostname);
}

export function isLovableCloudHost(hostname: string): boolean {
  return (
    /\.lovable\.(app|dev)$/i.test(hostname)
    || /lovableproject\.com$/i.test(hostname)
    || /lovable\.cloud$/i.test(hostname)
  );
}

/** REST, RPC, Auth, Realtime, Functions, GraphQL — nunca cachear. */
export function isApiDataPath(pathname: string): boolean {
  return (
    /\/rest\/v1\//i.test(pathname)
    || /\/auth\/v1\//i.test(pathname)
    || /\/functions\/v1\//i.test(pathname)
    || /\/realtime\//i.test(pathname)
    || /\/graphql\/v1/i.test(pathname)
    || /\/rpc\//i.test(pathname)
  );
}

export function isPrivateStoragePath(pathname: string): boolean {
  return (
    /\/storage\/v1\/object\/authenticated\//i.test(pathname)
    || /\/storage\/v1\/object\/sign\//i.test(pathname)
  );
}

export function isPublicStorageImagePath(pathname: string): boolean {
  return (
    /\/storage\/v1\/object\/public\//i.test(pathname)
    && /\.(?:png|jpe?g|svg|gif|webp|avif)$/i.test(pathname)
  );
}

export function isSameOriginPublicImagePath(pathname: string): boolean {
  return (
    /\.(?:png|jpe?g|svg|gif|webp|avif)$/i.test(pathname)
    && !pathname.startsWith("/icons/")
  );
}

/**
 * URLs de API/banco/auth que NÃO devem entrar em runtimeCaching de dados.
 * (Podem ter regra NetworkOnly explícita, mas nunca CacheFirst/NetworkFirst de dados.)
 */
export function isApiUrl(input: string | URL): boolean {
  const url = toUrl(input);
  if (isSupabaseHost(url.hostname) || isLovableCloudHost(url.hostname)) {
    if (isPublicStorageImagePath(url.pathname)) return false;
    return true;
  }
  if (url.pathname.startsWith("/api/")) return true;
  return isApiDataPath(url.pathname);
}

/** Imagens públicas elegíveis a cache (CacheFirst / SWR). */
export function isPublicCacheableImageUrl(input: string | URL): boolean {
  const url = toUrl(input);
  if (isSupabaseHost(url.hostname)) {
    return isPublicStorageImagePath(url.pathname) && !isPrivateStoragePath(url.pathname);
  }
  if (isLovableCloudHost(url.hostname)) return false;
  if (url.hostname === "amadaamante.local" || url.origin === "https://amadaamante.local") {
    return isSameOriginPublicImagePath(url.pathname);
  }
  // same-origin relative paths resolved above; absolute same-app assets:
  return isSameOriginPublicImagePath(url.pathname) && !isApiUrl(url);
}

/**
 * O que NÃO deve ter handler de cache de dados no runtimeCaching.
 * Imagens públicas são a exceção permitida.
 */
export function shouldExcludeFromDataRuntimeCache(input: string | URL): boolean {
  return isApiUrl(input);
}

export function isSensitiveOnlinePath(pathname: string): boolean {
  const p = pathname.toLowerCase();
  return (
    p.includes("/checkout")
    || p.startsWith("/admin")
    || p.startsWith("/sacoleira")
    || p.startsWith("/login-admin")
    || p.startsWith("/login-sacoleira")
    || p.startsWith("/reset-password")
    || p.startsWith("/redefinir-senha")
  );
}

export const OFFLINE_SENSITIVE_MESSAGE =
  "Você está offline. Conecte-se para continuar.";

/** Resumo das estratégias (documentação / testes). */
export const PWA_CACHE_STRATEGY_SUMMARY = {
  apiRestRpcAuth: "NetworkOnly",
  supabaseOther: "NetworkOnly",
  lovableCloud: "NetworkOnly",
  htmlNavigate: "NetworkFirst",
  hashedJsCss: "precache + CacheFirst (versionado)",
  publicImages: "StaleWhileRevalidate",
  pwaIcons: "NetworkFirst",
  manifests: "NetworkOnly",
  lojaManifestBySlug: "NetworkOnly + SW cache por slug",
  navigationScope: "manifest.scope (nunca /)",
} as const;
