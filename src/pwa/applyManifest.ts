import { PWA_MANIFEST_APPLIED_EVENT } from "@/lib/pwaInstall";
import {
  buildWebManifest,
  getLojaManifestConfig,
  getPwaManifestConfig,
  lojaManifestPath,
  PWA_ASSET_VERSION,
  writeCachedLojaBranding,
  type LojaManifestBranding,
  type PwaManifestConfig,
} from "./manifestConfig";

const MANIFEST_LINK_ID = "pwa-manifest";
const APPLE_TOUCH_ICON_ID = "apple-touch-icon";
const FAVICON_LINK_ID = "app-favicon";
const THEME_COLOR_ID = "theme-color";
const APPLE_TITLE_ID = "apple-mobile-web-app-title";
const LOJA_MANIFEST_CACHE = "amada-pwa-loja-manifests-v1";

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

function absoluteIconSrc(origin: string, src: string): string {
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) {
    return src;
  }
  return `${origin}${src.startsWith("/") ? src : `/${src}`}`;
}

export function serializeWebManifest(config: PwaManifestConfig, origin = window.location.origin) {
  const base = buildWebManifest(config);
  return {
    ...base,
    // Paths relativos (preferidos) — id/scope/start_url sem capturar o dominio inteiro.
    id: config.id,
    start_url: base.start_url,
    scope: config.scope,
    icons: config.icons.map((icon) => ({
      ...icon,
      src: absoluteIconSrc(origin, icon.src),
    })),
  };
}

async function publishLojaManifestToCache(slug: string, manifestJson: string): Promise<string> {
  const path = lojaManifestPath(slug);
  if (typeof caches === "undefined") return path;
  try {
    const cache = await caches.open(LOJA_MANIFEST_CACHE);
    await cache.put(
      new Request(path, { credentials: "same-origin" }),
      new Response(manifestJson, {
        headers: {
          "Content-Type": "application/manifest+json; charset=utf-8",
          "Cache-Control": "no-cache",
        },
      }),
    );
  } catch {
    /* SW / Cache API indisponivel */
  }
  return path;
}

function setManifestHref(href: string, kind?: string) {
  const manifestLink = ensureLink(MANIFEST_LINK_ID, "manifest");
  manifestLink.href = href;
  manifestLink.setAttribute("data-pwa-href", href);
  if (kind) manifestLink.setAttribute("data-pwa-kind", kind);
  try {
    window.dispatchEvent(
      new CustomEvent(PWA_MANIFEST_APPLIED_EVENT, {
        detail: { href, kind: kind || null },
      }),
    );
  } catch {
    /* ignore */
  }
}

/**
 * Remove o link de manifesto (landing) para nao oferecer instalacao de dominio inteiro.
 */
function clearInstallableManifest() {
  revokeBlobUrl();
  const el = document.getElementById(MANIFEST_LINK_ID);
  if (el?.parentElement) el.parentElement.removeChild(el);
  lastAppliedKey = `cleared:${PWA_ASSET_VERSION}`;
}

/**
 * Aplica manifesto + metas imediatamente (antes do beforeinstallprompt).
 * Admin/Sacoleira: JSON estatico com scope dedicado.
 * Loja: manifesto dinamico por slug (blob + path /loja/:slug/manifest.webmanifest).
 */
export function applyPwaManifestForPath(pathname: string, branding?: LojaManifestBranding | null) {
  const kindHint = pathname.startsWith("/loja/")
    ? "loja"
    : pathname.startsWith("/admin") || pathname.startsWith("/login-admin")
      ? "admin"
      : pathname.startsWith("/sacoleira") || pathname.startsWith("/login-sacoleira")
        ? "sacoleira"
        : "default";

  let config: PwaManifestConfig;
  if (kindHint === "loja") {
    const slug = pathname.match(/^\/loja\/([^/]+)/)?.[1];
    if (!slug) {
      clearInstallableManifest();
      return;
    }
    if (branding) writeCachedLojaBranding({ ...branding, slug });
    config = getLojaManifestConfig(slug, branding);
  } else {
    config = getPwaManifestConfig(pathname);
  }

  if (config.kind === "default") {
    applyDocumentMeta(config);
    clearInstallableManifest();
    return;
  }

  const key = [
    PWA_ASSET_VERSION,
    config.kind,
    config.id,
    config.startUrl,
    config.scope,
    config.name,
    config.shortName,
    config.themeColor,
    config.icons.map((i) => i.src).join("|"),
  ].join(":");
  if (key === lastAppliedKey) return;
  lastAppliedKey = key;

  applyDocumentMeta(config);

  const origin = window.location.origin;
  const webManifest = serializeWebManifest(config, origin);
  const json = JSON.stringify(webManifest);

  revokeBlobUrl();

  if (config.kind === "admin" || config.kind === "sacoleira") {
    // Arquivo estatico versionado — identidade estavel; atualizacao do SW nao troca o manifesto.
    setManifestHref(
      config.manifestHref || `/manifests/manifest-${config.kind}.json`,
      config.kind,
    );
    return;
  }

  // Loja: blob garante JSON valido antes do SW; path logico fica no id/scope + cache.
  const blob = new Blob([json], { type: "application/manifest+json;charset=utf-8" });
  currentBlobUrl = URL.createObjectURL(blob);
  setManifestHref(currentBlobUrl, "loja");

  const slug = config.id.replace(/^\/loja\//, "");
  void publishLojaManifestToCache(slug, json).then((path) => {
    if (lastAppliedKey !== key) return;
    // Quando o SW controla a pagina, preferir URL estavel por slug.
    if (navigator.serviceWorker?.controller) {
      setManifestHref(path, "loja");
    }
  });
}

/** Atualiza branding da loja apos carregar nome/logo/tema. */
export function applyLojaPwaBranding(branding: LojaManifestBranding) {
  writeCachedLojaBranding(branding);
  applyPwaManifestForPath(`/loja/${branding.slug}`, branding);
}

/** Exposto para testes. */
export function resetPwaManifestApplyStateForTests() {
  lastAppliedKey = "";
  revokeBlobUrl();
}
