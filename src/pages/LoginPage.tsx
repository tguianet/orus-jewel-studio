import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrusLogo } from "@/components/OrusLogo";
import { useAuth } from "@/contexts/AuthContext";

interface Props { role: "admin" | "sacoleira" }

const LoginPage = ({ role }: Props) => {
  const nav = useNavigate();
  const { login } = useAuth();
  const isAdmin = role === "admin";
  const target = isAdmin ? "/admin" : "/sacoleira";

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left visual */}
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
          <p className="text-xs text-muted-foreground tracking-widest uppercase">Aura Store Suite · Joias em rede</p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="lg:hidden mb-8"><Link to="/"><OrusLogo /></Link></div>
        <div className="max-w-sm w-full mx-auto lg:mx-0">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">{isAdmin ? "Acesso administrativo" : "Painel da sacoleira"}</p>
          <h1 className="font-display text-4xl font-light mb-2">Bem-vinda de volta</h1>
          <p className="text-sm text-muted-foreground mb-8">Entre com seus dados para acessar {isAdmin ? "o admin" : "sua loja"}.</p>

          <form onSubmit={(e) => { e.preventDefault(); login(role, new FormData(e.currentTarget).get("email")?.toString()); nav(target); }} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={isAdmin ? "admin@aurastore.com" : "marina@email.com"} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="pwd">Senha</Label>
              <Input id="pwd" type="password" defaultValue="••••••••" className="mt-1.5" />
            </div>
            <Button type="submit" variant="gold" size="lg" className="w-full">
              Entrar <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="my-6 gold-divider" />
          <p className="text-xs text-center text-muted-foreground">
            {isAdmin ? (
              <>É sacoleira? <Link to="/login-sacoleira" className="text-primary hover:underline">Acesse aqui</Link></>
            ) : (
              <>Quer ser revendedora Aura? <a className="text-primary hover:underline cursor-pointer">Solicitar cadastro</a></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
