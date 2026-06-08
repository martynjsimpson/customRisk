import { useQuery } from "@tanstack/react-query";

import { getMyPreferences } from "../api/preferences.api";
import { useAuth } from "../auth/session";

export const PREFERENCES_QUERY_KEY = ["preferences"] as const;

export function usePreferences() {
  const { accessToken, enabledFeatures } = useAuth();
  const { data } = useQuery({
    queryKey: PREFERENCES_QUERY_KEY,
    queryFn: getMyPreferences,
    enabled: !!accessToken && !!enabledFeatures?.userPreferences,
    staleTime: Infinity,
  });
  return data ?? null;
}
