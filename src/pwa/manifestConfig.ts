/** Versao de assets PWA - bust de cache de icones/manifestos. */
export const PWA_ASSET_VERSION = "20260722b";

export type PwaAppKind = "admin" | "sacoleira" | "loja" | "default";

export type PwaManifestConfig = {
  kind: PwaAppKind;
  name: string;
  shortName: string;
  description: string;
  startUrl: string;
  themeColor: string;
  backgroundColor: string;
  appleTouchIcon: string;
  favicon: string;
  icons: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose: "any" | "maskable";
  }>;
};

function iconUrl(path: string): string {
  return `${path}?v=${PWA_ASSET_VERSION}`;
}

const ADMIN_ICONS: PwaManifestConfig["icons"] = [
  { src: iconUrl("/icons/admin-192.png"), sizes: "192x192", type: "image/png", purpose: "any" },
  { src: iconUrl("/icons/admin-512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
  {
    src: iconUrl("/icons/admin-maskable-512.png"),
    sizes: "512x512",
    type: "image/png",
    purpose: "maskable",
  },
];

const SACOLEIRA_ICONS: PwaManifestConfig["icons"] = [
  { src: iconUrl("/icons/sacoleira-192.png"), sizes: "192x192", type: "image/png", purpose: "any" },
  { src: iconUrl("/icons/sacoleira-512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
  {
    src: iconUrl("/icons/sacoleira-maskable-512.png"),
    sizes: "512x512",
    type: "image/png",
    purpose: "maskable",
  },
];

const LOJA_ICONS: PwaManifestConfig["icons"] = [
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
  return match?.[1] ?? null;
}

export function getPwaManifestConfig(pathname: string): PwaManifestConfig {
  const kind = resolvePwaKind(pathname);

  if (kind === "admin") {
    return {
      kind,
      name: "Amada Amante Admin",
      shortName: "Admin",
      description: "Painel administrativo Amada Amante",
      startUrl: "/login-admin",
      themeColor: "#C1186E",
      backgroundColor: "#ffffff",
      appleTouchIcon: iconUrl("/icons/admin-192.png"),
      favicon: iconUrl("/icons/admin-192.png"),
      icons: ADMIN_ICONS,
    };
  }

  if (kind === "sacoleira") {
    return {
      kind,
      name: "Amada Amante Sacoleira",
      shortName: "Sacoleira",
      description: "Painel da sacoleira Amada Amante \u2014 loja, pedidos e rede de revenda.",
      startUrl: "/login-sacoleira",
      themeColor: "#C1186E",
      backgroundColor: "#ffffff",
      appleTouchIcon: iconUrl("/icons/sacoleira-192.png"),
      favicon: iconUrl("/icons/sacoleira-192.png"),
      icons: SACOLEIRA_ICONS,
    };
  }

  if (kind === "loja") {
    const slug = extractLojaSlug(pathname);
    const startUrl = slug ? `/loja/${slug}` : "/loja";

    return {
      kind,
      name: "Amada Amante",
      shortName: "Amada Amante",
      description: "Loja virtual Amada Amante",
      startUrl,
      themeColor: "#C1186E",
      backgroundColor: "#ffffff",
      appleTouchIcon: iconUrl("/icons/loja-192.png"),
      favicon: iconUrl("/icons/loja-192.png"),
      icons: LOJA_ICONS,
    };
  }

  // Landing e rotas genericas: marca Amada Amante (nao competir com os 3 apps).
  return {
    kind: "default",
    name: "Amada Amante",
    shortName: "Amada Amante",
    description: "Loja virtual Amada Amante",
    startUrl: "/",
    themeColor: "#C1186E",
    backgroundColor: "#ffffff",
    appleTouchIcon: iconUrl("/icons/loja-192.png"),
    favicon: iconUrl("/icons/loja-192.png"),
    icons: LOJA_ICONS,
  };
}

export function buildWebManifest(config: PwaManifestConfig) {
  return {
    id: config.startUrl,
    name: config.name,
    short_name: config.shortName,
    description: config.description,
    start_url: config.startUrl,
    scope: "/",
    display: "standalone" as const,
    orientation: "portrait-primary" as const,
    background_color: config.backgroundColor,
    theme_color: config.themeColor,
    lang: "pt-BR",
    dir: "ltr" as const,
    icons: config.icons,
  };
}