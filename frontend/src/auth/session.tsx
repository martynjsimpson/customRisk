import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { getCurrentUser, login as loginRequest, logout as logoutRequest, refreshSession } from "../api/auth.api";
import type {
  CurrentPermissions,
  CurrentUser,
  EnabledFeatures
} from "../api/contracts";
import { getMyPreferences } from "../api/preferences.api";
import { PREFERENCES_QUERY_KEY } from "../hooks/usePreferences";

interface AuthContextValue {
  accessToken: string | null;
  user: CurrentUser | null;
  permissions: CurrentPermissions | null;
  enabledFeatures: EnabledFeatures | null;
  appEnvironment: "development" | "production" | null;
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
  const queryClient = useQueryClient();
  const [accessToken, setAccessTokenState] = useState<string | null>(memoryAccessToken);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [permissions, setPermissions] = useState<CurrentPermissions | null>(null);
  const [enabledFeatures, setEnabledFeatures] = useState<EnabledFeatures | null>(null);
  const [appEnvironment, setAppEnvironment] = useState<"development" | "production" | null>(null);
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
          setEnabledFeatures(session.enabledFeatures);
          setAppEnvironment(session.appEnvironment);
        }
        if (!cancelled && session.enabledFeatures.userPreferences) {
          try {
            const prefs = await getMyPreferences();
            if (!cancelled) queryClient.setQueryData(PREFERENCES_QUERY_KEY, prefs);
          } catch {
            // Preference load failure must not block the app
          }
        }
      } catch {
        if (!cancelled) {
          setAccessToken(null);
          setUser(null);
          setPermissions(null);
          setEnabledFeatures(null);
          setAppEnvironment(null);
          queryClient.removeQueries({ queryKey: PREFERENCES_QUERY_KEY });
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
  }, [setAccessToken, queryClient]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginRequest({ email, password });
      setAccessToken(result.accessToken);
      const session = await getCurrentUser();
      setUser(session.user);
      setPermissions(session.permissions);
      setEnabledFeatures(session.enabledFeatures);
      setAppEnvironment(session.appEnvironment);
      if (session.enabledFeatures.userPreferences) {
        try {
          const prefs = await getMyPreferences();
          queryClient.setQueryData(PREFERENCES_QUERY_KEY, prefs);
        } catch {
          // non-fatal
        }
      }
    },
    [setAccessToken, queryClient]
  );

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setAccessToken(null);
      setUser(null);
      setPermissions(null);
      setEnabledFeatures(null);
      setAppEnvironment(null);
      queryClient.removeQueries({ queryKey: PREFERENCES_QUERY_KEY });
    }
  }, [setAccessToken, queryClient]);

  const value = useMemo(
    () => ({
      accessToken,
      user,
      permissions,
      enabledFeatures,
      appEnvironment,
      isBootstrapping,
      login,
      logout,
      setAccessToken
    }),
    [accessToken, appEnvironment, enabledFeatures, isBootstrapping, login, logout, permissions, setAccessToken, user]
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
