import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "sacoleira";

export type AuthProfile = {
  user: User;
  session: Session;
  role: AppRole | null;
  roles: AppRole[];
  resellerId: string | null;
  parentResellerId: string | null;
  storeId: string | null;
  storeSlug: string | null;
  displayName: string;
  email: string;
};

type AuthContextValue = {
  loading: boolean;
  profile: AuthProfile | null;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (data: { email: string; password: string; displayName: string; phone?: string; parentResellerId?: string }) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const loadExtras = async (user: User): Promise<Omit<AuthProfile, "user" | "session">> => {
  const [{ data: roleRows }, { data: reseller }, { data: store }, { data: prof }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase.from("resellers").select("id, parent_id").eq("user_id", user.id).maybeSingle(),
    supabase.from("seller_stores").select("id, store_slug").eq("owner_user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
  ]);
  const roles = (roleRows ?? []).map((r) => r.role as AppRole);
  return {
    role: roles.includes("admin") ? "admin" : roles.includes("sacoleira") ? "sacoleira" : null,
    roles,
    resellerId: reseller?.id ?? null,
    parentResellerId: (reseller as { parent_id?: string | null } | null)?.parent_id ?? null,
    storeId: store?.id ?? null,
    storeSlug: store?.store_slug ?? null,
    displayName: prof?.display_name || user.email?.split("@")[0] || "",
    email: user.email || "",
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrate = async (s: Session | null) => {
    if (!s?.user) { setProfile(null); return; }
    const extras = await loadExtras(s.user);
    setProfile({ user: s.user, session: s, ...extras });
  };

  useEffect(() => {
    let lastUserId: string | null = null;
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      // Only re-hydrate profile when the user actually changes (sign in/out),
      // not on every TOKEN_REFRESHED — that caused a refresh storm and lock contention.
      const newUserId = s?.user?.id ?? null;
      if (event === "SIGNED_OUT" || newUserId !== lastUserId) {
        lastUserId = newUserId;
        setTimeout(() => { void hydrate(s); }, 0);
      }
    });
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      lastUserId = data.session?.user?.id ?? null;
      await hydrate(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    loading,
    profile,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? { error: error.message } : {};
    },
    signUp: async ({ email, password, displayName, phone, parentResellerId }) => {
      const redirectUrl = `${window.location.origin}/sacoleira`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { display_name: displayName, phone, role: "sacoleira", parent_reseller_id: parentResellerId || null },
        },
      });
      return error ? { error: error.message } : {};
    },
    signOut: async () => { await supabase.auth.signOut(); },
    refresh: async () => { await hydrate(session); },
  }), [loading, profile, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
