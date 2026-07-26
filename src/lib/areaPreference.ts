import type { AppRole } from "@/lib/safeRedirect";

export type AppArea = "admin" | "reseller";

const STORAGE_KEY = "amada-area-preference";

/** Preferência de navegação apenas — NÃO concede permissão. */
export function readAreaPreference(): AppArea | null {
  if (typeof window === "undefined") return null;
  try {
    const v = sessionStorage.getItem(STORAGE_KEY);
    if (v === "admin" || v === "reseller") return v;
  } catch {
    /* private mode */
  }
  return null;
}

export function writeAreaPreference(area: AppArea): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, area);
  } catch {
    /* ignore */
  }
}

export function clearAreaPreference(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function pathForArea(area: AppArea): string {
  return area === "admin" ? "/admin" : "/sacoleira";
}

export function areaFromPath(pathname: string): AppArea | null {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  if (pathname === "/sacoleira" || pathname.startsWith("/sacoleira/")) return "reseller";
  return null;
}

export function userHasBothRoles(roles: AppRole[]): boolean {
  return roles.includes("admin") && roles.includes("sacoleira");
}
