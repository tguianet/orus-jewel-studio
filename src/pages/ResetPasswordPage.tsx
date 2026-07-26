import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrusLogo } from "@/components/OrusLogo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  canSubmitPasswordRecovery,
  friendlyAuthError,
  isPasswordRecoveryEvent,
  isPasswordStrongEnough,
  passwordsMatch,
} from "@/lib/authSession";

type RecoveryUiState =
  | "verifying"
  | "valid"
  | "invalid"
  | "expired"
  | "succeeded"
  | "error";

const ResetPasswordPage = () => {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [ui, setUi] = useState<RecoveryUiState>("verifying");
  const [message, setMessage] = useState("Aguardando validação do link de recuperação...");
  const recoveryConfirmed = useRef(false);
  const succeeded = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const timeoutId = setTimeout(() => {
      if (!cancelled && !recoveryConfirmed.current) {
        setUi("invalid");
        setMessage("Não foi possível validar o link. Tente solicitar um novo.");
      }
    }, 8000);

    const markValid = () => {
      if (cancelled || succeeded.current) return;
      recoveryConfirmed.current = true;
      setUi("valid");
      setMessage("Defina uma nova senha para acessar sua conta.");
      clearTimeout(timeoutId);
    };

    const markFail = (kind: RecoveryUiState, text: string) => {
      if (cancelled) return;
      setUi(kind);
      setMessage(text);
      clearTimeout(timeoutId);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      // O — só PASSWORD_RECOVERY autoriza; P — SIGNED_IN comum não libera
      if (isPasswordRecoveryEvent(event)) {
        markValid();
      }
    });

    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const code = params.get("code");
        const errDesc = params.get("error_description") || params.get("error")
          || hashParams.get("error_description") || hashParams.get("error");

        if (errDesc) {
          const decoded = decodeURIComponent(errDesc);
          const expired = decoded.toLowerCase().includes("expired");
          markFail(
            expired ? "expired" : "invalid",
            expired
              ? "Este link de recuperação expirou. Solicite um novo."
              : friendlyAuthError(decoded),
          );
          return;
        }

        if (code) {
          const { error: exchErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exchErr) {
            const expired = exchErr.message.toLowerCase().includes("expired");
            markFail(
              expired ? "expired" : "invalid",
              expired
                ? "Este link de recuperação expirou. Solicite um novo."
                : "Link inválido ou já utilizado. Solicite um novo link.",
            );
            return;
          }
          const url = new URL(window.location.href);
          url.searchParams.delete("code");
          window.history.replaceState({}, "", url.pathname + url.search + url.hash);
          // Aguarda PASSWORD_RECOVERY do listener — não libera por sessão comum
          return;
        }

        // Sessão SIGNED_IN existente NÃO autoriza reset
      } catch (e) {
        markFail("error", friendlyAuthError(e instanceof Error ? e.message : "Erro ao validar o link."));
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmitPasswordRecovery({
      recoveryConfirmed: recoveryConfirmed.current,
      busy,
      alreadySucceeded: succeeded.current,
    })) {
      return;
    }

    const f = new FormData(e.currentTarget);
    const password = String(f.get("password"));
    const confirm = String(f.get("confirm"));

    if (!isPasswordStrongEnough(password, 8)) {
      toast.error("Senha fraca", { description: "Use no mínimo 8 caracteres." });
      return;
    }
    if (!passwordsMatch(password, confirm)) {
      toast.error("As senhas não coincidem");
      return;
    }

    setBusy(true);
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password });
      if (updErr) {
        toast.error("Não foi possível atualizar", { description: friendlyAuthError(updErr.message) });
        setUi("error");
        return;
      }
      succeeded.current = true;
      recoveryConfirmed.current = false;
      setUi("succeeded");
      setMessage("Senha redefinida com sucesso. Entre novamente.");
      toast.success("Senha redefinida com sucesso!");
      await supabase.auth.signOut();
      setTimeout(() => nav("/login-sacoleira", { replace: true }), 400);
    } finally {
      setBusy(false);
    }
  };

  const showForm = ui === "valid";
  const showError = ui === "invalid" || ui === "expired" || ui === "error";

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12 sm:px-12 bg-background">
      <div className="max-w-sm w-full mx-auto">
        <div className="mb-8"><Link to="/"><OrusLogo /></Link></div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Segurança da conta</p>
        <h1 className="font-display text-4xl font-light mb-2">
          {ui === "succeeded" ? "Senha atualizada" : "Nova senha"}
        </h1>
        <p className="text-sm text-muted-foreground mb-8">{message}</p>

        {showError || ui === "succeeded" ? (
          <div className="space-y-3">
            <Button
              type="button"
              variant="gold"
              size="lg"
              className="w-full"
              onClick={() => nav("/login-sacoleira")}
            >
              {ui === "succeeded" ? "Ir para o login" : "Solicitar novo link"}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">Nova senha (mín. 8)</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="mt-1.5"
                disabled={!showForm || busy}
              />
            </div>
            <div>
              <Label htmlFor="confirm">Confirmar senha</Label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="mt-1.5"
                disabled={!showForm || busy}
              />
            </div>
            <Button
              type="submit"
              variant="gold"
              size="lg"
              className="w-full"
              disabled={!showForm || busy}
            >
              {busy ? "Salvando..." : showForm ? "Redefinir senha" : "Verificando link..."}
            </Button>
          </form>
        )}

        <p className="text-xs text-center text-muted-foreground mt-6">
          <Link to="/login-sacoleira" className="text-primary hover:underline">Voltar para o login</Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
