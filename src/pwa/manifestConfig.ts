/** Versao de assets PWA - bust de cache de icones/manifestos. */
export const PWA_ASSET_VERSION = "20260726a";

export type PwaAppKind = "admin" | "sacoleira" | "loja" | "default";

export type PwaManifestIcon = {
  src: string;
  sizes: string;
  type: string;
  purpose: "any" | "maskable";
};

export type PwaManifestConfig = {
  kind: PwaAppKind;
  /** Identidade estavel do app instalado (nao reutilizar entre areas). */
  id: string;
  name: string;
  shortName: string;
  description: string;
  startUrl: string;
  /** Escopo de navegacao do PWA — nunca "/". */
  scope: string;
  themeColor: string;
  backgroundColor: string;
  appleTouchIcon: string;
  favicon: string;
  /** Href estatico preferido (admin/sacoleira); loja usa path dinamico. */
  manifestHref?: string;
  icons: PwaManifestIcon[];
};

/** Branding opcional da loja publica (preenchido apos load da vitrine). */
export type LojaManifestBranding = {
  slug: string;
  name: string;
  shortName?: string;
  description?: string;
  themeColor?: string;
  backgroundColor?: string;
  /** Logo da loja (qualquer URL https); fallback para icones Amada Amante. */
  logoUrl?: string;
};

export const LOJA_BRANDING_STORAGE_PREFIX = "pwa-loja-branding:";

function iconUrl(path: string): string {
  return `${path}?v=${PWA_ASSET_VERSION}`;
}

