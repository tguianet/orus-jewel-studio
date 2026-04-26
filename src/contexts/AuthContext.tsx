import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { sacoleiras } from "@/lib/mockData";

export type MockRole = "admin" | "sacoleira";

export type MockUser = {
  id: string;
  role: MockRole;
  name: string;
  email: string;
  storeSlug?: string;
};

type AuthContextValue = {
  user: MockUser | null;
  login: (role: MockRole, email?: string) => MockUser;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<MockUser | null>(null);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    login: (role, email) => {
      const seller = sacoleiras[0];
      const nextUser: MockUser = role === "admin"
        ? { id: "admin-demo", role: "admin", name: "Aura Store Suite", email: email || "admin@aurastore.com" }
        : { id: seller?.id || "seller-demo", role: "sacoleira", name: seller?.name || "Marina Costa", email: email || seller?.email || "marina@email.com", storeSlug: seller?.storeSlug || "marina-aura" };

      setUser(nextUser);
      return nextUser;
    },
    logout: () => setUser(null),
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};

export const useOptionalAuth = () => useContext(AuthContext);