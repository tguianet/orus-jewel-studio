import {
  isSensitiveOnlinePath,
  OFFLINE_SENSITIVE_MESSAGE,
} from "@/lib/pwaCacheRules";
import { getAppVersion } from "@/lib/pwaInstall";
import {
  isCriticalOperationActive,
  PWA_CRITICAL_BLOCK_MESSAGE,
  shouldBlockPwaUpdate,
  subscribeCriticalOperations,
} from "@/lib/pwaCriticalOps";

export {
  isApiUrl,
  isPublicCacheableImageUrl,
  isSensitiveOnlinePath,
  OFFLINE_SENSITIVE_MESSAGE,
  PWA_CACHE_STRATEGY_SUMMARY,
  shouldExcludeFromDataRuntimeCache,
} from "@/lib/pwaCacheRules";

export { PWA_CRITICAL_BLOCK_MESSAGE };

export const PWA_RELOAD_GUARD_KEY = "amada_amante_pwa_reload_guard";
export const PWA_UPDATE_MESSAGE = "Atualizando o aplicativo…";
export const PWA_UPDATE_TITLE = "Atualizando o aplicativo…";
/** @deprecated mantido para testes de path sensível */
export const PWA_CHECKOUT_UPDATE_CONFIRM =
  "Há um formulário preenchido. Atualizar agora vai recarregar a página e você pode perder o que digitou. Deseja continuar?";

export type PwaUpdateState = {
  /** Há versão nova detectada / aguardando reload */
  pending: boolean;
  /** Mostra feedback "Atualizando…" (sem botões) */
  updating: boolean;
  /** Reload aguardando fim de operação crítica */
  waitingCritical: boolean;
  version: string;
  /** Compat: true quando há update em andamento ou aguardando (UI legada) */
  needRefresh: boolean;
  dismissed: boolean;
};

export type ApplyUpdateResult =
  | { ok: true }
  | {
      ok: false;
      reason: "no_updater" | "reload_guard" | "updating" | "cancelled" | "critical";
      message?: string;
    };

type Listener = (state: PwaUpdateState) => void;
type UpdateSW = (reloadPage?: boolean) => Promise<void>;

let state: PwaUpdateState = {
  pending: false,
  updating: false,
  waitingCritical: false,
  version: getAppVersion(),
  needRefresh: false,
  dismissed: false,
};

let updateSW: UpdateSW | null = null;
let deferredControllerReload = false;
let controllerListenerBound = false;
let criticalSubBound = false;
const listeners = new Set<Listener>();

function emit() {
  const snapshot = { ...state };
  listeners.forEach((l) => l(snapshot));
}

function setState(patch: Partial<PwaUpdateState>) {
  state = { ...state, ...patch };
  emit();
}

export function getPwaUpdateState(): PwaUpdateState {
  return { ...state };
}

export function subscribePwaUpdate(listener: Listener): () => void {
  listeners.add(listener);
  listener(getPwaUpdateState());
  return () => {
    listeners.delete(listener);
  };
}

export function bindPwaUpdater(fn: UpdateSW | null) {
  updateSW = fn;
}

export function resetPwaUpdateControllerForTests() {
  state = {
    pending: false,
    updating: false,
    waitingCritical: false,
    version: getAppVersion(),
    needRefresh: false,
    dismissed: false,
  };
  updateSW = null;
  deferredControllerReload = false;
  listeners.clear();
  try {
    sessionStorage.removeItem(PWA_RELOAD_GUARD_KEY);
  } catch {
    // ignore
  }
}

export function clearReloadGuard(storage: Storage = sessionStorage) {
  try {
    storage.removeItem(PWA_RELOAD_GUARD_KEY);
  } catch {
    // ignore
  }
}

/**
 * Evita reload infinito: só permite um ciclo de reload controlado por sessão de update.
 */
export function beginControlledReload(storage: Storage = sessionStorage): boolean {
  try {
    if (storage.getItem(PWA_RELOAD_GUARD_KEY) === "1") {
      return false;
    }
    storage.setItem(PWA_RELOAD_GUARD_KEY, "1");
    return true;
  } catch {
    return true;
  }
}

/** Liberar o guard após a página carregar com o novo SW. */
export function releaseReloadGuardOnBoot(storage: Storage = sessionStorage) {
  try {
    if (storage.getItem(PWA_RELOAD_GUARD_KEY) === "1") {
      storage.removeItem(PWA_RELOAD_GUARD_KEY);
    }
  } catch {
    // ignore
  }
}

export function pageHasFilledForm(root: ParentNode = document): boolean {
  const fields = root.querySelectorAll("input, textarea, select");
  for (const el of Array.from(fields)) {
    if (el instanceof HTMLInputElement) {
      if (el.type === "hidden" || el.type === "submit" || el.type === "button") continue;
      if (el.type === "checkbox" || el.type === "radio") {
        if (el.checked) return true;
        continue;
      }
      if (el.value.trim()) return true;
      continue;
    }
    if (el instanceof HTMLTextAreaElement && el.value.trim()) return true;
    if (el instanceof HTMLSelectElement && el.value.trim()) return true;
  }
  return false;
}

export const PWA_CRITICAL_PATH_PATTERNS = [
  "/checkout",
  "/carrinho",
  "/pagamento",
  "/saques",
  "/withdrawals",
  "/devolucoes",
  "/trocas",
];

export function isCriticalOperationPath(pathname: string): boolean {
  const p = String(pathname || "").toLowerCase();
  return PWA_CRITICAL_PATH_PATTERNS.some((frag) => p.includes(frag));
}

