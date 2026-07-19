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
  icons: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose: "any" | "maskable";
  }>;
};

const ADMIN_ICONS: PwaManifestConfig["icons"] = [
  { src: "/icons/admin-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
  { src: "/icons/admin-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
  { src: "/icons/admin-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
];

const SACOLEIRA_ICONS: PwaManifestConfig["icons"] = [
  { src: "/icons/sacoleira-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
  { src: "/icons/sacoleira-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
  { src: "/icons/sacoleira-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
];

const LOJA_ICONS: PwaManifestConfig["icons"] = [
  { src: "/icons/loja-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
  { src: "/icons/loja-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
  { src: "/icons/loja-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
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
      name: "Órus Admin",
      shortName: "Órus Admin",
      description: "Painel administrativo Órus — gestão de joias, sacoleiras e pedidos.",
      startUrl: "/login-admin",
      themeColor: "#1a1a1a",
      backgroundColor: "#0f0f0f",
      appleTouchIcon: "/icons/admin-192.png",
      icons: ADMIN_ICONS,
    };
  }

  if (kind === "sacoleira") {
    return {
      kind,
      name: "Órus Sacoleira",
      shortName: "Órus Sacoleira",
      description: "Painel da sacoleira Órus — loja, pedidos e rede de revenda.",
      startUrl: "/login-sacoleira",
      themeColor: "#8B6914",
      backgroundColor: "#1a1210",
      appleTouchIcon: "/icons/sacoleira-192.png",
      icons: SACOLEIRA_ICONS,
    };
  }

  if (kind === "loja") {
    const slug = extractLojaSlug(pathname);
    const startUrl = slug ? `/loja/${slug}` : "/loja";

    return {
      kind,
      name: "Loja Órus",
      shortName: "Loja Órus",
      description: "Loja virtual Órus — joias com identidade.",
      startUrl,
      themeColor: "#8B6914",
      backgroundColor: "#faf7f2",
      appleTouchIcon: "/icons/loja-192.png",
      icons: LOJA_ICONS,
    };
  }

  return {
    kind: "default",
    name: "Órus",
    shortName: "Órus",
    description: "Órus — Joias com identidade | SaaS de revenda",
    startUrl: "/",
    themeColor: "#8B6914",
    backgroundColor: "#0f0f0f",
    appleTouchIcon: "/icons/loja-192.png",
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
    display: "standalone",
    orientation: "portrait-primary",
    background_color: config.backgroundColor,
    theme_color: config.themeColor,
    lang: "pt-BR",
    dir: "ltr",
    icons: config.icons,
  };
}
