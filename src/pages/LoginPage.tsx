import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrusLogo } from "@/components/OrusLogo";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props { role: "admin" | "sacoleira" }

const LoginPage = ({ role }: Props) => {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const rawNext = sp.get("next") || "";
  const nextPath = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "";
  const { signIn, signUp } = useAuth();
  const isAdmin = role === "admin";
  const target = nextPath || (isAdmin ? "/admin" : "/sacoleira");
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [busy, setBusy] = useState(false);

  const handleForgot = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) { toast.error("Não foi possível enviar", { description: error.message }); return; }
    toast.success("Email enviado!", { description: "Verifique sua caixa de entrada para redefinir sua senha." });
    setMode("signin");
  };

  const handleSignIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await signIn(String(f.get("email")), String(f.get("password")));
    setBusy(false);
    if (error) { toast.error("Não foi possível entrar", { description: error }); return; }
    toast.success("Bem-vinda de volta!");
    setTimeout(() => nav(target), 200);
  };

  const handleSignUp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await signUp({
      email: String(f.get("email")),
      password: String(f.get("password")),
      displayName: String(f.get("name")),
      phone: String(f.get("phone") || ""),
      parentResellerId: String(f.get("sponsor") || "") || undefined,
    });
    setBusy(false);
    if (error) { toast.error("Cadastro falhou", { description: error }); return; }
    toast.success("Cadastro concluído!", { description: "Você já pode entrar." });
    setMode("signin");
  };

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
              <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required className="mt-1.5" /></div>
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <button type="button" onClick={() => setMode("forgot")} className="text-xs text-primary hover:underline">
                    Esqueci minha senha
                  </button>
                </div>
                <Input id="password" name="password" type="password" required minLength={6} className="mt-1.5" />
              </div>
              <Button type="submit" variant="gold" size="lg" className="w-full" disabled={busy}>
                {busy ? "Entrando..." : <>Entrar <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </form>
          )}

          {mode === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div><Label htmlFor="name">Nome completo</Label><Input id="name" name="name" required className="mt-1.5" /></div>
              <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required className="mt-1.5" /></div>
              <div><Label htmlFor="phone">WhatsApp</Label><Input id="phone" name="phone" placeholder="(11) 99999-9999" className="mt-1.5" /></div>
              <div><Label htmlFor="password">Senha (mín. 6)</Label><Input id="password" name="password" type="password" required minLength={6} className="mt-1.5" /></div>
              <div><Label htmlFor="sponsor">Código de indicação (opcional)</Label><Input id="sponsor" name="sponsor" placeholder="ID da sua patrocinadora" className="mt-1.5" /></div>
              <Button type="submit" variant="gold" size="lg" className="w-full" disabled={busy}>
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