const ADMIN_ICONS: PwaManifestIcon[] = [
  { src: iconUrl("/icons/admin-192.png"), sizes: "192x192", type: "image/png", purpose: "any" },
  { src: iconUrl("/icons/admin-512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
  {
    src: iconUrl("/icons/admin-maskable-512.png"),
    sizes: "512x512",
    type: "image/png",
    purpose: "maskable",
  },
];

const SACOLEIRA_ICONS: PwaManifestIcon[] = [
  { src: iconUrl("/icons/sacoleira-192.png"), sizes: "192x192", type: "image/png", purpose: "any" },
  { src: iconUrl("/icons/sacoleira-512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
  {
    src: iconUrl("/icons/sacoleira-maskable-512.png"),
    sizes: "512x512",
    type: "image/png",
    purpose: "maskable",
  },
];

/** Fallback 192/512 Amada Amante para lojas sem logo. */
export const LOJA_FALLBACK_ICONS: PwaManifestIcon[] = [
  { src: iconUrl("/icons/loja-192.png"), sizes: "192x192", type: "image/png", purpose: "any" },
  { src: iconUrl("/icons/loja-512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
  {
    src: iconUrl("/icons/loja-maskable-512.png"),
    sizes: "512x512",
    type: "image/png",
    purpose: "maskable",
  },
];

export function resolvePwaKind(pathname: string): PwaAppKind {
  if (pathname.startsWith("/login-admin") || pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/login-sacoleira") || pathname.startsWith("/sacoleira")) return "sacoleira";
  if (pathname.startsWith("/loja/")) return "loja";
  return "default";
}

export function extractLojaSlug(pathname: string): string | null {
  const match = pathname.match(/^\/loja\/([^/]+)/);
  const slug = match?.[1] ?? null;
  if (!slug || slug === "manifest.webmanifest") return null;
  return slug;
}

export function lojaManifestPath(slug: string): string {
  return `/loja/${slug}/manifest.webmanifest`;
}

export function lojaAppId(slug: string): string {
  return `/loja/${slug}`;
}

export function lojaScope(slug: string): string {
  return `/loja/${slug}/`;
}

export function lojaStartUrl(slug: string): string {
  return `/loja/${slug}`;
}

/** short_name seguro para home screen (max ~12). */
export function truncateShortName(name: string, max = 12): string {
  const trimmed = name.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

export function titleFromSlug(slug: string): string {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function readCachedLojaBranding(slug: string): LojaManifestBranding | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${LOJA_BRANDING_STORAGE_PREFIX}${slug}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LojaManifestBranding;
    if (!parsed?.slug || !parsed?.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCachedLojaBranding(branding: LojaManifestBranding): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `${LOJA_BRANDING_STORAGE_PREFIX}${branding.slug}`,
      JSON.stringify(branding),
    );
  } catch {
    /* quota / private mode */
  }
}

function iconsForLojaLogo(logoUrl?: string): PwaManifestIcon[] {
  if (!logoUrl) return LOJA_FALLBACK_ICONS;
  return [
    { src: logoUrl, sizes: "192x192", type: "image/png", purpose: "any" },
    { src: logoUrl, sizes: "512x512", type: "image/png", purpose: "any" },
    { src: logoUrl, sizes: "512x512", type: "image/png", purpose: "maskable" },
  ];
}

export function getLojaManifestConfig(
  slug: string,
  branding?: LojaManifestBranding | null,
): PwaManifestConfig {
  const cached = branding ?? readCachedLojaBranding(slug);
  const displayName = cached?.name?.trim() || titleFromSlug(slug) || "Amada Amante";
  const shortName = truncateShortName(cached?.shortName?.trim() || displayName);

  return {
    kind: "loja",
    id: lojaAppId(slug),
    name: displayName,
    shortName,
    description: cached?.description?.trim() || `Loja virtual ${displayName}`,
    startUrl: lojaStartUrl(slug),
    scope: lojaScope(slug),
    themeColor: cached?.themeColor || "#C1186E",
    backgroundColor: cached?.backgroundColor || "#ffffff",
    appleTouchIcon: cached?.logoUrl || iconUrl("/icons/loja-192.png"),
    favicon: cached?.logoUrl || iconUrl("/icons/loja-192.png"),
    manifestHref: lojaManifestPath(slug),
    icons: iconsForLojaLogo(cached?.logoUrl),
  };
}

export function getPwaManifestConfig(pathname: string): PwaManifestConfig {
  const kind = resolvePwaKind(pathname);

  if (kind === "admin") {
    return {
      kind,
      id: "/admin-app",
      name: "Amada Amante Admin",
      shortName: "Admin",
      description: "Painel administrativo Amada Amante",
      startUrl: "/admin",
      scope: "/admin/",
      themeColor: "#C1186E",
      backgroundColor: "#ffffff",
      appleTouchIcon: iconUrl("/icons/admin-192.png"),
      favicon: iconUrl("/icons/admin-192.png"),
      manifestHref: "/manifests/manifest-admin.json",
      icons: ADMIN_ICONS,
    };
  }

  if (kind === "sacoleira") {
    return {
      kind,
      id: "/sacoleira-app",
      name: "Amada Amante Sacoleira",
      shortName: "Sacoleira",
      description: "Painel da sacoleira Amada Amante — loja, pedidos e rede de revenda.",
      startUrl: "/sacoleira",
      scope: "/sacoleira/",
      themeColor: "#C1186E",
      backgroundColor: "#ffffff",
      appleTouchIcon: iconUrl("/icons/sacoleira-192.png"),
      favicon: iconUrl("/icons/sacoleira-192.png"),
      manifestHref: "/manifests/manifest-sacoleira.json",
      icons: SACOLEIRA_ICONS,
    };
  }

  if (kind === "loja") {
    const slug = extractLojaSlug(pathname);
    if (slug) return getLojaManifestConfig(slug);
  }

  // Landing e rotas genericas: sem app instalavel de dominio inteiro.
  return {
    kind: "default",
    id: "/default-non-install",
    name: "Amada Amante",
    shortName: "Amada Amante",
    description: "Loja virtual Amada Amante",
    startUrl: "/",
    scope: "/__pwa_none__/",
    themeColor: "#C1186E",
    backgroundColor: "#ffffff",
    appleTouchIcon: iconUrl("/icons/loja-192.png"),
    favicon: iconUrl("/icons/loja-192.png"),
    icons: LOJA_FALLBACK_ICONS,
  };
}

export function buildWebManifest(config: PwaManifestConfig) {
  return {
    id: config.id,
    name: config.name,
    short_name: config.shortName,
    description: config.description,
    start_url: config.startUrl,
    scope: config.scope,
    display: "standalone" as const,
    orientation: "portrait-primary" as const,
    background_color: config.backgroundColor,
    theme_color: config.themeColor,
    lang: "pt-BR",
    dir: "ltr" as const,
    icons: config.icons,
  };
}

/**
 * True se urlPath esta dentro do scope do manifesto.
 * Aceita start_url sem barra final com scope "…/" (ex.: /admin dentro de /admin/).
 */
export function isPathWithinManifestScope(urlPath: string, scope: string): boolean {
  if (!scope || scope === "/") return true;
  const path = urlPath.split("?")[0] || "/";
  if (scope.endsWith("/")) {
    const base = scope.slice(0, -1);
    return path === base || path.startsWith(scope);
  }
  return path === scope || path.startsWith(`${scope}/`);
}
