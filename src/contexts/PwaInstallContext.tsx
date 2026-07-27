import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import {
  isCriticalOperationActive,
  subscribeCriticalOperations,
} from "@/lib/pwaCriticalOps";
import {
  clearInstallDismissed,
  clearLegacyInstallBlocks,
  detectInstallPlatform,
  installButtonLabel,
  isStandalone,
  manualInstallSteps,
  needsManualInstructions,
  onBeforeInstallPromptReceived,
  PWA_INSTALL_IOS_HINT,
  PWA_INSTALL_MODAL_DESCRIPTION,
  PWA_INSTALL_MODAL_TITLE,
  readInstallDismissed,
  resolveInstallArea,
  shouldShowInstallButton,
  shouldShowInstallModal,
  writeInstallDismissed,
  type BeforeInstallPromptEvent,
  type InstallableArea,
  type InstallPlatform,
  type ManualInstallSteps,
} from "@/lib/pwaInstall";

export type PwaInstallValue = {
  area: InstallableArea | null;
  label: string | null;
  platform: InstallPlatform;
  standalone: boolean;
  /** Somente memória — nunca localStorage permanente. */
  installed: boolean;
  canPrompt: boolean;
  canShowButton: boolean;
  needsManual: boolean;
  instructions: ManualInstallSteps;
  showModal: boolean;
  modalTitle: string;
  modalDescription: string;
  iosHint: string;
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
  dismissInstall: () => void;
};

