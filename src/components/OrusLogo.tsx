import { cn } from "@/lib/utils";

interface Props { className?: string; showWord?: boolean; size?: "sm" | "md" | "lg" }

export const OrusLogo = ({ className, showWord = true, size = "md" }: Props) => {
  const sizes = { sm: "h-7", md: "h-9", lg: "h-12" };
  const text = { sm: "text-xl", md: "text-2xl", lg: "text-4xl" };
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className={cn("relative flex items-center justify-center aspect-square", sizes[size])}>
        <div className="absolute inset-0 rounded-full bg-gradient-gold opacity-90 shadow-gold" />
        <div className="absolute inset-[3px] rounded-full bg-background flex items-center justify-center">
          <span className="font-display font-semibold text-gold text-sm tracking-tight">A</span>
        </div>
      </div>
      {showWord && (
        <span className={cn("font-display font-light tracking-[0.3em] text-foreground", text[size])}>
          AURA
        </span>
      )}
    </div>
  );
};
