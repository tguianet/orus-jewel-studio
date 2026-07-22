import {
  buildWebManifest,
  getPwaManifestConfig,
  PWA_ASSET_VERSION,
  type PwaManifestConfig,
} from "./manifestConfig";

const MANIFEST_LINK_ID = "pwa-manifest";
const APPLE_TOUCH_ICON_ID = "apple-touch-icon";
const FAVICON_LINK_ID = "app-favicon";
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

  const favicon = ensureLink(FAVICON_LINK_ID, "icon");
  favicon.type = "image/png";
  favicon.setAttribute("sizes", "192x192");
  favicon.href = config.favicon;

  // Remove favicons genericos/antigos que possam competir.
  document
    .querySelectorAll('link[rel="icon"]:not(#' + FAVICON_LINK_ID + "), link[rel='shortcut icon']")
    .forEach((node) => node.parentElement?.removeChild(node));

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
 * Aplica manifesto + metas imediatamente (antes do beforeinstallprompt).
 * Todos os apps usam blob dinamico para nao competir com JSON estatico antigo em cache.
 */
export function applyPwaManifestForPath(pathname: string) {
  const config = getPwaManifestConfig(pathname);
  const key = `${PWA_ASSET_VERSION}:${config.kind}:${config.startUrl}:${config.name}:${config.shortName}`;
  if (key === lastAppliedKey) return;
  lastAppliedKey = key;

  applyDocumentMeta(config);

  const manifestLink = ensureLink(MANIFEST_LINK_ID, "manifest");
  revokeBlobUrl();

  const origin = window.location.origin;
  const webManifest = {
    ...buildWebManifest(config),
    id: `${origin}${config.startUrl}`,
    start_url: `${origin}${config.startUrl}`,
    scope: `${origin}/`,
    icons: config.icons.map((icon) => ({
      ...icon,
      src: icon.src.startsWith("http") ? icon.src : `${origin}${icon.src}`,
    })),
  };

  const json = JSON.stringify(webManifest);
  const blob = new Blob([json], { type: "application/manifest+json;charset=utf-8" });
  currentBlobUrl = URL.createObjectURL(blob);
  manifestLink.href = currentBlobUrl;
}