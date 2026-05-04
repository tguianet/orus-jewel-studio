import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, AppRole } from "@/contexts/AuthContext";

export const ProtectedRoute = ({ role, children }: { role: AppRole; children: ReactNode }) => {
  const { profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!profile) {
    const target = role === "admin" ? "/login-admin" : "/login-sacoleira";
    return <Navigate to={target} state={{ from: location.pathname }} replace />;
  }

  if (profile.role !== role && !profile.roles?.includes(role)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-center p-6">
        <h1 className="font-display text-3xl text-gold">Acesso negado</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          Sua conta não possui permissão para esta área ({role === "admin" ? "Admin" : "Sacoleira"}).
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
