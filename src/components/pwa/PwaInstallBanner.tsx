import { Download, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { PwaInstallInstructions } from "@/components/pwa/PwaInstallInstructions";
import { toast } from "sonner";

/**
 * Banner opcional de instalação (não montado no App — o Fab cobre o CTA global).
 * Mantido para reuso em layouts sem duplicar providers.
 */
export function PwaInstallBanner() {
  const { canShowButton, label, promptInstall, canPrompt, needsManual, area } = usePwaInstall();
  const [hidden, setHidden] = useState(false);

  if (hidden || !area || !canShowButton || !label) return null;

  const onInstall = async () => {
    if (!canPrompt) {
      toast.message("Como instalar", {
        description: "Siga as instruções para adicionar o app à tela inicial.",
      });
      return;
    }
    const outcome = await promptInstall();
    if (outcome === "accepted") toast.success("App instalado!");
  };

  return (
    <div
      role="region"
      aria-label="Instalar aplicativo"
      className="fixed bottom-4 inset-x-4 z-[90] mx-auto max-w-lg rounded-xl border border-primary/30 bg-background/95 shadow-lg backdrop-blur-md p-4"
      data-testid="pwa-install-banner"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-gold-soft border border-primary/30">
          <Download className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Acesse mais rápido pela tela inicial.
            </p>
          </div>
          {needsManual && <PwaInstallInstructions />}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="gold" size="sm" onClick={() => void onInstall()}>
              Instalar
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setHidden(true)}>
              Agora não
            </Button>
          </div>
        </div>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground"
          aria-label="Fechar"
          onClick={() => setHidden(true)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
