// Helper para abrir conversa no WhatsApp via wa.me (sem API)
// Aceita números em qualquer formato; adiciona DDI 55 (Brasil) se faltar.

export const sanitizePhone = (phone?: string | null): string => {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
};

export const waLink = (phone?: string | null, message?: string): string => {
  const number = sanitizePhone(phone);
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${number}${text}`;
};

export const openWhatsApp = (phone?: string | null, message?: string) => {
  const url = waLink(phone, message);
  window.open(url, "_blank", "noopener,noreferrer");
};
