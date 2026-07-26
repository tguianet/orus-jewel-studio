import { FormEvent, useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ReferralGate = () => {
  const { profile, signOut, refresh } = useAuth();
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile?.resellerId) return;
    const f = new FormData(e.currentTarget);
    const code = String(f.get("code") || "").trim();

    if (!UUID_RE.test(code)) {
      toast.error("Código inválido", { description: "Verifique o código de indicação e tente novamente." });
      return;
    }
    if (code === profile.resellerId) {
      toast.error("Você não pode se indicar.");
      return;
    }

    setBusy(true);
    // Lookup seguro (sem expor e-mail/telefone) + vínculo único via RPC
    const { data: refRows, error: refErr } = await supabase.rpc("lookup_reseller_sponsor", {
      _id: code,
    });
    const ref = Array.isArray(refRows) ? refRows[0] : null;

    if (refErr || !ref) {
      setBusy(false);
      toast.error("Indicação não encontrada", { description: "Confirme o código com a sua patrocinadora." });
      return;
    }

    const { error: upErr } = await supabase.rpc("set_my_reseller_parent", {
      _parent_id: code,
    });

    setBusy(false);
    if (upErr) {
      toast.error("Não foi possível salvar", { description: upErr.message });
      return;
    }
    toast.success("Indicação confirmada!", { description: `Você foi indicada por ${ref.display_name}.` });
    await refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full space-y-5 border border-border rounded-2xl p-8 bg-card">
        <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>
        <div className="space-y-2 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Acesso por indicação</p>
          <h1 className="font-display text-3xl text-foreground">Quem te indicou?</h1>
          <p className="text-sm text-muted-foreground">
            Para acessar o sistema você precisa informar o código de indicação de uma sacoleira já cadastrada.
            Esse vínculo é obrigatório e não poderá ser alterado depois.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <Label htmlFor="code">Código de indicação</Label>
            <Input
              id="code"
              name="code"
              required
              autoFocus
              placeholder="Ex.: 384eddbb-4567-468c-a355-021d18f19815"
              className="mt-1.5 font-mono text-xs"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Peça o código para sua patrocinadora — ela encontra em "Minha rede".
            </p>
          </div>
          <Button type="submit" variant="gold" size="lg" className="w-full" disabled={busy}>
            {busy ? "Validando..." : <>Confirmar indicação <ArrowRight className="h-4 w-4" /></>}
          </Button>
          <button
            type="button"
            onClick={async () => { await signOut(); window.location.href = "/login-sacoleira"; }}
            className="block w-full text-xs text-center text-muted-foreground hover:text-primary"
          >
            Sair e entrar com outra conta
          </button>
        </form>
      </div>
    </div>
  );
};
