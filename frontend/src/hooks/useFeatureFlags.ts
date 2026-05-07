import { useAuth } from "../auth/session";
import type { EnabledFeatures } from "../auth/session";

const allOff: EnabledFeatures = {
  userPreferences: false,
  samlAuth:        false,
  draftConfig:     false,
  childActions:    false,
  notifications:   false,
  csvImport:       false,
  attachments:     false,
  apiKeys:         false,
  webhooks:        false,
};

export function useFeatureFlags(): EnabledFeatures {
  const { enabledFeatures } = useAuth();
  return enabledFeatures ?? allOff;
}
