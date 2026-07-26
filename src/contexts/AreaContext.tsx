import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  AppArea,
  areaFromPath,
  pathForArea,
  readAreaPreference,
  userHasBothRoles,
  writeAreaPreference,
} from "@/lib/areaPreference";

type AreaContextValue = {
  /** Área de UI atual (preferência). Autorização real continua no banco. */
  area: AppArea | null;
  setArea: (area: AppArea) => void;
  switchTo: (area: AppArea) => void;
  isAdminArea: boolean;
  isResellerArea: boolean;
  canSwitchAreas: boolean;
};

const AreaContext = createContext<AreaContextValue | null>(null);

export function AreaProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const roles = useMemo(() => profile?.roles ?? [], [profile?.roles]);
  const canSwitch = userHasBothRoles(roles);

  const [area, setAreaState] = useState<AppArea | null>(() => readAreaPreference());

  useEffect(() => {
    const fromPath = areaFromPath(location.pathname);
    if (fromPath) {
      setAreaState(fromPath);
      writeAreaPreference(fromPath);
    }
  }, [location.pathname]);

  const setArea = useCallback((next: AppArea) => {
    setAreaState(next);
    writeAreaPreference(next);
  }, []);

  const switchTo = useCallback(
    (next: AppArea) => {
      setArea(next);
      navigate(pathForArea(next));
    },
    [navigate, setArea],
  );

  const value = useMemo<AreaContextValue>(() => {
    const effective =
      area
      ?? areaFromPath(location.pathname)
      ?? (roles.includes("admin") && !roles.includes("sacoleira")
        ? "admin"
        : roles.includes("sacoleira")
          ? "reseller"
          : null);

    return {
      area: effective,
      setArea,
      switchTo,
      isAdminArea: effective === "admin",
      isResellerArea: effective === "reseller",
      canSwitchAreas: canSwitch,
    };
  }, [area, canSwitch, location.pathname, roles, setArea, switchTo]);

  return <AreaContext.Provider value={value}>{children}</AreaContext.Provider>;
}

export function useArea() {
  const ctx = useContext(AreaContext);
  if (!ctx) throw new Error("useArea must be used inside AreaProvider");
  return ctx;
}

/** Hook opcional (layouts fora do provider não quebram). */
export function useAreaOptional(): AreaContextValue | null {
  return useContext(AreaContext);
}
