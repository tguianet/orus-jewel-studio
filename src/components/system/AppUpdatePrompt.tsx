import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  applyPwaUpdate,
  dismissPwaUpdate,
  getPwaUpdateState,
  pageHasFilledForm,
  PWA_CHECKOUT_UPDATE_CONFIRM,
  PWA_UPDATE_MESSAGE,
  shouldConfirmBeforeUpdate,
  subscribePwaUpdate,
  type PwaUpdateState,
} from "@/lib/pwaUpdate";

/**
 * Banner de nova versão do PWA.
 * Não atualiza sozinho no meio do checkout — pede confirmação se houver formulário preenchido.
 */
export function AppUpdatePrompt() {
  const { pathname } = useLocation();
  const [state, setState] = useState<PwaUpdateState>(() => getPwaUpdateState());

  useEffect(() => subscribePwaUpdate(setState), []);

  if (!state.needRefresh || state.dismissed) return null;

  const onUpdateNow = async () => {
    const hasFilledForm = pageHasFilledForm();
    const needsConfirm = shouldConfirmBeforeUpdate({ pathname, hasFilledForm });

    if (needsConfirm) {
      const ok = window.confirm(PWA_CHECKOUT_UPDATE_CONFIRM);
      if (!ok) return;
      await applyPwaUpdate({ requireConfirm: true, confirmed: true });
      return;
    }

    await applyPwaUpdate();
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 inset-x-4 z-[100] mx-auto max-w-lg rounded-xl border border-primary/30 bg-background/95 shadow-lg backdrop-blur-md p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-gold-soft border border-primary/30">
          <RefreshCw className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-primary mb-1">
              Amada Amante
            </p>
            <p className="text-sm sm:text-[15px] leading-relaxed text-foreground">
              {PWA_UPDATE_MESSAGE}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Atualize para ver a versão mais recente. A página será recarregada uma vez.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="gold"
              size="sm"
              disabled={state.updating}
              onClick={() => void onUpdateNow()}
            >
              {state.updating ? "Atualizando…" : "Atualizar agora"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={state.updating}
              onClick={() => dismissPwaUpdate()}
            >
              Depois
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
