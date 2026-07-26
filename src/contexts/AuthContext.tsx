import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { sbLoose } from "@/lib/supabaseLoose";
import { clearAuthStorage, isRefreshTokenError } from "@/lib/authStorage";
import {
  beginSessionExpiryRedirect,
  endSessionExpiryRedirect,
  resolveSessionExpiryLoginPath,
  shouldTreatAsSessionExpiry,
} from "@/lib/authSession";
import {
  AppError,
  clearUserContext,
  setUserContext,
  showAppError,
} from "@/lib/errors";
import type { AppRole } from "@/lib/safeRedirect";
import { registerResellerWithReferral } from "@/lib/referralCode";

export type { AppRole };

export type AuthProfile = {
  user: User;
  session: Session;
  role: AppRole | null;
  roles: AppRole[];
  resellerId: string | null;
  referralCode: string | null;
  parentResellerId: string | null;
  storeId: string | null;
  storeSlug: string | null;
  displayName: string;
  email: string;
};

type SignInResult = { error?: string; roles?: AppRole[]; role?: AppRole | null };

type AuthContextValue = {
  loading: boolean;
  profile: AuthProfile | null;
  /** Roles vindas de user_roles (autoridade = banco). */
  roles: AppRole[];
  isAdmin: boolean;
  isReseller: boolean;
  hasRole: (role: AppRole) => boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signUp: (data: {
    email: string;
    password: string;
    displayName: string;
    phone?: string;
    /** @deprecated use referralCode */
    parentResellerId?: string;
    referralCode?: string;
  }) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  /** @deprecated use refreshUserRoles */
  refreshUserRole: () => Promise<AppRole[]>;
  refreshUserRoles: () => Promise<AppRole[]>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const loadExtras = async (user: User): Promise<Omit<AuthProfile, "user" | "session">> => {
  const [{ data: roleRows }, { data: reseller }, { data: store }, { data: prof }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase.from("resellers").select("id, parent_id, referral_code").eq("user_id", user.id).maybeSingle(),
    supabase.from("seller_stores").select("id, store_slug").eq("owner_user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
  ]);
  const roles = (roleRows ?? []).map((r) => r.role as AppRole);
  return {
    role: roles.includes("admin") ? "admin" : roles.includes("sacoleira") ? "sacoleira" : null,
    roles,
    resellerId: reseller?.id ?? null,
    referralCode: (reseller as { referral_code?: string | null } | null)?.referral_code ?? null,
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
  const manualSignOutRef = useRef(false);
  const hadSessionRef = useRef(false);
  const lastRoleRef = useRef<AppRole | null>(null);
  const hydrateInFlight = useRef<Promise<void> | null>(null);

  const handleSessionExpired = useCallback((reason: string) => {
    if (manualSignOutRef.current) return;
    if (!hadSessionRef.current) return;
    if (!shouldTreatAsSessionExpiry({
      manualSignOut: false,
      reason: reason as "refresh_invalid" | "signed_out_unexpected" | "auth_401" | "auth_403",
    })) {
      return;
    }
    if (!beginSessionExpiryRedirect()) return;

    hadSessionRef.current = false;
    clearAuthStorage();
    setSession(null);
    setProfile(null);

    const path = typeof window !== "undefined"
      ? window.location.pathname
      : "/";
    const loginUrl = resolveSessionExpiryLoginPath({
      lastRole: lastRoleRef.current,
      currentPath: path,
    });

    showAppError(
      new AppError({
        code: "AUTH_SESSION_EXPIRED",
        operation: "session_expired",
      }),
      { showCorrelation: false },
    );
    clearUserContext();
    window.setTimeout(() => {
      window.location.assign(loginUrl);
      endSessionExpiryRedirect();
    }, 50);
  }, []);

  useEffect(() => {
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (!isRefreshTokenError(event.reason)) return;
      event.preventDefault();
      if (manualSignOutRef.current) {
        clearAuthStorage();
        setSession(null);
        setProfile(null);
        return;
      }
      handleSessionExpired("refresh_invalid");
    };

    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => window.removeEventListener("unhandledrejection", onUnhandledRejection);
  }, [handleSessionExpired]);

  const hydrate = useCallback(async (s: Session | null) => {
    if (!s?.user) {
      setProfile(null);
      return;
    }
    const run = (async () => {
      const extras = await loadExtras(s.user);
      lastRoleRef.current = extras.role;
      setUserContext({
        userId: s.user.id,
        role: extras.role,
        resellerId: extras.resellerId ?? null,
        storeId: extras.storeId ?? null,
      });
      setProfile({ user: s.user, session: s, ...extras });
    })();
    hydrateInFlight.current = run;
    await run;
    hydrateInFlight.current = null;
  }, []);

  useEffect(() => {
    let lastUserId: string | null = null;
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (s?.user) {
        hadSessionRef.current = true;
      }
      setSession(s);

      if (event === "SIGNED_OUT") {
        lastUserId = null;
        if (manualSignOutRef.current) {
          manualSignOutRef.current = false;
          hadSessionRef.current = false;
          setProfile(null);
          return;
        }
        if (hadSessionRef.current) {
          handleSessionExpired("signed_out_unexpected");
        } else {
          setProfile(null);
        }
        return;
      }

      if (event === "TOKEN_REFRESHED" && !s) {
        handleSessionExpired("refresh_invalid");
        return;
      }

      const newUserId = s?.user?.id ?? null;
      if (newUserId !== lastUserId) {
        lastUserId = newUserId;
        setTimeout(() => { void hydrate(s); }, 0);
      }
    });

    supabase.auth.getSession()
      .then(async ({ data }) => {
        setSession(data.session);
        if (data.session?.user) hadSessionRef.current = true;
        lastUserId = data.session?.user?.id ?? null;
        await hydrate(data.session);
      })
      .catch((error) => {
        if (isRefreshTokenError(error) && !manualSignOutRef.current && hadSessionRef.current) {
          handleSessionExpired("refresh_invalid");
          return;
        }
        if (isRefreshTokenError(error)) clearAuthStorage();
        setSession(null);
        setProfile(null);
      })
      .finally(() => setLoading(false));

    return () => sub.subscription.unsubscribe();
  }, [handleSessionExpired, hydrate]);

  const refreshUserRoles = useCallback(async (): Promise<AppRole[]> => {
    const s = session ?? (await supabase.auth.getSession()).data.session;
    if (!s?.user) {
      setProfile(null);
      return [];
    }
    if (hydrateInFlight.current) await hydrateInFlight.current;
    const extras = await loadExtras(s.user);
    lastRoleRef.current = extras.role;
    setUserContext({
      userId: s.user.id,
      role: extras.role,
      resellerId: extras.resellerId ?? null,
      storeId: extras.storeId ?? null,
    });
    setProfile({ user: s.user, session: s, ...extras });
    return extras.roles;
  }, [session]);

  const value = useMemo<AuthContextValue>(() => {
    const roles = profile?.roles ?? [];
    const hasRole = (role: AppRole) => roles.includes(role);
    return {
      loading,
      profile,
      roles,
      isAdmin: hasRole("admin"),
      isReseller: hasRole("sacoleira"),
      hasRole,
      signIn: async (email, password) => {
        clearAuthStorage();
        manualSignOutRef.current = false;
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };
        if (data.session) {
          hadSessionRef.current = true;
          setSession(data.session);
          await hydrate(data.session);
          const extras = await loadExtras(data.session.user);
          lastRoleRef.current = extras.role;
          return { roles: extras.roles, role: extras.role };
        }
        return {};
      },
      signUp: async ({ email, password, displayName, phone, parentResellerId, referralCode }) => {
        const code = (referralCode || parentResellerId || "").trim();
        if (!code) {
          return { error: "Informe o código de indicação da sua patrocinadora." };
        }
        return registerResellerWithReferral({
          fullName: displayName,
          email,
          phone,
          password,
          referralCode: code,
        });
      },
      signOut: async () => {
        manualSignOutRef.current = true;
        hadSessionRef.current = false;
        try {
          await supabase.auth.signOut();
        } finally {
          clearAuthStorage();
          clearUserContext();
          setSession(null);
          setProfile(null);
        }
      },
      refresh: async () => { await hydrate(session); },
      refreshUserRole: refreshUserRoles,
      refreshUserRoles,
    };
  }, [loading, profile, session, hydrate, refreshUserRoles]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
