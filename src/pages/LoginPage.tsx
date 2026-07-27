import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrusLogo } from "@/components/OrusLogo";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  fallbackPathForRoles,
  getSafeRedirectForRole,
  type AppRole,
} from "@/lib/safeRedirect";
import { AppError, normalizeError, showAppError } from "@/lib/errors";
import { assertOnlineForCritical } from "@/lib/networkStatus";
import {
  friendlyReferralMessage,
  normalizeReferralCode,
  reasonToUiStatus,
  type ReferralUiStatus,
  validateReferralCode,
} from "@/lib/referralCode";
import { PasswordField } from "@/components/auth/PasswordField";
import { PASSWORD_ERROR_MESSAGE, isPasswordValid } from "@/lib/passwordPolicy";

interface Props { role: "admin" | "sacoleira" }

const LoginPage = ({ role }: Props) => {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const rawNext = sp.get("next");
  const { signIn, signUp, profile, loading } = useAuth();
  const isAdmin = role === "admin";
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [busy, setBusy] = useState(false);
  const [referralInput, setReferralInput] = useState("");
  const [referralStatus, setReferralStatus] = useState<ReferralUiStatus>("idle");
  const [sponsorName, setSponsorName] = useState<string | null>(null);
  const [signupPassword, setSignupPassword] = useState("");
  const validateSeq = useRef(0);

  // Se já autenticado, evita loop login ↔ área protegida
  useEffect(() => {
    if (loading || !profile) return;
    const roles = (profile.roles?.length ? profile.roles : profile.role ? [profile.role] : []) as AppRole[];
    const dest = getSafeRedirectForRole(rawNext, roles);
    if (dest !== window.location.pathname) {
      nav(dest, { replace: true });
    }
  }, [loading, profile, rawNext, nav]);

  useEffect(() => {
    if (mode !== "signup" || isAdmin) return;
    const code = normalizeReferralCode(referralInput);
    if (!code) {
      setReferralStatus("idle");
      setSponsorName(null);
      return;
    }
    const seq = ++validateSeq.current;
    setReferralStatus("checking");
    const t = window.setTimeout(() => {
      void validateReferralCode(code).then((res) => {
        if (seq !== validateSeq.current) return;
        setSponsorName(res.sponsor_name);
        setReferralStatus(reasonToUiStatus(res.reason, res.valid));
      });
    }, 400);
    return () => window.clearTimeout(t);
  }, [referralInput, mode, isAdmin]);

  const handleForgot = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    setBusy(true);
    try {
      assertOnlineForCritical("reset_password");
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      if (error) {
        showAppError(normalizeError(error, { operation: "reset_password" }), { showCorrelation: false });
        return;
      }
    } catch (err) {
      showAppError(normalizeError(err, { operation: "reset_password" }), { showCorrelation: false });
      return;
    } finally {
      setBusy(false);
    }
    toast.success("Email enviado!", { description: "Verifique sua caixa de entrada para redefinir sua senha." });
    setMode("signin");
  };

  const handleSignIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      assertOnlineForCritical("sign_in");
      const result = await signIn(String(f.get("email")), String(f.get("password")));
      if (result.error) {
        showAppError(
          normalizeError(new Error(result.error), { operation: "sign_in" }),
          { showCorrelation: false },
        );
        return;
      }
      const roles = (result.roles?.length
        ? result.roles
        : result.role
          ? [result.role]
          : []) as AppRole[];

      if (!roles.length) {
        toast.message("Acesso em análise", { description: "Sua conta ainda não possui perfil liberado." });
        nav("/acesso-pendente", { replace: true });
        return;
      }

      if (isAdmin && !roles.includes("admin")) {
        showAppError(
          new AppError({
            code: "AUTH_ACCESS_DENIED",
            operation: "sign_in_role_check",
            userMessage: "Esta conta não é administrativa.",
          }),
          { showCorrelation: false },
        );
        nav(fallbackPathForRoles(roles), { replace: true });
        return;
      }
      if (!isAdmin && !roles.includes("sacoleira")) {
        showAppError(
          new AppError({
            code: "AUTH_ACCESS_DENIED",
            operation: "sign_in_role_check",
            userMessage: "Esta conta não tem perfil de sacoleira.",
          }),
          { showCorrelation: false },
        );
        nav(fallbackPathForRoles(roles), { replace: true });
        return;
      }

      const dest = getSafeRedirectForRole(rawNext, roles);
      toast.success("Bem-vinda de volta!");
      nav(dest, { replace: true });
    } catch (err) {
      showAppError(normalizeError(err, { operation: "sign_in" }), { showCorrelation: false });
    } finally {
      setBusy(false);
    }
  };

  const canCreateAccount = referralStatus === "valid" && !busy && isPasswordValid(signupPassword);

  const handleSignUp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy || referralStatus !== "valid") return;
    const f = new FormData(e.currentTarget);
    const code = normalizeReferralCode(String(f.get("sponsor") || referralInput));
    if (!code) {
      toast.error("Código de indicação obrigatório", {
        description: "Digite o código da sua patrocinadora.",
      });
      return;
    }
    if (!isPasswordValid(signupPassword)) {
      toast.error("Senha inválida", { description: PASSWORD_ERROR_MESSAGE });
      return;
    }
    setBusy(true);
    try {
      assertOnlineForCritical("sign_up");
      const { error, cause } = await signUp({
        email: String(f.get("email")),
        password: signupPassword,
        displayName: String(f.get("name")),
        phone: String(f.get("phone") || ""),
        referralCode: code,
      });
      if (error) {
        showAppError(
          normalizeError(cause ?? { message: error }, { operation: "sign_up" }),
          { showCorrelation: true },
        );
        return;
      }
      toast.success("Cadastro concluído!", { description: "Você já pode entrar." });
      setMode("signin");
      setSignupPassword("");
      setReferralInput("");
      setReferralStatus("idle");
      setSponsorName(null);
    } finally {
      setBusy(false);
    }
  };

  const referralHint = friendlyReferralMessage(referralStatus, sponsorName);

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex relative overflow-hidden bg-gradient-dark border-r border-border">
        <div className="absolute inset-0 bg-gradient-radial-gold opacity-50" />
        <div className="relative flex flex-col justify-between p-12 w-full">
          <Link to="/"><OrusLogo /></Link>
          <div>
            <h2 className="font-display text-5xl font-light leading-tight">
              {isAdmin ? "Sua casa de joias," : "Sua loja virtual,"}<br />
              <span className="text-gold italic">{isAdmin ? "no comando." : "ao seu jeito."}</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-md">
              {isAdmin
                ? "Gerencie estoque, sacoleiras, pedidos e o financeiro do seu atacado em um só lugar."
                : "Catálogo curado, preço sob seu controle e pedidos que chegam direto no seu WhatsApp."}
            </p>
          </div>
          <p className="text-xs text-muted-foreground tracking-widest uppercase">Amada Amante · Joias em rede</p>
        </div>
      </div>

      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="lg:hidden mb-8"><Link to="/"><OrusLogo /></Link></div>
        <div className="max-w-sm w-full mx-auto lg:mx-0">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">{isAdmin ? "Acesso administrativo" : "Painel da sacoleira"}</p>
          <h1 className="font-display text-4xl font-light mb-2">
            {mode === "signin" ? "Bem-vinda de volta" : mode === "signup" ? "Criar conta" : "Redefinir senha"}
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            {mode === "signin"
              ? `Entre para acessar ${isAdmin ? "o admin" : "sua loja"}.`
              : mode === "signup"
              ? "Preencha para começar a revender."
              : "Informe seu email e enviaremos um link para criar uma nova senha."}
          </p>

          {mode === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required autoComplete="email" className="mt-1.5" /></div>
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <button type="button" onClick={() => setMode("forgot")} className="text-xs text-primary hover:underline">
                    Esqueci minha senha
                  </button>
                </div>
                <Input id="password" name="password" type="password" required minLength={6} autoComplete="current-password" className="mt-1.5" />
              </div>
              <Button type="submit" variant="gold" size="lg" className="w-full" disabled={busy || loading}>
                {busy ? "Entrando..." : <>Entrar <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </form>
          )}

          {mode === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div><Label htmlFor="name">Nome completo</Label><Input id="name" name="name" required className="mt-1.5" /></div>
              <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required className="mt-1.5" /></div>
              <div><Label htmlFor="phone">WhatsApp</Label><Input id="phone" name="phone" placeholder="(11) 99999-9999" className="mt-1.5" /></div>
              <PasswordField
                id="password"
                name="password"
                label="Senha"
                value={signupPassword}
                onChange={setSignupPassword}
                disabled={busy}
              />
              <div>
                <Label htmlFor="sponsor">Código de indicação</Label>
                <Input
                  id="sponsor"
                  name="sponsor"
                  required
                  value={referralInput}
                  onChange={(e) => setReferralInput(e.target.value)}
                  placeholder="Digite o código da sua patrocinadora"
                  autoComplete="off"
                  className="mt-1.5 uppercase tracking-wide"
                  aria-invalid={referralStatus === "invalid" || referralStatus === "inactive" || referralStatus === "blocked"}
                />
                <p
                  className={`mt-1.5 text-xs flex items-start gap-1.5 ${
                    referralStatus === "valid"
                      ? "text-success"
                      : referralStatus === "checking" || referralStatus === "idle"
                        ? "text-muted-foreground"
                        : "text-destructive"
                  }`}
                  data-testid="referral-status"
                >
                  {referralStatus === "checking" && <Loader2 className="h-3.5 w-3.5 mt-0.5 animate-spin shrink-0" />}
                  {referralStatus === "valid" && <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />}
                  {(referralStatus === "invalid" || referralStatus === "inactive" || referralStatus === "blocked" || referralStatus === "rate_limited") && (
                    <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  )}
                  <span>{referralHint}</span>
                </p>
              </div>
              <Button type="submit" variant="gold" size="lg" className="w-full" disabled={!canCreateAccount}>
                {busy ? "Criando..." : "Criar conta"}
              </Button>
            </form>
          )}

          {mode === "forgot" && (
            <form onSubmit={handleForgot} className="space-y-4">
              <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required className="mt-1.5" /></div>
              <Button type="submit" variant="gold" size="lg" className="w-full" disabled={busy}>
                {busy ? "Enviando..." : "Enviar link de redefinição"}
              </Button>
              <button type="button" onClick={() => setMode("signin")} className="block w-full text-xs text-center text-primary hover:underline">
                Voltar para o login
              </button>
            </form>
          )}

          <div className="my-6 gold-divider" />
          {!isAdmin && mode !== "forgot" && (
            <p className="text-xs text-center text-muted-foreground">
              {mode === "signin" ? (
                <>Quer ser revendedora Amada Amante?{" "}
                <button onClick={() => setMode("signup")} className="text-primary hover:underline">Solicitar cadastro</button></>
              ) : (
                <>Já tem conta?{" "}
                <button onClick={() => setMode("signin")} className="text-primary hover:underline">Entrar</button></>
              )}
            </p>
          )}
          {isAdmin && mode !== "forgot" && (
            <p className="text-xs text-center text-muted-foreground">
              É sacoleira? <Link to="/login-sacoleira" className="text-primary hover:underline">Acesse aqui</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
