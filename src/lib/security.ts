export const normalizeSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 60);

export const sanitizeText = (value: string, maxLength = 500) => {
  let cleaned = "";
  for (const ch of value.replace(/[<>]/g, "")) {
    const code = ch.charCodeAt(0);
    if (code >= 32 && code !== 127) cleaned += ch;
  }
  return cleaned.trim().slice(0, maxLength);
};

export const sanitizePhone = (value: string) => value.replace(/\D/g, "").slice(0, 14);

export const sanitizeInstagram = (value: string) =>
  value
    .replace(/^@/, "")
    .replace(/[^a-zA-Z0-9._]/g, "")
    .slice(0, 30);

export const isSafeImageFile = (file: File) => {
  const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
  return allowed.has(file.type) && file.size <= 5 * 1024 * 1024;
};

export const assertOwnStore = (actualStoreId?: string | null, expectedStoreId?: string | null) => {
  if (!actualStoreId || !expectedStoreId || actualStoreId !== expectedStoreId) {
    throw new Error("Acesso negado para esta loja.");
  }
};
