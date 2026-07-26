import type { PaymentDetails, PayoutMethod } from "@/types/withdrawals";

export function maskDocument(doc: string | null | undefined): string {
  const d = String(doc ?? "").replace(/\D/g, "");
  if (!d) return "•••";
  if (d.length <= 4) return "•••" + d.slice(-1);
  if (d.length <= 11) {
    // CPF
    return `***.***.***-${d.slice(-2)}`;
  }
  // CNPJ
  return `**.***.***/****-${d.slice(-2)}`;
}

export function maskPixKey(key: string | null | undefined, keyType?: string): string {
  const raw = String(key ?? "").trim();
  if (!raw) return "••••";
  const type = (keyType || "").toLowerCase();
  if (type === "email" || raw.includes("@")) {
    const [user, domain] = raw.split("@");
    if (!domain) return "••••@••••";
    const u = user.length <= 2 ? "*" : `${user.slice(0, 2)}***`;
    return `${u}@${domain}`;
  }
  if (type === "phone" || /^\+?\d{10,}$/.test(raw.replace(/\D/g, ""))) {
    const digits = raw.replace(/\D/g, "");
    return `****${digits.slice(-4)}`;
  }
  if (type === "cpf" || type === "cnpj") return maskDocument(raw);
  // random / default
  if (raw.length <= 6) return "••••••";
  return `${raw.slice(0, 4)}…${raw.slice(-4)}`;
}

export function maskBankAccount(account: string | null | undefined): string {
  const a = String(account ?? "").replace(/\s/g, "");
  if (!a) return "••••";
  if (a.length <= 3) return "••••";
  return `••••${a.slice(-3)}`;
}

export function maskPaymentDetails(
  method: PayoutMethod,
  details: PaymentDetails | Record<string, unknown> | null | undefined,
): string {
  if (!details || typeof details !== "object") return method === "pix" ? "PIX" : "Transferência";
  const d = details as Record<string, unknown>;

  if (method === "pix") {
    const key = String(d.pix_key ?? "");
    const type = String(d.pix_key_type ?? "");
    return `PIX · ${maskPixKey(key, type)} · ${maskDocument(String(d.account_holder_document ?? ""))}`;
  }

  const bank = String(d.bank_name || d.bank_code || "Banco");
  return `TED · ${bank} · Ag ${String(d.agency ?? "••••")} · Cc ${maskBankAccount(String(d.account_number ?? ""))}`;
}

export function isSafeReceiptUrl(url: string | null | undefined): boolean {
  const u = String(url ?? "").trim();
  if (!u) return true;
  if (/^javascript:/i.test(u) || /^data:/i.test(u)) return false;
  try {
    const parsed = new URL(u);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
