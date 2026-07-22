import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { applyPwaManifestForPath } from "./applyManifest";

/**
 * Mantem o manifesto PWA alinhado a rota atual (Admin / Sacoleira / Loja).
 */
export function PwaManifestSwitcher() {
  const { pathname } = useLocation();

  useEffect(() => {
    applyPwaManifestForPath(pathname);
  }, [pathname]);

  return null;
}