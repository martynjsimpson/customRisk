import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { getCurrentUser, login as loginRequest, logout as logoutRequest, refreshSession } from "../api/auth.api";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  isSystemAdmin: boolean;
  isActive: boolean;
}

export interface CurrentPermissions {
  isSystemAdmin: boolean;
  registerRoles: Array<{
    registerId: string;
    role: "REGISTER_ADMIN" | "REGISTER_VIEWER";
  }>;
}

interface AuthContextValue {
  accessToken: string | null;
  user: CurrentUser | null;
  permissions: CurrentPermissions | null;
  isBootstrapping: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setAccessToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

let memoryAccessToken: string | null = null;

export function getAccessToken() {
  return memoryAccessToken;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessTokenState] = useState<string | null>(memoryAccessToken);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [permissions, setPermissions] = useState<CurrentPermissions | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const setAccessToken = useCallback((token: string | null) => {
    memoryAccessToken = token;
    setAccessTokenState(token);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const refreshed = await refreshSession();
        if (cancelled) {
          return;
        }

        setAccessToken(refreshed.accessToken);
        const session = await getCurrentUser();
        if (!cancelled) {
          setUser(session.user);
          setPermissions(session.permissions);
        }
      } catch {
        if (!cancelled) {
          setAccessToken(null);
          setUser(null);
          setPermissions(null);
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [setAccessToken]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginRequest({ email, password });
      setAccessToken(result.accessToken);
      const session = await getCurrentUser();
      setUser(session.user);
      setPermissions(session.permissions);
    },
    [setAccessToken]
  );

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setAccessToken(null);
      setUser(null);
      setPermissions(null);
    }
  }, [setAccessToken]);

  const value = useMemo(
    () => ({
      accessToken,
      user,
      permissions,
      isBootstrapping,
      login,
      logout,
      setAccessToken
    }),
    [accessToken, isBootstrapping, login, logout, permissions, setAccessToken, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return value;
}
