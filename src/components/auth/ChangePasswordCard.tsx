import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PasswordField } from "@/components/auth/PasswordField";
import { PASSWORD_ERROR_MESSAGE, isPasswordValid } from "@/lib/passwordPolicy";

export function ChangePasswordCard({ className }: { className?: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!isPasswordValid(password)) {
      toast.error("Senha inválida", { description: PASSWORD_ERROR_MESSAGE });
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setConfirm("");
      toast.success("Senha alterada com sucesso.");
    } catch (err: unknown) {
      toast.error("Não foi possível alterar a senha.", {
        description: err instanceof Error ? err.message : "Tente novamente.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={className ?? "mt-6 rounded-xl border border-border bg-card p-6 space-y-4 max-w-2xl"}
    >
      <div>
        <h3 className="font-display text-lg">Alterar senha</h3>
        <p className="text-xs text-muted-foreground mt-1">Defina uma nova senha de acesso.</p>
      </div>
      <PasswordField
        id="profile-password"
        name="new-password"
        label="Nova senha"
        value={password}
        onChange={setPassword}
        disabled={saving}
      />
      <PasswordField
        id="profile-password-confirm"
        name="confirm-password"
        label="Confirmar nova senha"
        value={confirm}
        onChange={setConfirm}
        disabled={saving}
        showChecklist={false}
        showHint={false}
      />
      <Button type="submit" variant="gold" className="w-full" disabled={saving}>
        {saving ? "Salvando..." : "Alterar senha"}
      </Button>
    </form>
  );
}
