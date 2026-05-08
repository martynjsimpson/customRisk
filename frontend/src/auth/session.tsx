import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { getCurrentUser, login as loginRequest, logout as logoutRequest, refreshSession } from "../api/auth.api";
import { getMyPreferences } from "../api/preferences.api";

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

export interface UserPreferences {
  colorScheme?: "light" | "dark" | "auto";
}

export interface EnabledFeatures {
  userPreferences: boolean;
  samlAuth: boolean;
  draftConfig: boolean;
  childActions: boolean;
  notifications: boolean;
  csvImport: boolean;
  attachments: boolean;
  apiKeys: boolean;
  webhooks: boolean;
}

interface AuthContextValue {
  accessToken: string | null;
  user: CurrentUser | null;
  permissions: CurrentPermissions | null;
  enabledFeatures: EnabledFeatures | null;
  preferences: UserPreferences | null;
  setPreferences: (prefs: UserPreferences | null) => void;
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
  const [enabledFeatures, setEnabledFeatures] = useState<EnabledFeatures | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
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
        }
        if (!cancelled && session.enabledFeatures.userPreferences) {
          try {
            const prefs = await getMyPreferences();
            if (!cancelled) setPreferences(prefs);
          } catch {
            // Preference load failure must not block the app
          }
        } else if (!cancelled) {
          setPreferences(null);
        }
      } catch {
        if (!cancelled) {
          setAccessToken(null);
          setUser(null);
          setPermissions(null);
          setEnabledFeatures(null);
          setPreferences(null);
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
      setEnabledFeatures(session.enabledFeatures);
      if (session.enabledFeatures.userPreferences) {
        try {
          const prefs = await getMyPreferences();
          setPreferences(prefs);
        } catch {
          // non-fatal
        }
      } else {
        setPreferences(null);
      }
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
      setEnabledFeatures(null);
      setPreferences(null);
    }
  }, [setAccessToken]);

  const value = useMemo(
    () => ({
      accessToken,
      user,
      permissions,
      enabledFeatures,
      preferences,
      setPreferences,
      isBootstrapping,
      login,
      logout,
      setAccessToken
    }),
    [accessToken, enabledFeatures, isBootstrapping, login, logout, permissions, preferences, setAccessToken, user]
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
