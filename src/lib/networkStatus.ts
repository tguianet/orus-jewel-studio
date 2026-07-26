import { AppError } from "@/lib/errors/AppError";

export function isBrowserOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

export function assertOnlineForCritical(operation: string): void {
  if (!isBrowserOnline()) {
    throw new AppError({
      code: "NETWORK_OFFLINE",
      operation,
      retryable: false,
    });
  }
}
