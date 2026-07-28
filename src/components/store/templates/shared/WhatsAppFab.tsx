import { MessageCircle } from "lucide-react";

type Props = {
  phone?: string | null;
  storeName: string;
  large?: boolean;
};

export function WhatsAppFab({ phone, storeName, large }: Props) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return (
    <a
      href={`https://wa.me/${digits}?text=${encodeURIComponent(`Olá ${storeName}! Vi sua loja e gostaria de mais informações.`)}`}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar no WhatsApp"
      className={`fixed z-40 flex items-center gap-2 rounded-full bg-[#25D366] text-white shadow-[0_8px_30px_-8px_rgba(37,211,102,0.6)] hover:brightness-110 transition-all ${
        large ? "bottom-6 right-6 px-5 py-3.5 text-base" : "bottom-6 right-6 px-4 py-3 text-sm"
      }`}
    >
      <MessageCircle className={large ? "h-6 w-6" : "h-5 w-5"} />
      <span className="hidden @sm:inline font-medium">WhatsApp</span>
    </a>
  );
}
