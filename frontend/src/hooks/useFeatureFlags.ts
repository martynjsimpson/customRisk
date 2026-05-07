import { useAuth } from "../auth/session";

export function useFeatureFlags() {
  const { enabledFeatures } = useAuth();

  return enabledFeatures;
}
