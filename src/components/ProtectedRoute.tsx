import { ReactNode, useEffect } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { ShieldAlert, ArrowRight } from "lucide-react";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ReferralGate } from "@/components/ReferralGate";
import { RouteFallback } from "@/components/system/RouteFallback";
import {
  buildLoginUrlWithNext,
  fallbackPathForRoles,
  isSafeInternalPath,
  loginPathForRole,
} from "@/lib/safeRedirect";

type Props = {
  /** @deprecated Prefira allowedRoles */
  role?: AppRole;
  allowedRoles?: AppRole[];
  children: ReactNode;
};

export const ProtectedRoute = ({ role, allowedRoles, children }: Props) => {
  const { profile, loading, signOut, refreshUserRoles } = useAuth();
  const location = useLocation();
  const required = allowedRoles?.length
    ? allowedRoles
    : role
      ? [role]
      : [];

  // Recarrega roles ao focar (admin pode ter alterado o perfil)
  useEffect(() => {
    if (loading || !profile) return;
    const onFocus = () => { void refreshUserRoles(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loading, profile, refreshUserRoles]);

  if (loading) {
    return <RouteFallback label="Validando acesso…" />;
  }

  const primaryRequired = required[0] ?? "sacoleira";

  if (!profile) {
    const login = loginPathForRole(primaryRequired);
    const next = isSafeInternalPath(location.pathname) ? location.pathname : "";
    const to = next ? buildLoginUrlWithNext(login, next) : login;
    return <Navigate to={to} replace />;
  }

  const userRoles = profile.roles ?? (profile.role ? [profile.role] : []);

  if (userRoles.length === 0) {
    return <Navigate to="/acesso-pendente" replace />;
  }

  const hasRequired = required.length === 0
    ? true
    : required.some((r) => userRoles.includes(r));

  if (!hasRequired) {
    const ownFallback = fallbackPathForRoles(userRoles);
    if (ownFallback !== location.pathname) {
      return <Navigate to={ownFallback} replace />;
    }
  } else {
    const isSeller = userRoles.includes("sacoleira");
    const isAdmin = userRoles.includes("admin");
    // Referral só para sacoleira pura (sem admin)
    if (
      required.includes("sacoleira")
      && isSeller
      && !isAdmin
      && profile.resellerId
      && !profile.parentResellerId
    ) {
      return <ReferralGate />;
    }
    return <>{children}</>;
  }

  const isAdminArea = required.includes("admin") && !required.includes("sacoleira");
  const userIsAdmin = userRoles.includes("admin");
  const userIsSeller = userRoles.includes("sacoleira");
  const suggestedPath = userIsAdmin && userIsSeller
    ? "/escolher-area"
    : userIsAdmin
      ? "/admin"
      : userIsSeller
        ? "/sacoleira"
        : "/acesso-pendente";
  const suggestedLabel = userIsAdmin && userIsSeller
    ? "Escolher área"
    : userIsAdmin
      ? "Ir para o painel Admin"
      : userIsSeller
        ? "Ir para o painel da Sacoleira"
        : "Ver status do acesso";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center space-y-5 border border-border rounded-2xl p-8 bg-card">
        <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <ShieldAlert className="h-7 w-7 text-primary" />
        </div>
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Acesso negado</p>
          <h1 className="font-display text-3xl text-foreground">Esta área é restrita</h1>
          <p className="text-sm text-muted-foreground">
            Sua conta <span className="text-foreground font-medium">{profile.email}</span> não tem
            permissão para a área {isAdminArea ? "Admin" : "Sacoleira"}.
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <Button asChild variant="gold" size="lg" className="w-full">
            <Link to={suggestedPath}>{suggestedLabel} <ArrowRight className="h-4 w-4" /></Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link to="/">Voltar para o início</Link>
          </Button>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              window.location.href = isAdminArea ? "/login-admin" : "/login-sacoleira";
            }}
            className="text-xs text-muted-foreground hover:text-primary mt-2"
          >
            Sair e entrar com outra conta
          </button>
        </div>
      </div>
    </div>
  );
};
