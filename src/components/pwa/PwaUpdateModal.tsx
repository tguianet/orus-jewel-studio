import { RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePwaUpdate } from "@/hooks/usePwaUpdate";

/**
 * Feedback temporário de auto-update.
 * Sem botões — o usuário não decide; o app atualiza sozinho.
 */
export function PwaUpdateModal() {
  const { showModal, title, description, state } = usePwaUpdate();

  return (
    <Dialog open={showModal}>
      <DialogContent
        className="max-w-sm [&>button]:hidden"
        data-testid="pwa-update-modal"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-gold-soft border border-primary/30">
            <RefreshCw className={`h-5 w-5 text-primary ${state.updating ? "animate-spin" : ""}`} />
          </div>
          <DialogTitle className="text-center font-display text-xl">{title}</DialogTitle>
          <DialogDescription className="text-center text-sm leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