const PwaInstallContext = createContext<PwaInstallValue | null>(null);

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(() =>
    typeof window === "undefined" ? false : readInstallDismissed(),
  );
  const [standalone, setStandalone] = useState(() =>
    typeof window === "undefined" ? false : isStandalone(),
  );
  const [criticalActive, setCriticalActive] = useState(() =>
    typeof window === "undefined" ? false : isCriticalOperationActive(),
  );
  const [modalOpen, setModalOpen] = useState(false);

  const deferredRef = useRef(deferred);
  const installedRef = useRef(installed);
  const pathnameRef = useRef(pathname);
  deferredRef.current = deferred;
  installedRef.current = installed;
  pathnameRef.current = pathname;

  const platform = useMemo(
    () =>
      typeof navigator === "undefined"
        ? "unsupported"
        : detectInstallPlatform(navigator.userAgent, navigator.maxTouchPoints ?? 0),
    [],
  );
  const platformRef = useRef(platform);
  platformRef.current = platform;

  const canPrompt = deferred !== null;

  const tryOpenModal = useCallback((opts?: {
    canPrompt?: boolean;
    installed?: boolean;
    dismissed?: boolean;
    criticalActive?: boolean;
    standalone?: boolean;
    pathname?: string;
  }) => {
    const nextStandalone = opts?.standalone ?? isStandalone();
    const nextDismissed = opts?.dismissed ?? readInstallDismissed();
    const nextCritical = opts?.criticalActive ?? isCriticalOperationActive();
    const nextCanPrompt = opts?.canPrompt ?? deferredRef.current !== null;
    const nextInstalled = opts?.installed ?? installedRef.current;
    const nextPath = opts?.pathname ?? pathnameRef.current;

    setStandalone(nextStandalone);
    setDismissed(nextDismissed);
    setCriticalActive(nextCritical);

    const eligible = shouldShowInstallModal({
      pathname: nextPath,
      standalone: nextStandalone,
      installed: nextInstalled,
      canPrompt: nextCanPrompt,
      platform: platformRef.current,
      dismissed: nextDismissed,
      criticalActive: nextCritical,
    });

    if (eligible) setModalOpen(true);
    else if (nextStandalone || nextInstalled || nextCritical) setModalOpen(false);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    clearLegacyInstallBlocks();

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      const bip = event as BeforeInstallPromptEvent;
      const plan = onBeforeInstallPromptReceived({ standalone: isStandalone() });

      if (plan.clearInstalled) {
        installedRef.current = false;
        setInstalled(false);
      }
      if (plan.clearDismissed) {
        clearInstallDismissed();
        setDismissed(false);
      }

      deferredRef.current = bip;
      setDeferred(bip);

      if (plan.openModal) {
        tryOpenModal({
          canPrompt: true,
          installed: false,
          dismissed: false,
          criticalActive: isCriticalOperationActive(),
          standalone: isStandalone(),
        });
      }
    };

    const onInstalled = () => {
      installedRef.current = true;
      setInstalled(true);
      deferredRef.current = null;
      setDeferred(null);
      setModalOpen(false);
      clearInstallDismissed();
      setDismissed(false);
    };

    const onResume = () => {
      tryOpenModal();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") onResume();
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("pageshow", onResume);
    window.addEventListener("focus", onResume);
    document.addEventListener("visibilitychange", onVisibility);

    let media: MediaQueryList | null = null;
    const onDisplayChange = () => tryOpenModal();
    try {
      media = window.matchMedia("(display-mode: standalone)");
      media.addEventListener?.("change", onDisplayChange);
    } catch {
      media = null;
    }

    // iOS / primeira carga: se já for elegível (manual), abre; senão espera BIP.
    tryOpenModal();

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("pageshow", onResume);
      window.removeEventListener("focus", onResume);
      document.removeEventListener("visibilitychange", onVisibility);
      media?.removeEventListener?.("change", onDisplayChange);
    };
  }, [tryOpenModal]);

  useEffect(() => {
    return subscribeCriticalOperations(() => {
      const active = isCriticalOperationActive();
      setCriticalActive(active);
      if (active) {
        setModalOpen(false);
        return;
      }
      tryOpenModal({ criticalActive: false });
    });
  }, [tryOpenModal]);

  // Troca de área (admin/sacoleira/loja): reavalia convite do manifesto atual.
  useEffect(() => {
    tryOpenModal({ pathname });
  }, [pathname, tryOpenModal]);

  const promptInstall = useCallback(async () => {
    const event = deferredRef.current;
    if (!event) return "unavailable" as const;

    // Mesmo BeforeInstallPromptEvent só pode ser usado uma vez.
    deferredRef.current = null;
    setDeferred(null);

    try {
      await event.prompt();
      const choice = await event.userChoice;
      if (choice.outcome === "accepted") {
        installedRef.current = true;
        setInstalled(true);
        setModalOpen(false);
        clearInstallDismissed();
        setDismissed(false);
      } else {
        setModalOpen(false);
        writeInstallDismissed();
        setDismissed(true);
      }
      return choice.outcome;
    } catch {
      return "unavailable" as const;
    }
  }, []);

  const dismissInstall = useCallback(() => {
    setModalOpen(false);
    writeInstallDismissed();
    setDismissed(true);
  }, []);

  const showModal = modalOpen && shouldShowInstallModal({
    pathname,
    standalone,
    installed,
    canPrompt,
    platform,
    dismissed,
    criticalActive,
  });

  const value = useMemo<PwaInstallValue>(() => {
    const area = resolveInstallArea(pathname);
    const label = installButtonLabel(pathname);
    return {
      area,
      label,
      platform,
      standalone,
      installed,
      canPrompt,
      canShowButton: shouldShowInstallButton({
        pathname,
        standalone,
        installed,
        canPrompt,
        platform,
      }),
      needsManual: !canPrompt && needsManualInstructions(platform),
      instructions: manualInstallSteps(platform, label ?? "o app"),
      showModal,
      modalTitle: PWA_INSTALL_MODAL_TITLE,
      modalDescription: PWA_INSTALL_MODAL_DESCRIPTION,
      iosHint: PWA_INSTALL_IOS_HINT,
      promptInstall,
      dismissInstall,
    };
  }, [
    pathname,
    platform,
    standalone,
    installed,
    canPrompt,
    showModal,
    promptInstall,
    dismissInstall,
  ]);

  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>;
}

export function usePwaInstall(): PwaInstallValue {
  const ctx = useContext(PwaInstallContext);
  if (!ctx) throw new Error("usePwaInstall must be used inside PwaInstallProvider");
  return ctx;
}
