import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrusLogo } from "@/components/OrusLogo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  RECOVERY_ERROR_EXPIRED,
  RECOVERY_ERROR_INVALID,
  RECOVERY_ERROR_UNEXPECTED,
  RECOVERY_MIN_PASSWORD,
  RECOVERY_SUCCESS_MESSAGE,
  canSubmitPasswordRecovery,
  friendlyAuthError,
  isExpiredRecoveryMessage,
  isPasswordRecoveryEvent,
  isPasswordStrongEnough,
  parseRecoveryParams,
  passwordsMatch,
} from "@/lib/authSession";
import { PasswordField } from "@/components/auth/PasswordField";
import { PASSWORD_ERROR_MESSAGE, isPasswordValid } from "@/lib/passwordPolicy";

type RecoveryUiState =
  | "verifying"
  | "valid"
  | "invalid"
  | "expired"
  | "succeeded"
  | "error";

/** Remove code/token da URL só DEPOIS da sessão de recovery existir. */
function stripRecoveryParams() {
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("error");
  url.searchParams.delete("error_code");
  url.searchParams.delete("error_description");
  window.history.replaceState({}, "", url.pathname + url.search);
}

const ResetPasswordPage = () => {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [ui, setUi] = useState<RecoveryUiState>("verifying");
  const [message, setMessage] = useState("Validando seu link de recuperação...");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const recoveryConfirmed = useRef(false);
  const succeeded = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const timeoutId = setTimeout(() => {
      if (!cancelled && !recoveryConfirmed.current && !succeeded.current) {
        setUi("invalid");
        setMessage(RECOVERY_ERROR_INVALID);
      }
    }, 12000);

    const markValid = () => {
      if (cancelled || succeeded.current || recoveryConfirmed.current) return;
      recoveryConfirmed.current = true;
      setUi("valid");
      setMessage("Defina uma nova senha para acessar sua conta.");
      clearTimeout(timeoutId);
      stripRecoveryParams();
    };

    const markFail = (kind: RecoveryUiState, text: string) => {
      if (cancelled || recoveryConfirmed.current) return;
      setUi(kind);
      setMessage(text);
      clearTimeout(timeoutId);
    };

    // Fluxo hash legado: o cliente detecta o token e emite PASSWORD_RECOVERY.
    // Uma sessão SIGNED_IN comum não libera esta tela por si só.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (isPasswordRecoveryEvent(event)) markValid();
    });

    (async () => {
      try {
        const parsed = parseRecoveryParams(window.location.search, window.location.hash);

        if (parsed.errorDescription) {
          markFail(
            parsed.expired ? "expired" : "invalid",
            parsed.expired ? RECOVERY_ERROR_EXPIRED : friendlyAuthError(parsed.errorDescription),
          );
          return;
        }

        // 1) Fluxo PKCE: ?code=...
        if (parsed.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(parsed.code);
          if (error) {
            markFail(
              isExpiredRecoveryMessage(error.message) ? "expired" : "invalid",
              isExpiredRecoveryMessage(error.message) ? RECOVERY_ERROR_EXPIRED : RECOVERY_ERROR_INVALID,
            );
            return;
          }
          // O code de recuperação vale como autorização (PKCE não emite PASSWORD_RECOVERY).
          markValid();
          return;
        }

        // 2) Fluxo hash: #access_token=...&refresh_token=...&type=recovery
        if (parsed.accessToken && parsed.refreshToken && parsed.isRecoveryType) {
          const { error } = await supabase.auth.setSession({
            access_token: parsed.accessToken,
            refresh_token: parsed.refreshToken,
          });
          if (error) {
            markFail(
              isExpiredRecoveryMessage(error.message) ? "expired" : "invalid",
              isExpiredRecoveryMessage(error.message) ? RECOVERY_ERROR_EXPIRED : RECOVERY_ERROR_INVALID,
            );
            return;
          }
          window.history.replaceState({}, "", window.location.pathname);
          markValid();
          return;
        }

        // 3) Hash marcado como recovery mas já consumido pelo cliente (detectSessionInUrl).
        if (parsed.isRecoveryType) {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            window.history.replaceState({}, "", window.location.pathname);
            markValid();
            return;
          }
        }

        // Sem code, sem token: nada autoriza a redefinição.
        markFail("invalid", RECOVERY_ERROR_INVALID);
      } catch (e) {
        markFail("error", friendlyAuthError(e instanceof Error ? e.message : RECOVERY_ERROR_UNEXPECTED));
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

    if (!isPasswordStrongEnough(password, RECOVERY_MIN_PASSWORD) || !isPasswordValid(password)) {
      toast.error("Senha inválida", { description: PASSWORD_ERROR_MESSAGE });
      return;
    }
    if (!passwordsMatch(password, confirm)) {
      toast.error("As senhas não coincidem.");
      return;
    }


    setBusy(true);
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password });
      if (updErr) {
        const expired = isExpiredRecoveryMessage(updErr.message);
        setUi(expired ? "expired" : "error");
        setMessage(expired ? RECOVERY_ERROR_EXPIRED : RECOVERY_ERROR_UNEXPECTED);
        toast.error(expired ? RECOVERY_ERROR_EXPIRED : RECOVERY_ERROR_UNEXPECTED);
        return;
      }
      succeeded.current = true;
      setPassword("");
      setConfirm("");
      recoveryConfirmed.current = false;
      setUi("succeeded");
      setMessage(RECOVERY_SUCCESS_MESSAGE);
      toast.success(RECOVERY_SUCCESS_MESSAGE);
      await supabase.auth.signOut();
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(() => nav("/login-sacoleira", { replace: true }), 600);
    } catch {
      setUi("error");
      setMessage(RECOVERY_ERROR_UNEXPECTED);
      toast.error(RECOVERY_ERROR_UNEXPECTED);
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
          {ui === "succeeded" ? "Senha atualizada" : "Criar nova senha"}
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
            <PasswordField
              id="password"
              name="password"
              label="Nova senha"
              value={password}
              onChange={setPassword}
              disabled={!showForm || busy}
            />
            <div>
              <Label htmlFor="confirm">Confirmar nova senha</Label>
              <div className="relative mt-1.5">
                <Input
                  id="confirm"
                  name="confirm"
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={RECOVERY_MIN_PASSWORD}
                  autoComplete="new-password"
                  className="pr-11"
                  disabled={!showForm || busy}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              variant="gold"
              size="lg"
              className="w-full"
              disabled={!showForm || busy}
            >
              {busy ? "Salvando..." : showForm ? "Alterar senha" : "Verificando link..."}
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
