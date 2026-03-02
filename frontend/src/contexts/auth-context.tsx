"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { authApi } from "@/lib/auth/auth-api-client";
import {
  cancelScheduledRefresh,
  clearToken,
  decodeUser,
  getToken,
  restoreTokenFromCookie,
  scheduleRefresh,
  setToken,
} from "@/lib/auth/auth-token-manager";
import type { AuthUser } from "@/lib/auth/auth-types";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  handleTokenReceived: (token: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshPromise = useRef<Promise<void> | null>(null);

  const handleTokenReceived = useCallback((token: string) => {
    setToken(token);
    setUser(decodeUser(token));
    scheduleRefresh(doSilentRefresh, token);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const doSilentRefresh = useCallback(async () => {
    if (refreshPromise.current) return refreshPromise.current;

    refreshPromise.current = (async () => {
      try {
        const res = await authApi.refreshToken();
        handleTokenReceived(res.accessToken);
      } catch {
        clearToken();
        setUser(null);
        cancelScheduledRefresh();
      } finally {
        refreshPromise.current = null;
      }
    })();

    return refreshPromise.current;
  }, [handleTokenReceived]);

  // On mount: restore from cookie if valid, otherwise call /refresh via httpOnly cookie
  useEffect(() => {
    const cookieToken = restoreTokenFromCookie();
    if (cookieToken) {
      setUser(decodeUser(cookieToken));
      scheduleRefresh(doSilentRefresh, cookieToken);
      setIsLoading(false);
    } else {
      doSilentRefresh().finally(() => setIsLoading(false));
    }
  }, [doSilentRefresh]);

  const logout = useCallback(async () => {
    const token = getToken();
    cancelScheduledRefresh();
    clearToken();
    setUser(null);
    if (token) {
      try { await authApi.logout(token); } catch { /* best-effort */ }
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: user !== null, isLoading, handleTokenReceived, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
