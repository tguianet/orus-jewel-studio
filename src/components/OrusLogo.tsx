import { cn } from "@/lib/utils";
import brandMark from "@/assets/amada-amante-mark.png";

interface Props {
  className?: string;
  showWord?: boolean;
  size?: "sm" | "md" | "lg";
}

/**
 * Marca Amada Amante.
 * - Completa (símbolo + texto dourado): cabeçalhos, login, landing
 * - Só símbolo: ícones pequenos / preview compacto
 */
export const OrusLogo = ({ className, showWord = true, size = "md" }: Props) => {
  const sizes = { sm: "h-8", md: "h-10", lg: "h-14" };
  const text = { sm: "text-xl", md: "text-2xl", lg: "text-4xl" };

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <img
        src={brandMark}
        alt={showWord ? "Amada Amante" : ""}
        aria-hidden={!showWord}
        className={cn("w-auto object-contain", sizes[size])}
      />
      {showWord && (
        <span className={cn("font-display font-light tracking-[0.2em] text-gold", text[size])}>
          Amada Amante
        </span>
      )}
    </div>
  );
};
