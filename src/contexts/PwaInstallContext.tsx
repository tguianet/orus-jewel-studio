import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import {
  detectInstallPlatform,
  installButtonLabel,
  isStandalone,
  manualInstallSteps,
  needsManualInstructions,
  resolveInstallArea,
  shouldShowInstallButton,
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
  installed: boolean;
  canPrompt: boolean;
  canShowButton: boolean;
  needsManual: boolean;
  instructions: ManualInstallSteps;
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
};

const PwaInstallContext = createContext<PwaInstallValue | null>(null);

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [standalone, setStandalone] = useState(() =>
    typeof window === "undefined" ? false : isStandalone(),
  );

  const platform = useMemo(
    () =>
      typeof navigator === "undefined"
        ? "unsupported"
        : detectInstallPlatform(navigator.userAgent, navigator.maxTouchPoints ?? 0),
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    let media: MediaQueryList | null = null;
    const onDisplayChange = () => setStandalone(isStandalone());
    try {
      media = window.matchMedia("(display-mode: standalone)");
      media.addEventListener?.("change", onDisplayChange);
    } catch {
      media = null;
    }

    setStandalone(isStandalone());

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      media?.removeEventListener?.("change", onDisplayChange);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return "unavailable" as const;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setDeferred(null);
      return choice.outcome;
    } catch {
      setDeferred(null);
      return "unavailable" as const;
    }
  }, [deferred]);

  const value = useMemo<PwaInstallValue>(() => {
    const area = resolveInstallArea(pathname);
    const label = installButtonLabel(pathname);
    const canPrompt = deferred !== null;
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
      promptInstall,
    };
  }, [pathname, deferred, installed, standalone, platform, promptInstall]);

  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>;
}

export function usePwaInstall(): PwaInstallValue {
  const ctx = useContext(PwaInstallContext);
  if (!ctx) throw new Error("usePwaInstall must be used inside PwaInstallProvider");
  return ctx;
}
