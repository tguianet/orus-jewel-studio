import { OrusLogo } from "@/components/OrusLogo";

/** Fallback visual Amada Amante para rotas lazy. */
export function RouteFallback({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-5 p-8">
      <div className="pointer-events-none absolute inset-0 bg-gradient-radial-gold opacity-30" aria-hidden />
      <OrusLogo size="sm" />
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-8 w-8 rounded-full border-2 border-muted border-t-primary animate-spin"
          aria-label={label}
        />
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
