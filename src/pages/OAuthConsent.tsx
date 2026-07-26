import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { OrusLogo } from "@/components/OrusLogo";
import { buildLoginUrlWithNext, isSafeInternalPath } from "@/lib/safeRedirect";
import { isAllowedOAuthRedirect, resolveOAuthRedirect } from "@/lib/oauthRedirect";
import { friendlyAuthError } from "@/lib/authSession";

// Local typed wrapper for the beta supabase.auth.oauth namespace.
type OAuthClient = { name?: string; client_id?: string; redirect_uris?: string[] };
type AuthDetails = {
  client?: OAuthClient;
  scope?: string;
  scopes?: string[];
  redirect_url?: string;
  redirect_to?: string;
} | null;
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthDetails; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
};
const oauthApi = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

function safeNavigateToOAuthTarget(raw: string | null | undefined): string | null {
  const resolved = resolveOAuthRedirect(raw, "/");
  if (resolved.ok) return resolved.url;
  return null;
}

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthDetails>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Requisição inválida: authorization_id ausente.");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const consentPath = "/.lovable/oauth/consent";
        window.location.href = isSafeInternalPath(consentPath)
          ? buildLoginUrlWithNext("/login-sacoleira", consentPath)
          : "/login-sacoleira";
        return;
      }
      try {
        const { data, error: loadErr } = await oauthApi.getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (loadErr) {
          setError(friendlyAuthError(loadErr.message));
          return;
        }
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) {
          if (!isAllowedOAuthRedirect(immediate)) {
            setError("Redirecionamento OAuth inválido ou não autorizado.");
            return;
          }
          const target = safeNavigateToOAuthTarget(immediate);
          if (!target) {
            setError("Redirecionamento OAuth inválido ou não autorizado.");
            return;
          }
          window.location.href = target;
          return;
        }
        setDetails(data);
      } catch (e) {
        setError(friendlyAuthError(e instanceof Error ? e.message : "Falha ao carregar autorização."));
      }
    })();
    return () => { active = false; };
  }, [authorizationId]);

  const decide = async (approve: boolean) => {
    setBusy(true);
    try {
      const { data, error: decideErr } = approve
        ? await oauthApi.approveAuthorization(authorizationId)
        : await oauthApi.denyAuthorization(authorizationId);
      if (decideErr) {
        setBusy(false);
        setError(friendlyAuthError(decideErr.message));
        return;
      }
      const targetRaw = data?.redirect_url ?? data?.redirect_to;
      if (!targetRaw) {
        setBusy(false);
        setError("Servidor de autorização não retornou redirecionamento.");
        return;
      }
      if (!isAllowedOAuthRedirect(targetRaw)) {
        setBusy(false);
        setError("Redirecionamento OAuth inválido ou não autorizado.");
        return;
      }
      const target = safeNavigateToOAuthTarget(targetRaw);
      if (!target) {
        setBusy(false);
        setError("Redirecionamento OAuth inválido ou não autorizado.");
        return;
      }
      window.location.href = target;
    } catch (e) {
      setBusy(false);
      setError(friendlyAuthError(e instanceof Error ? e.message : "Falha ao concluir autorização."));
    }
  };

  const clientName = details?.client?.name ?? "aplicativo externo";
  const scopes = details?.scopes ?? (details?.scope ? details.scope.split(/\s+/) : []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full space-y-6 border border-border rounded-2xl p-8 bg-card">
        <div className="flex items-center justify-between">
          <OrusLogo />
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Autorização</p>
        </div>

        {error && (
          <div className="space-y-3">
            <h1 className="font-display text-2xl">Não foi possível carregar</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="lg" className="w-full" onClick={() => { window.location.href = "/"; }}>
              Voltar ao início
            </Button>
          </div>
        )}

        {!error && !details && (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        )}

        {!error && details && (
          <>
            <div className="space-y-2">
              <h1 className="font-display text-2xl">Conectar {clientName} à sua conta</h1>
              <p className="text-sm text-muted-foreground">
                Isso permite que <span className="text-foreground font-medium">{clientName}</span> use as ferramentas
                da Amada Amante como você. As permissões e políticas do sistema continuam valendo.
              </p>
            </div>

            {scopes.length > 0 && (
              <div className="rounded-lg border border-border p-4 text-xs space-y-1">
                <p className="uppercase tracking-widest text-muted-foreground">Permissões solicitadas</p>
                {scopes.map((s) => (
                  <p key={s} className="text-foreground">• {s}</p>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <Button variant="gold" size="lg" disabled={busy} onClick={() => decide(true)}>
                {busy ? "Conectando…" : "Aprovar e conectar"}
              </Button>
              <Button variant="outline" size="lg" disabled={busy} onClick={() => decide(false)}>
                Cancelar
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
