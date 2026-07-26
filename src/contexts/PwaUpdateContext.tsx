import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocation } from "react-router-dom";
import {
  beginCriticalOperation,
  isCriticalOperationActive,
  PWA_CRITICAL_BLOCK_MESSAGE,
  shouldBlockPwaUpdate,
  subscribeCriticalOperations,
} from "@/lib/pwaCriticalOps";
import {
  getPwaUpdateState,
  pageHasFilledForm,
  PWA_UPDATE_MESSAGE,
  PWA_UPDATE_TITLE,
  subscribePwaUpdate,
  tryAutoApplyUpdate,
  type ApplyUpdateResult,
  type PwaUpdateState,
} from "@/lib/pwaUpdate";
import { getAppVersion } from "@/lib/pwaInstall";

export type PwaUpdateValue = {
  state: PwaUpdateState;
  /** Feedback temporário "Atualizando…" — sem decisão do usuário */
  showModal: boolean;
  title: string;
  description: string;
  version: string;
  criticalBlocked: boolean;
  criticalMessage: string;
  /** @deprecated autoUpdate — no-op */
  dismiss: () => void;
  /** @deprecated autoUpdate — tenta flush automático */
  updateNow: () => Promise<ApplyUpdateResult>;
  beginCritical: (label?: string) => () => void;
};

const PwaUpdateContext = createContext<PwaUpdateValue | null>(null);

export function PwaUpdateProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [state, setState] = useState<PwaUpdateState>(() => getPwaUpdateState());
  const [criticalActive, setCriticalActive] = useState(() => isCriticalOperationActive());

  useEffect(() => subscribePwaUpdate(setState), []);
  useEffect(
    () =>
      subscribeCriticalOperations(() => {
        setCriticalActive(isCriticalOperationActive());
        if (!isCriticalOperationActive()) {
          void tryAutoApplyUpdate();
        }
      }),
    [],
  );

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") void tryAutoApplyUpdate();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, []);

  const hasFilledForm = typeof document !== "undefined" ? pageHasFilledForm() : false;
  const criticalBlocked = shouldBlockPwaUpdate({
    pathname,
    hasFilledForm,
    criticalActive,
  });

  const dismiss = useCallback(() => {
    /* autoUpdate: sem decisão do usuário */
  }, []);

  const updateNow = useCallback(async () => tryAutoApplyUpdate(), []);

  const beginCritical = useCallback((label?: string) => beginCriticalOperation(label), []);

  // Só feedback visual durante o reload — sem botões.
  const showModal = Boolean(state.updating);

  const value = useMemo<PwaUpdateValue>(
    () => ({
      state,
      showModal,
      title: PWA_UPDATE_TITLE,
      description: PWA_UPDATE_MESSAGE,
      version: state.version || getAppVersion(),
      criticalBlocked,
      criticalMessage: PWA_CRITICAL_BLOCK_MESSAGE,
      dismiss,
      updateNow,
      beginCritical,
    }),
    [state, showModal, criticalBlocked, dismiss, updateNow, beginCritical],
  );

  return <PwaUpdateContext.Provider value={value}>{children}</PwaUpdateContext.Provider>;
}

export function usePwaUpdateContext() {
  const ctx = useContext(PwaUpdateContext);
  if (!ctx) {
    throw new Error("usePwaUpdateContext deve ser usado dentro de PwaUpdateProvider");
  }
  return ctx;
}

export function usePwaUpdate(): PwaUpdateValue {
  return usePwaUpdateContext();
}
