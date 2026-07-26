import type { AppError } from "@/lib/errors";

export function InlineError({ error }: { error: AppError | null }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
    >
      <p>{error.userMessage}</p>
      {(error.severity === "error" || error.severity === "critical") && (
        <p className="text-[11px] mt-1 font-mono opacity-80">Código: {error.correlationId}</p>
      )}
    </div>
  );
}
