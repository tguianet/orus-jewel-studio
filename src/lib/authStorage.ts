const AUTH_TOKEN_KEY_PART = "auth-token";

const getAuthStorageKeys = (storage: Storage) => {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key?.startsWith("sb-") && key.includes(AUTH_TOKEN_KEY_PART)) keys.push(key);
  }
  return keys;
};

export const clearAuthStorage = () => {
  if (typeof window === "undefined") return;

  [window.localStorage, window.sessionStorage].forEach((storage) => {
    getAuthStorageKeys(storage).forEach((key) => storage.removeItem(key));
  });
};

export const isRefreshTokenError = (error: unknown) => {
  const value = error as { message?: string; code?: string; status?: number } | null;
  const message = String(value?.message ?? error ?? "").toLowerCase();
  const code = String(value?.code ?? "").toLowerCase();

  return (
    code === "refresh_token_not_found" ||
    message.includes("invalid refresh token") ||
    message.includes("refresh token not found")
  );
};