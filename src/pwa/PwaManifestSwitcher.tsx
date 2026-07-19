import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { applyPwaManifestForPath } from "./applyManifest";

/**
 * Mantém o manifesto PWA alinhado à rota atual (Admin / Sacoleira / Loja).
 */
export function PwaManifestSwitcher() {
  const { pathname } = useLocation();

  useEffect(() => {
    applyPwaManifestForPath(pathname);
  }, [pathname]);

  return null;
}
