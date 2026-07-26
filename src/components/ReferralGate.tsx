import { FormEvent, useEffect, useRef, useState } from "react";
import { Sparkles, ArrowRight, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  friendlyReferralMessage,
  normalizeReferralCode,
  reasonToUiStatus,
  type ReferralUiStatus,
  validateReferralCode,
} from "@/lib/referralCode";

export const ReferralGate = () => {
  const { profile, signOut, refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<ReferralUiStatus>("idle");
  const [sponsorName, setSponsorName] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const normalized = normalizeReferralCode(code);
    if (!normalized) {
      setStatus("idle");
      setSponsorName(null);
      return;
    }
    const n = ++seq.current;
    setStatus("checking");
    const t = window.setTimeout(() => {
      void validateReferralCode(normalized).then((res) => {
        if (n !== seq.current) return;
        setSponsorName(res.sponsor_name);
        setStatus(reasonToUiStatus(res.reason, res.valid));
      });
    }, 400);
    return () => window.clearTimeout(t);
  }, [code]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile?.resellerId || busy || status !== "valid") return;
    const normalized = normalizeReferralCode(code);
    if (!normalized) {
      toast.error("Código de indicação obrigatório");
      return;
    }
    if (normalized === profile.resellerId || normalized === profile.referralCode) {
      toast.error("Você não pode se indicar.");
      return;
    }

    setBusy(true);
    const { data, error } = await supabase.rpc("set_my_reseller_parent_by_code", {
      p_referral_code: normalized,
    });
    setBusy(false);

    if (error) {
      toast.error("Não foi possível salvar", { description: error.message });
      return;
    }

    const name =
      (data as { sponsor_name?: string } | null)?.sponsor_name || sponsorName || "sua patrocinadora";
    toast.success("Indicação confirmada!", { description: `Você foi indicada por ${name}.` });
    await refresh();
  };

  const hint = friendlyReferralMessage(status, sponsorName);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full space-y-5 border border-border rounded-2xl p-8 bg-card">
        <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>
        <div className="space-y-2 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Acesso por indicação</p>
          <h1 className="font-display text-3xl text-foreground">Quem te indicou?</h1>
          <p className="text-sm text-muted-foreground">
            Para acessar o sistema você precisa informar o código de indicação de uma sacoleira já cadastrada.
            Esse vínculo é obrigatório e não poderá ser alterado depois.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <Label htmlFor="code">Código de indicação</Label>
            <Input
              id="code"
              name="code"
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Digite o código da sua patrocinadora"
              className="mt-1.5 uppercase tracking-wide"
            />
            <p
              className={`mt-1.5 text-xs flex items-start gap-1.5 ${
                status === "valid"
                  ? "text-success"
                  : status === "checking" || status === "idle"
                    ? "text-muted-foreground"
                    : "text-destructive"
              }`}
            >
              {status === "checking" && <Loader2 className="h-3.5 w-3.5 mt-0.5 animate-spin shrink-0" />}
              {status === "valid" && <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />}
              {(status === "invalid" || status === "inactive" || status === "blocked" || status === "rate_limited") && (
                <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              )}
              <span>{hint}</span>
            </p>
          </div>
          <Button type="submit" variant="gold" size="lg" className="w-full" disabled={busy || status !== "valid"}>
            {busy ? "Validando..." : <>Confirmar indicação <ArrowRight className="h-4 w-4" /></>}
          </Button>
          <button
            type="button"
            onClick={async () => { await signOut(); window.location.href = "/login-sacoleira"; }}
            className="block w-full text-xs text-center text-muted-foreground hover:text-primary"
          >
            Sair e entrar com outra conta
          </button>
        </form>
      </div>
    </div>
  );
};
