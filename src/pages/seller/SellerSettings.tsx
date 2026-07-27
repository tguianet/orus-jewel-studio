import { FormEvent, useEffect, useState } from "react";
import { SellerLayout } from "@/layouts/SellerLayout";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChangePasswordCard } from "@/components/auth/ChangePasswordCard";
import { PwaInstallButton } from "@/components/pwa/PwaInstallButton";
import { PwaInstallInstructions } from "@/components/pwa/PwaInstallInstructions";

const SellerSettings = () => {
  const { profile, loading: authLoading, refresh } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (authLoading) return;
      if (!profile?.user?.id) {
        setLoading(false);
        setError("Faça login para editar suas configurações.");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const [{ data: prof, error: profError }, { data: reseller, error: resellerError }, { data: store, error: storeError }] =
          await Promise.all([
            supabase.from("profiles").select("display_name,phone").eq("user_id", profile.user.id).maybeSingle(),
            profile.resellerId
              ? supabase.from("resellers").select("display_name,email,phone").eq("id", profile.resellerId).maybeSingle()
              : Promise.resolve({ data: null, error: null }),
            profile.storeId
              ? supabase.from("seller_stores").select("contact_phone").eq("id", profile.storeId).maybeSingle()
              : Promise.resolve({ data: null, error: null }),
          ]);

        if (profError) throw profError;
        if (resellerError) throw resellerError;
        if (storeError) throw storeError;
        if (!mounted) return;

        setDisplayName(prof?.display_name || reseller?.display_name || profile.displayName || "");
        setEmail(reseller?.email || profile.email || "");
        setPhone(store?.contact_phone || reseller?.phone || prof?.phone || "");
      } catch (err: unknown) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Não foi possível carregar suas configurações.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [authLoading, profile]);

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile?.user?.id) return;

    setSaving(true);
    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim(), phone: phone.trim() || null })
        .eq("user_id", profile.user.id);
      if (profileError) throw profileError;

      if (profile.resellerId) {
        const { error: resellerError } = await supabase
          .from("resellers")
          .update({
            display_name: displayName.trim(),
            phone: phone.trim() || null,
          })
          .eq("id", profile.resellerId);
        if (resellerError) throw resellerError;
      }

      if (profile.storeId) {
        const { error: storeError } = await supabase
          .from("seller_stores")
          .update({ contact_phone: phone.trim() || null })
          .eq("id", profile.storeId);
        if (storeError) throw storeError;
      }

      await refresh();
      toast.success("Configurações salvas.");
    } catch (err: unknown) {
      toast.error("Não foi possível salvar.", {
        description: err instanceof Error ? err.message : "Erro desconhecido.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SellerLayout>
      <PageHeader eyebrow="Conta" title="Configurações" description="Seus dados e preferências." />
      <div className="mb-6 rounded-xl border border-border bg-card p-5 max-w-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-lg">Aplicativo Sacoleira</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Instale a área da sacoleira na tela inicial. Atualizações chegam por modal, sem desinstalar.
          </p>
        </div>
        <div className="flex flex-col items-stretch sm:items-end gap-2">
          <PwaInstallButton />
          <PwaInstallInstructions className="text-xs text-muted-foreground max-w-xs sm:text-right" />
        </div>
      </div>
      {error && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive max-w-2xl">
          {error}
        </div>
      )}
      <form onSubmit={handleSave} className="rounded-xl border border-border bg-card p-6 space-y-4 max-w-2xl">
        {loading || authLoading ? (
          <p className="text-sm text-muted-foreground">Carregando configurações…</p>
        ) : (
          <>
            <div>
              <Label htmlFor="seller-name">Nome completo</Label>
              <Input
                id="seller-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1.5"
                required
              />
            </div>
            <div>
              <Label htmlFor="seller-email">Email</Label>
              <Input id="seller-email" value={email} className="mt-1.5" disabled />
              <p className="mt-1 text-xs text-muted-foreground">O email de login não pode ser alterado aqui.</p>
            </div>
            <div>
              <Label htmlFor="seller-phone">WhatsApp (recebe pedidos)</Label>
              <Input
                id="seller-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1.5"
                placeholder="(11) 99999-9999"
              />
            </div>
            <Button type="submit" variant="gold" className="w-full" disabled={saving || !!error}>
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </>
        )}
      </form>
      <ChangePasswordCard />
    </SellerLayout>
  );
};

export default SellerSettings;
