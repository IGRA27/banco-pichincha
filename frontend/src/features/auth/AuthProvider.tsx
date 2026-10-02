import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "@/features/onboarding/api";
import { clearToken, getStoredUser, getToken, onUnauthorized, setToken } from "./token";

interface AuthState {
  user: string | null;
  /** True when the user was signed out because the token expired or was rejected. */
  expired: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null>(() => (getToken() ? getStoredUser() ?? "" : null));
  const [expired, setExpired] = useState(false);

  useEffect(
    () =>
      onUnauthorized(() => {
        setUser(null);
        setExpired(true);
      }),
    [],
  );

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.login(username, password);
    setToken(res.access_token, res.username);
    setExpired(false);
    setUser(res.username);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setExpired(false);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, expired, login, logout }), [user, expired, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
