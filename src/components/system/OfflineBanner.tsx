import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { WifiOff } from "lucide-react";
import {
  getOfflineBlockMessage,
  isOnline,
  requiresOnlineForPath,
} from "@/lib/pwaUpdate";

/**
 * Aviso offline. Em rotas sensíveis (checkout, admin, sacoleira, login),
 * bloqueia a interação com mensagem clara. Na loja pública, só informa.
 */
export function OfflineBanner() {
  const { pathname } = useLocation();
  const [online, setOnline] = useState(() => isOnline());

  useEffect(() => {
    const sync = () => setOnline(isOnline());
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    sync();
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (online) return null;

  const sensitive = requiresOnlineForPath(pathname);
  const message = getOfflineBlockMessage();

  if (sensitive) {
    return (
      <div
        className="fixed inset-0 z-[90] flex items-center justify-center bg-background/80 backdrop-blur-sm p-6"
        role="alert"
      >
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center space-y-4 shadow-lg">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <WifiOff className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Sem conexão</p>
          <p className="font-display text-2xl font-light">{message}</p>
          <p className="text-sm text-muted-foreground">
            Checkout, painel e operações financeiras precisam de internet. Pedidos não são sincronizados offline.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="sticky top-0 z-[80] border-b border-amber-500/30 bg-amber-500/15 px-4 py-2 text-center text-sm text-amber-950 dark:text-amber-100"
    >
      <span className="inline-flex items-center gap-2">
        <WifiOff className="h-3.5 w-3.5" />
        Você está offline. A loja pode mostrar conteúdo básico; conecte-se para comprar ou gerenciar.
      </span>
    </div>
  );
}
