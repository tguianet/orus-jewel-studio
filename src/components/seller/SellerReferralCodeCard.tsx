import { useState } from "react";
import { Check, Copy, MessageCircle, Network } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  buildReferralWhatsAppShareHref,
  REFERRAL_CODE_MISSING_MESSAGE,
  resolveOwnReferralCode,
} from "@/lib/referralCode";

type Props = {
  className?: string;
};

/**
 * Card do código de indicação da sacoleira logada.
 * Fonte: AuthContext → resellers.referral_code (sem fallback UUID).
 */
export function SellerReferralCodeCard({ className }: Props) {
  const { profile, loading: authLoading } = useAuth();
  const [copied, setCopied] = useState(false);

  const code = resolveOwnReferralCode(profile?.referralCode);
  const shareHref = code ? buildReferralWhatsAppShareHref(code) : null;

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Código copiado com sucesso.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  return (
    <div
      className={
        className
        || "mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5"
      }
      data-testid="seller-referral-code-card"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h3 className="font-display text-lg text-foreground">Seu código de indicação</h3>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
            Compartilhe este código para cadastrar novas sacoleiras na sua rede.
          </p>

          {authLoading ? (
            <p className="pt-1 font-mono text-sm text-muted-foreground" data-testid="seller-referral-code-loading">
              Carregando…
            </p>
          ) : code ? (
            <p
              className="pt-1 font-mono text-xl sm:text-2xl tracking-[0.2em] text-primary break-all"
              data-testid="seller-referral-code-value"
            >
              {code}
            </p>
          ) : (
            <p className="pt-1 text-sm text-muted-foreground" data-testid="seller-referral-code-missing">
              {REFERRAL_CODE_MISSING_MESSAGE}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full sm:w-auto sm:min-w-[11rem]">
          <Button
            type="button"
            size="sm"
            variant="goldOutline"
            className="w-full"
            disabled={!code || authLoading}
            onClick={() => void handleCopy()}
            data-testid="seller-referral-copy"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado" : "Copiar"}
          </Button>

          {shareHref ? (
            <a href={shareHref} target="_blank" rel="noreferrer" className="w-full">
              <Button
                type="button"
                size="sm"
                variant="whatsapp"
                className="w-full"
                data-testid="seller-referral-share"
              >
                <MessageCircle className="h-4 w-4" />
                Compartilhar
              </Button>
            </a>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="whatsapp"
              className="w-full"
              disabled
              data-testid="seller-referral-share"
            >
              <MessageCircle className="h-4 w-4" />
              Compartilhar
            </Button>
          )}

          <Button
            asChild
            type="button"
            size="sm"
            variant="ghost"
            className="w-full"
            data-testid="seller-referral-network"
          >
            <Link to="/sacoleira/rede">
              <Network className="h-4 w-4" />
              Ver minha rede
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
