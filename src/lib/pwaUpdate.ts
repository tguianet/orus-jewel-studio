import {
  isSensitiveOnlinePath,
  OFFLINE_SENSITIVE_MESSAGE,
} from "@/lib/pwaCacheRules";

export {
  isApiUrl,
  isPublicCacheableImageUrl,
  isSensitiveOnlinePath,
  OFFLINE_SENSITIVE_MESSAGE,
  PWA_CACHE_STRATEGY_SUMMARY,
  shouldExcludeFromDataRuntimeCache,
} from "@/lib/pwaCacheRules";

export const PWA_RELOAD_GUARD_KEY = "amada_amante_pwa_reload_guard";
export const PWA_UPDATE_MESSAGE = "Uma nova versão do Amada Amante está disponível.";
export const PWA_CHECKOUT_UPDATE_CONFIRM =
  "Há um formulário preenchido. Atualizar agora vai recarregar a página e você pode perder o que digitou. Deseja continuar?";

export type PwaUpdateState = {
  needRefresh: boolean;
  dismissed: boolean;
  updating: boolean;
};

export type ApplyUpdateResult =
  | { ok: true }
  | { ok: false; reason: "no_updater" | "reload_guard" | "updating" | "cancelled" };

type Listener = (state: PwaUpdateState) => void;
type UpdateSW = (reloadPage?: boolean) => Promise<void>;

let state: PwaUpdateState = {
  needRefresh: false,
  dismissed: false,
  updating: false,
};

let updateSW: UpdateSW | null = null;
const listeners = new Set<Listener>();

function emit() {
  const snapshot = { ...state };
  listeners.forEach((l) => l(snapshot));
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
  state = { needRefresh: false, dismissed: false, updating: false };
  updateSW = null;
  listeners.clear();
  try {
    sessionStorage.removeItem(PWA_RELOAD_GUARD_KEY);
  } catch {
    // ignore
  }
}

/** A — nova versão detectada */
export function notifyNeedRefresh() {
  state = {
    needRefresh: true,
    dismissed: false,
    updating: false,
  };
  emit();
}

/** C — botão Depois */
export function dismissPwaUpdate() {
  state = {
    ...state,
    needRefresh: false,
    dismissed: true,
    updating: false,
  };
  emit();
}

export function clearReloadGuard(storage: Storage = sessionStorage) {
  try {
    storage.removeItem(PWA_RELOAD_GUARD_KEY);
  } catch {
    // ignore
  }
}

/**
 * D — evita reload infinito: só permite um ciclo de reload controlado.
 * Retorna false se um reload já foi iniciado nesta sessão de atualização.
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

/** E — checkout preenchido exige confirmação */
export function shouldConfirmBeforeUpdate(opts: {
  pathname: string;
  hasFilledForm: boolean;
}): boolean {
  return opts.pathname.toLowerCase().includes("/checkout") && opts.hasFilledForm;
}

export function requiresOnlineForPath(pathname: string): boolean {
  return isSensitiveOnlinePath(pathname);
}

export function getOfflineBlockMessage(): string {
  return OFFLINE_SENSITIVE_MESSAGE;
}

/**
 * B — atualizar agora chama updateSW(true) uma vez, com guard anti-loop.
 * Se `confirm` for false, cancela (fluxo de confirmação no UI).
 */
export async function applyPwaUpdate(opts?: {
  confirmed?: boolean;
  requireConfirm?: boolean;
}): Promise<ApplyUpdateResult> {
  if (state.updating) return { ok: false, reason: "updating" };
  if (!updateSW) return { ok: false, reason: "no_updater" };

  if (opts?.requireConfirm && opts.confirmed !== true) {
    return { ok: false, reason: "cancelled" };
  }

  if (!beginControlledReload()) {
    return { ok: false, reason: "reload_guard" };
  }

  state = { ...state, updating: true, needRefresh: false };
  emit();

  try {
    await updateSW(true);
    // Em produção a página recarrega; se não, libera "updating" e mantém o guard anti-loop.
    state = { ...state, updating: false };
    emit();
    return { ok: true };
  } catch {
    clearReloadGuard();
    state = { ...state, updating: false, needRefresh: true };
    emit();
    return { ok: false, reason: "no_updater" };
  }
}

export function isOnline(nav: Pick<Navigator, "onLine"> = navigator): boolean {
  return nav.onLine !== false;
}
