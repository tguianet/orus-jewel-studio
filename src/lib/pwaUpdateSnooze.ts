import { getAppVersion } from "@/lib/pwaInstall";

export const PWA_UPDATE_SNOOZE_KEY = "amada_amante_pwa_update_snooze";
/** Reexibir após 4h ou na próxima abertura se o snooze expirou. */
export const PWA_UPDATE_SNOOZE_MS = 4 * 60 * 60 * 1000;

export type PwaUpdateSnooze = {
  version: string;
  until: number;
};

export function readUpdateSnooze(storage: Storage = localStorage): PwaUpdateSnooze | null {
  try {
    const raw = storage.getItem(PWA_UPDATE_SNOOZE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PwaUpdateSnooze;
    if (!parsed?.version || typeof parsed.until !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeUpdateSnooze(
  opts?: { version?: string; ms?: number },
  storage: Storage = localStorage,
): PwaUpdateSnooze {
  const payload: PwaUpdateSnooze = {
    version: opts?.version || getAppVersion(),
    until: Date.now() + (opts?.ms ?? PWA_UPDATE_SNOOZE_MS),
  };
  try {
    storage.setItem(PWA_UPDATE_SNOOZE_KEY, JSON.stringify(payload));
  } catch {
    /* private mode */
  }
  return payload;
}

export function clearUpdateSnooze(storage: Storage = localStorage) {
  try {
    storage.removeItem(PWA_UPDATE_SNOOZE_KEY);
  } catch {
    /* ignore */
  }
}

/** true = ainda no período "Agora não" para esta versão. */
export function isUpdateSnoozed(
  version = getAppVersion(),
  now = Date.now(),
  storage: Storage = localStorage,
): boolean {
  const s = readUpdateSnooze(storage);
  if (!s) return false;
  if (s.version !== version) return false;
  return now < s.until;
}
