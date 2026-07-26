import { useEffect } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, Shield, Store } from "lucide-react";
import { OrusLogo } from "@/components/OrusLogo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useArea } from "@/contexts/AreaContext";
import { RouteFallback } from "@/components/system/RouteFallback";
import { fallbackPathForRoles } from "@/lib/safeRedirect";
import { writeAreaPreference } from "@/lib/areaPreference";

const ChooseAreaPage = () => {
  const { profile, loading, roles, isAdmin, isReseller } = useAuth();
  const { setArea } = useArea();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !profile) return;
    if (!(isAdmin && isReseller)) {
      navigate(fallbackPathForRoles(roles), { replace: true });
    }
  }, [loading, profile, isAdmin, isReseller, roles, navigate]);

  if (loading) return <RouteFallback label="Carregando…" />;
  if (!profile) return <Navigate to="/login-admin" replace />;
  if (!(isAdmin && isReseller)) {
    return <Navigate to={fallbackPathForRoles(roles)} replace />;
  }

  const goAdmin = () => {
    writeAreaPreference("admin");
    setArea("admin");
    navigate("/admin", { replace: true });
  };

  const goReseller = () => {
    writeAreaPreference("reseller");
    setArea("reseller");
    navigate("/sacoleira", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-lg space-y-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <OrusLogo className="h-12" />
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Amada Amante</p>
          <h1 className="font-display text-3xl sm:text-4xl text-foreground">Como deseja entrar?</h1>
          <p className="text-sm text-muted-foreground max-w-md">
            Sua conta tem acesso administrativo e de sacoleira. Escolha a área — a autorização
            continua sendo validada no banco a cada página.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={goAdmin}
            className="group rounded-2xl border border-border bg-card p-6 text-left transition hover:border-primary/40 hover:bg-secondary/40"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Shield className="h-6 w-6" />
            </div>
            <h2 className="font-display text-xl text-foreground">Painel Administrativo</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Produtos, pedidos, sacoleiras, finanças e configurações globais.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm text-primary">
              Entrar <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
          </button>

          <button
            type="button"
            onClick={goReseller}
            className="group rounded-2xl border border-border bg-card p-6 text-left transition hover:border-primary/40 hover:bg-secondary/40"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Store className="h-6 w-6" />
            </div>
            <h2 className="font-display text-xl text-foreground">Minha área de Sacoleira</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Sua loja, pedidos, carteira e rede — apenas os seus dados.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm text-primary">
              Entrar <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Logada como <span className="text-foreground font-medium">{profile.email}</span>
          {" · "}
          <Link to="/" className="text-primary hover:underline">Início</Link>
        </p>
      </div>
    </div>
  );
};

export default ChooseAreaPage;
