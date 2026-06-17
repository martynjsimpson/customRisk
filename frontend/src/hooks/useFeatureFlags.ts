import { useAuth } from "../auth/session";
import type { EnabledFeatures } from "../api/contracts";

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
  savedViews:      false,
};

export function useFeatureFlags(): EnabledFeatures {
  const { enabledFeatures } = useAuth();
  return enabledFeatures ?? allOff;
}
