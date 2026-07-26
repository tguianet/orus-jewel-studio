import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePwaInstall } from "@/contexts/PwaInstallContext";
import { PwaInstallInstructions } from "@/components/system/PwaInstallInstructions";

type Props = {
  variant?: "gold" | "outline" | "ghost" | "default" | "secondary";
  size?: "sm" | "default" | "lg";
  className?: string;
};

/** Botão próprio de instalação — nunca aparece se o app já estiver instalado. */
export function PwaInstallButton({ variant = "outline", size = "sm", className }: Props) {
  const { canShowButton, label, canPrompt, promptInstall, instructions } = usePwaInstall();
  const [open, setOpen] = useState(false);

  if (!canShowButton || !label) return null;

  const onClick = async () => {
    if (canPrompt) {
      const outcome = await promptInstall();
      if (outcome === "unavailable") setOpen(true);
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => void onClick()}
      >
        <Download className="h-4 w-4" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>
              Siga os passos abaixo para adicionar o app à tela inicial.
            </DialogDescription>
          </DialogHeader>
          <PwaInstallInstructions instructions={instructions} />
        </DialogContent>
      </Dialog>
    </>
  );
}
