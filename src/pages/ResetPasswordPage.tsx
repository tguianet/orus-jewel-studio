import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrusLogo } from "@/components/OrusLogo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ResetPasswordPage = () => {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase recovery link sets a session via onAuthStateChange (PASSWORD_RECOVERY)
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password"));
    const confirm = String(f.get("confirm"));
    if (password !== confirm) { toast.error("As senhas não coincidem"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { toast.error("Não foi possível atualizar", { description: error.message }); return; }
    toast.success("Senha redefinida com sucesso!");
    await supabase.auth.signOut();
    setTimeout(() => nav("/login-sacoleira"), 400);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12 sm:px-12 bg-background">
      <div className="max-w-sm w-full mx-auto">
        <div className="mb-8"><Link to="/"><OrusLogo /></Link></div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Segurança da conta</p>
        <h1 className="font-display text-4xl font-light mb-2">Nova senha</h1>
        <p className="text-sm text-muted-foreground mb-8">
          {ready
            ? "Defina uma nova senha para acessar sua conta."
            : "Aguardando validação do link de recuperação..."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="password">Nova senha (mín. 6)</Label>
            <Input id="password" name="password" type="password" required minLength={6} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="confirm">Confirmar senha</Label>
            <Input id="confirm" name="confirm" type="password" required minLength={6} className="mt-1.5" />
          </div>
          <Button type="submit" variant="gold" size="lg" className="w-full" disabled={busy || !ready}>
            {busy ? "Salvando..." : "Redefinir senha"}
          </Button>
        </form>

        <p className="text-xs text-center text-muted-foreground mt-6">
          <Link to="/login-sacoleira" className="text-primary hover:underline">Voltar para o login</Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