/** Operação crítica em andamento exige confirmação (formulário preenchido). */
export function shouldConfirmBeforeUpdate(opts: {
  pathname: string;
  hasFilledForm: boolean;
}): boolean {
  return isCriticalOperationPath(opts.pathname) && opts.hasFilledForm;
}

export function requiresOnlineForPath(pathname: string): boolean {
  return isSensitiveOnlinePath(pathname);
}

export function getOfflineBlockMessage(): string {
  return OFFLINE_SENSITIVE_MESSAGE;
}

function isBlockedNow(pathname?: string, hasFilledForm?: boolean): boolean {
  return shouldBlockPwaUpdate({
    pathname: pathname || (typeof window !== "undefined" ? window.location.pathname : "/"),
    hasFilledForm: hasFilledForm ?? (typeof document !== "undefined" ? pageHasFilledForm() : false),
    criticalActive: isCriticalOperationActive(),
  });
}

/** Recarrega no máximo uma vez; não limpa storage. */
export function safeReloadOnce(): boolean {
  if (!beginControlledReload()) return false;
  setState({
    updating: true,
    pending: true,
    waitingCritical: false,
    needRefresh: true,
    dismissed: false,
  });
  try {
    window.location.reload();
  } catch {
    clearReloadGuard();
    setState({ updating: false });
    return false;
  }
  return true;
}

/**
 * Nova versão detectada (marca pending).
 * Quem aplica é tryAutoApplyUpdate / registerPwa / PwaUpdateProvider.
 */
export function notifyNeedRefresh() {
  setState({
    pending: true,
    needRefresh: true,
    dismissed: false,
    version: getAppVersion(),
  });
}

/** Compat no-op: autoUpdate não tem "Agora não". */
export function dismissPwaUpdate() {
  // Mantém pending para flush posterior — não descarta a atualização.
  setState({
    needRefresh: false,
    dismissed: true,
    pending: true,
  });
}

/** Compat: reavalia auto-apply (ex.: foco/visibility). */
export function reopenPwaUpdateIfDue() {
  if (!state.pending || state.updating) return;
  void tryAutoApplyUpdate();
}

/**
 * Ativa SW novo e recarrega uma vez, sem limpar login/carrinho.
 * Bloqueia durante operação crítica (fica waitingCritical).
 */
export async function applyPwaUpdate(opts?: {
  confirmed?: boolean;
  requireConfirm?: boolean;
  pathname?: string;
  hasFilledForm?: boolean;
  allowCritical?: boolean;
}): Promise<ApplyUpdateResult> {
  if (state.updating && !opts?.allowCritical) {
    return { ok: false, reason: "updating" };
  }
  if (!updateSW) return { ok: false, reason: "no_updater" };

  if (opts?.requireConfirm && opts.confirmed !== true) {
    return { ok: false, reason: "cancelled" };
  }

  if (
    !opts?.allowCritical
    && isBlockedNow(opts?.pathname, opts?.hasFilledForm)
  ) {
    setState({
      pending: true,
      waitingCritical: true,
      needRefresh: true,
      dismissed: false,
    });
    return {
      ok: false,
      reason: "critical",
      message: PWA_CRITICAL_BLOCK_MESSAGE,
    };
  }

  if (!beginControlledReload()) {
    return { ok: false, reason: "reload_guard" };
  }

  setState({
    updating: true,
    pending: true,
    waitingCritical: false,
    needRefresh: true,
    dismissed: false,
  });

  try {
    // updateSW(true) ativa o SW e normalmente recarrega a página.
    await updateSW(true);
    setState({ updating: false, pending: false, needRefresh: false });
    return { ok: true };
  } catch {
    clearReloadGuard();
    setState({
      updating: false,
      pending: true,
      needRefresh: true,
      waitingCritical: false,
    });
    return {
      ok: false,
      reason: "no_updater",
      message: "Não foi possível atualizar agora. Tentaremos novamente em breve.",
    };
  }
}

/** Tenta auto-update agora; se crítico, marca waiting e espera. */
export async function tryAutoApplyUpdate(): Promise<ApplyUpdateResult> {
  if (!state.pending && !state.needRefresh) {
    return { ok: false, reason: "cancelled" };
  }
  if (isBlockedNow()) {
    setState({
      pending: true,
      waitingCritical: true,
      updating: false,
      needRefresh: true,
      dismissed: false,
    });
    ensureCriticalFlushSubscription();
    return {
      ok: false,
      reason: "critical",
      message: PWA_CRITICAL_BLOCK_MESSAGE,
    };
  }
  return applyPwaUpdate({ allowCritical: false });
}

function ensureCriticalFlushSubscription() {
  if (criticalSubBound || typeof window === "undefined") return;
  criticalSubBound = true;
  subscribeCriticalOperations(() => {
    if (isCriticalOperationActive()) return;
    if (deferredControllerReload) {
      deferredControllerReload = false;
      safeReloadOnce();
      return;
    }
    if (state.pending || state.waitingCritical) {
      void tryAutoApplyUpdate();
    }
  });
}

/**
 * controllerchange: recarrega 1x, ou adia se operação crítica.
 * Não faz unregister; não limpa storage.
 */
export function bindControllerChangeReload() {
  if (controllerListenerBound || typeof navigator === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  controllerListenerBound = true;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (isBlockedNow()) {
      deferredControllerReload = true;
      setState({
        pending: true,
        waitingCritical: true,
        updating: false,
        needRefresh: true,
      });
      ensureCriticalFlushSubscription();
      return;
    }
    safeReloadOnce();
  });

  ensureCriticalFlushSubscription();
}

export function isOnline(nav: Pick<Navigator, "onLine"> = navigator): boolean {
  return nav.onLine !== false;
}
