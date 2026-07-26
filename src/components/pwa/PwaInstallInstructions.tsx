import { usePwaInstall } from "@/hooks/usePwaInstall";
import { PwaInstallInstructions as SystemPwaInstallInstructions } from "@/components/system/PwaInstallInstructions";

type Props = {
  className?: string;
  forceMessage?: string | null;
};

/** Compat: instruções manuais (settings/loja) sem duplicar a lógica do system. */
export function PwaInstallInstructions({ className, forceMessage }: Props) {
  const { needsManual, canShowButton, standalone, instructions } = usePwaInstall();

  if (standalone) return null;

  if (forceMessage) {
    return (
      <p
        className={className || "text-xs text-muted-foreground leading-relaxed"}
        data-testid="pwa-install-instructions"
      >
        {forceMessage}
      </p>
    );
  }

  if (!canShowButton || !needsManual) return null;

  return (
    <SystemPwaInstallInstructions instructions={instructions} className={className} />
  );
}
