import type { NextFunction, Request, Response } from "express";

import type { FeatureKey } from "../config/featureFlags.js";

// Map from FeatureKey to the corresponding FEATURE_* env var name.
const featureEnvKeys: Record<FeatureKey, string> = {
  userPreferences: "FEATURE_USER_PREFERENCES",
  samlAuth:        "FEATURE_SAML_AUTH",
  draftConfig:     "FEATURE_DRAFT_CONFIG",
  childActions:    "FEATURE_CHILD_ACTIONS",
  notifications:   "FEATURE_NOTIFICATIONS",
  csvImport:       "FEATURE_CSV_IMPORT",
  attachments:     "FEATURE_ATTACHMENTS",
  apiKeys:         "FEATURE_API_KEYS",
  webhooks:        "FEATURE_WEBHOOKS",
  savedViews:      "FEATURE_SAVED_VIEWS",
};

/**
 * Read the flag value directly from process.env at request time so that the
 * flag state reflects the current environment rather than a snapshot taken at
 * module-load time. This also makes the behaviour controllable in tests without
 * re-importing the module.
 */
function isFlagEnabled(feature: FeatureKey): boolean {
  return process.env[featureEnvKeys[feature]]?.toLowerCase() === "true";
}

export function requireFeature(feature: FeatureKey) {
  return (_req: Request, res: Response, next: NextFunction) => {
    if (!isFlagEnabled(feature)) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Not found." } });
      return;
    }
    next();
  };
}
