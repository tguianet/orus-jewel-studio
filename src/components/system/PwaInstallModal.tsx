import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePwaInstall } from "@/contexts/PwaInstallContext";

/**
 * Convite de instalação.
 * - Android/Desktop: exige beforeinstallprompt (prompt só no clique).
 * - iOS: instrução manual (sem BIP).
 */
export function PwaInstallModal() {
  const {
    showModal,
    modalTitle,
    modalDescription,
    iosHint,
    canPrompt,
    needsManual,
    promptInstall,
    dismissInstall,
  } = usePwaInstall();

  const onInstall = () => {
    if (!canPrompt) return;
    void promptInstall();
  };

  return (
    <Dialog
      open={showModal}
      onOpenChange={(open) => {
        if (!open) dismissInstall();
      }}
    >
      <DialogContent className="max-w-sm" data-testid="pwa-install-modal">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-gold-soft border border-primary/30">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <DialogTitle className="text-center font-display text-xl">{modalTitle}</DialogTitle>
          <DialogDescription className="text-center text-sm leading-relaxed">
            {modalDescription}
          </DialogDescription>
        </DialogHeader>

        {needsManual && (
          <p
            className="text-sm text-muted-foreground text-center leading-relaxed"
            data-testid="pwa-install-ios-hint"
          >
            {iosHint}
          </p>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {canPrompt && (
            <Button
              type="button"
              variant="gold"
              className="w-full"
              onClick={onInstall}
              data-testid="pwa-install-modal-accept"
            >
              Instalar app
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={dismissInstall}
            data-testid="pwa-install-modal-dismiss"
          >
            Agora não
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
