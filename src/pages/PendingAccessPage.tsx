import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { OrusLogo } from "@/components/OrusLogo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

/** Usuário autenticado sem role atribuída. */
const PendingAccessPage = () => {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center space-y-5 border border-border rounded-2xl p-8 bg-card">
        <Link to="/" className="inline-flex justify-center"><OrusLogo size="sm" /></Link>
        <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Clock className="h-7 w-7 text-primary" />
        </div>
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Acesso em análise</p>
          <h1 className="font-display text-3xl text-foreground">Conta ainda sem perfil</h1>
          <p className="text-sm text-muted-foreground">
            {profile?.email
              ? <>A conta <span className="text-foreground font-medium">{profile.email}</span> está autenticada, mas ainda não possui perfil liberado (admin ou sacoleira).</>
              : "Sua conta está autenticada, mas ainda não possui perfil liberado."}
            {" "}Aguarde a aprovação ou fale com a administração.
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link to="/">Voltar ao início</Link>
          </Button>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              window.location.href = "/login-sacoleira";
            }}
            className="text-xs text-muted-foreground hover:text-primary"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingAccessPage;
