function flag(key: string): boolean {
  return process.env[key]?.toLowerCase() === "true";
}

export const featureFlags = {
  userPreferences: flag("FEATURE_USER_PREFERENCES"),
  samlAuth:        flag("FEATURE_SAML_AUTH"),
  draftConfig:     flag("FEATURE_DRAFT_CONFIG"),
  childActions:    flag("FEATURE_CHILD_ACTIONS"),
  notifications:   flag("FEATURE_NOTIFICATIONS"),
  csvImport:       flag("FEATURE_CSV_IMPORT"),
  attachments:     flag("FEATURE_ATTACHMENTS"),
  apiKeys:         flag("FEATURE_API_KEYS"),
  webhooks:        flag("FEATURE_WEBHOOKS"),
} as const;

export type FeatureKey = keyof typeof featureFlags;
