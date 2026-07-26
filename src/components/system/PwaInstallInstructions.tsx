import { usePwaInstall } from "@/contexts/PwaInstallContext";
import type { ManualInstallSteps } from "@/lib/pwaInstall";

export function PwaInstallInstructions({
  instructions,
  className,
}: {
  instructions?: ManualInstallSteps;
  className?: string;
}) {
  const ctx = usePwaInstall();
  const data = instructions ?? ctx.instructions;

  return (
    <div className={className}>
      <p className="text-sm font-medium text-foreground">{data.title}</p>
      <ol className="mt-2 space-y-1.5 text-sm text-muted-foreground list-decimal pl-5">
        {data.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </div>
  );
}
