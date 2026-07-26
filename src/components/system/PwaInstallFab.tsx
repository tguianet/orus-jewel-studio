import { PwaInstallButton } from "@/components/system/PwaInstallButton";
import { usePwaInstall } from "@/contexts/PwaInstallContext";

/** Botão flutuante de instalação — some quando o app já está instalado. */
export function PwaInstallFab() {
  const { canShowButton } = usePwaInstall();
  if (!canShowButton) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[90] print:hidden">
      <PwaInstallButton
        variant="gold"
        size="sm"
        className="shadow-lg rounded-full"
      />
    </div>
  );
}
