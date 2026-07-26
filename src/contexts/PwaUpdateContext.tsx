import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import {
  applyPwaUpdate,
  dismissPwaUpdate,
  getPwaUpdateState,
  isCriticalOperationPath,
  pageHasFilledForm,
  shouldConfirmBeforeUpdate,
  subscribePwaUpdate,
  type ApplyUpdateResult,
  type PwaUpdateState,
} from "@/lib/pwaUpdate";

export type PwaUpdateValue = PwaUpdateState & {
  /** Rota atual é operação crítica (checkout, saque, devolução…). */
  criticalPath: boolean;
  needsConfirm: boolean;
  update: (confirmed?: boolean) => Promise<ApplyUpdateResult>;
  dismiss: () => void;
};

const PwaUpdateContext = createContext<PwaUpdateValue | null>(null);

export function PwaUpdateProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [state, setState] = useState<PwaUpdateState>(() => getPwaUpdateState());

  useEffect(() => subscribePwaUpdate(setState), []);

  const value = useMemo<PwaUpdateValue>(() => {
    const criticalPath = isCriticalOperationPath(pathname);
    const needsConfirm = shouldConfirmBeforeUpdate({
      pathname,
      hasFilledForm: typeof document === "undefined" ? false : pageHasFilledForm(),
    });
    return {
      ...state,
      criticalPath,
      needsConfirm,
      update: (confirmed?: boolean) =>
        needsConfirm
          ? applyPwaUpdate({ requireConfirm: true, confirmed })
          : applyPwaUpdate(),
      dismiss: dismissPwaUpdate,
    };
  }, [state, pathname]);

  return <PwaUpdateContext.Provider value={value}>{children}</PwaUpdateContext.Provider>;
}

export function usePwaUpdate(): PwaUpdateValue {
  const ctx = useContext(PwaUpdateContext);
  if (!ctx) throw new Error("usePwaUpdate must be used inside PwaUpdateProvider");
  return ctx;
}
