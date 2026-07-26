/** Formato: op_YYYYMMDD_xxxxxxxx */
export function createCorrelationId(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const suffix = randomSuffix(8);
  return `op_${y}${m}${d}_${suffix}`;
}

function randomSuffix(len: number): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID().replace(/-/g, "").slice(0, len);
    }
  } catch {
    // ignore
  }
  let out = "";
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < len; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function isCorrelationId(value: string | null | undefined): boolean {
  return /^op_\d{8}_[a-z0-9]{6,}$/i.test(String(value ?? ""));
}
