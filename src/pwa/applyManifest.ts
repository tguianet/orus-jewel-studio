import {
  buildWebManifest,
  getPwaManifestConfig,
  type PwaManifestConfig,
} from "./manifestConfig";

const MANIFEST_LINK_ID = "pwa-manifest";
const APPLE_TOUCH_ICON_ID = "apple-touch-icon";
const THEME_COLOR_ID = "theme-color";
const APPLE_TITLE_ID = "apple-mobile-web-app-title";

let currentBlobUrl: string | null = null;
let lastAppliedKey = "";

function ensureLink(id: string, rel: string): HTMLLinkElement {
  let el = document.getElementById(id) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.id = id;
    el.rel = rel;
    document.head.appendChild(el);
  }
  return el;
}

function ensureMeta(id: string, name: string): HTMLMetaElement {
  let el = document.getElementById(id) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.id = id;
    el.name = name;
    document.head.appendChild(el);
  }
  return el;
}

function revokeBlobUrl() {
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
  }
}

function applyDocumentMeta(config: PwaManifestConfig) {
  document.title = config.name;

  const theme = ensureMeta(THEME_COLOR_ID, "theme-color");
  theme.content = config.themeColor;

  const appleTitle = ensureMeta(APPLE_TITLE_ID, "apple-mobile-web-app-title");
  appleTitle.content = config.shortName;

  const appleIcon = ensureLink(APPLE_TOUCH_ICON_ID, "apple-touch-icon");
  appleIcon.href = config.appleTouchIcon;

  const appleCapable = ensureMeta("apple-mobile-web-app-capable", "apple-mobile-web-app-capable");
  appleCapable.content = "yes";

  const appleStatus = ensureMeta(
    "apple-mobile-web-app-status-bar-style",
    "apple-mobile-web-app-status-bar-style",
  );
  appleStatus.content = "black-translucent";

  const mobileCapable = ensureMeta("mobile-web-app-capable", "mobile-web-app-capable");
  mobileCapable.content = "yes";
}

/**
 * Troca o manifesto (e meta tags iOS/Android) conforme a rota atual.
 * Para a loja, gera um manifesto dinâmico com start_url = /loja/:slug.
 */
export function applyPwaManifestForPath(pathname: string) {
  const config = getPwaManifestConfig(pathname);
  const key = `${config.kind}:${config.startUrl}`;
  if (key === lastAppliedKey) return;
  lastAppliedKey = key;

  applyDocumentMeta(config);

  const manifestLink = ensureLink(MANIFEST_LINK_ID, "manifest");
  revokeBlobUrl();

  // Admin e Sacoleira usam arquivos estáticos; Loja usa blob com slug dinâmico.
  if (config.kind === "admin") {
    manifestLink.href = "/manifests/manifest-admin.json";
    return;
  }

  if (config.kind === "sacoleira") {
    manifestLink.href = "/manifests/manifest-sacoleira.json";
    return;
  }

  // URLs absolutas evitam resolução incorreta com blob: (start_url relativo ao manifesto).
  const origin = window.location.origin;
  const webManifest = {
    ...buildWebManifest(config),
    id: `${origin}${config.startUrl}`,
    start_url: `${origin}${config.startUrl}`,
    scope: `${origin}/`,
    icons: config.icons.map((icon) => ({
      ...icon,
      src: `${origin}${icon.src}`,
    })),
  };
  const blob = new Blob([JSON.stringify(webManifest)], { type: "application/manifest+json" });
  currentBlobUrl = URL.createObjectURL(blob);
  manifestLink.href = currentBlobUrl;
}
