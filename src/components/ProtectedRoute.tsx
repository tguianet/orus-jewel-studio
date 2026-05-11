import { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { ShieldAlert, ArrowRight } from "lucide-react";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ReferralGate } from "@/components/ReferralGate";

export const ProtectedRoute = ({ role, children }: { role: AppRole; children: ReactNode }) => {
  const { profile, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Carregando...
      </div>
    );
  }

  // Not logged in → redirect to the matching login screen
  if (!profile) {
    const target = role === "admin" ? "/login-admin" : "/login-sacoleira";
    return <Navigate to={target} state={{ from: location.pathname }} replace />;
  }

  const userRoles = profile.roles ?? (profile.role ? [profile.role] : []);
  const hasRequired = userRoles.includes(role);

  // Sacoleira gate: must have a sponsor (parent_id) before accessing the system.
  // Admins are exempt.
  const isSeller = userRoles.includes("sacoleira");
  const isAdmin = userRoles.includes("admin");
  if (isSeller && !isAdmin && profile.resellerId && !profile.parentResellerId) {
    return <ReferralGate />;
  }

  if (hasRequired) return <>{children}</>;

  // Logged in but wrong role → friendly message + suggestion to go to the area they DO have access to
  const isAdminArea = role === "admin";
  const userIsAdmin = userRoles.includes("admin");
  const userIsSeller = userRoles.includes("sacoleira");

  const suggestedPath = userIsAdmin ? "/admin" : userIsSeller ? "/sacoleira" : null;
  const suggestedLabel = userIsAdmin ? "Ir para o painel Admin" : userIsSeller ? "Ir para o painel da Sacoleira" : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center space-y-5 border border-border rounded-2xl p-8 bg-card">
        <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <ShieldAlert className="h-7 w-7 text-primary" />
        </div>
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Permissão insuficiente</p>
          <h1 className="font-display text-3xl text-foreground">Esta área é restrita</h1>
          <p className="text-sm text-muted-foreground">
            Sua conta <span className="text-foreground font-medium">{profile.email}</span> está
            autenticada como <span className="text-foreground font-medium">
              {userIsAdmin && userIsSeller ? "Admin + Sacoleira" : userIsAdmin ? "Admin" : userIsSeller ? "Sacoleira" : "sem perfil"}
            </span>, mas a área <span className="text-foreground font-medium">
              {isAdminArea ? "Admin" : "Sacoleira"}
            </span> exige o perfil <span className="text-foreground font-medium">
              {isAdminArea ? "Admin" : "Sacoleira"}
            </span>.
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          {suggestedPath && (
            <Button asChild variant="gold" size="lg" className="w-full">
              <Link to={suggestedPath}>{suggestedLabel} <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          )}
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link to="/">Voltar para o início</Link>
          </Button>
          <button
            onClick={async () => { await signOut(); window.location.href = isAdminArea ? "/login-admin" : "/login-sacoleira"; }}
            className="text-xs text-muted-foreground hover:text-primary mt-2"
          >
            Sair e entrar com outra conta
          </button>
        </div>
      </div>
    </div>
  );
};
