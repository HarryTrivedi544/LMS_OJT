"use client";

import type { AuthUser } from "@lms/api-contracts";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  login as loginRequest,
  logout as logoutRequest,
  refreshSession,
} from "../../lib/api";

type AuthState = {
  accessToken: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setSession = useCallback((token: string, nextUser: AuthUser) => {
    setAccessToken(token);
    setUser(nextUser);
    setError(null);
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    const tokens = await refreshSession();
    setSession(tokens.accessToken, tokens.user);
  }, [setSession]);

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const tokens = await refreshSession();
        if (isMounted) {
          setSession(tokens.accessToken, tokens.user);
        }
      } catch {
        if (isMounted) {
          clearSession();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, [clearSession, setSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const tokens = await loginRequest(email, password);
        setSession(tokens.accessToken, tokens.user);
      } catch (loginError) {
        const message =
          loginError instanceof Error ? loginError.message : "Login failed.";
        setError(message);
        clearSession();
        throw loginError;
      } finally {
        setIsLoading(false);
      }
    },
    [clearSession, setSession],
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await logoutRequest();
    } finally {
      clearSession();
      setIsLoading(false);
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({
      accessToken,
      user,
      isLoading,
      error,
      login,
      logout,
      refresh,
    }),
    [accessToken, error, isLoading, login, logout, refresh, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
};
