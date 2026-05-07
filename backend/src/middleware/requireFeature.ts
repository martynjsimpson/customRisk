import type { Request, Response, NextFunction } from "express";

import { featureFlags, type FeatureFlagKey } from "../config/featureFlags.js";

export function requireFeature(feature: FeatureFlagKey) {
  return (_request: Request, response: Response, next: NextFunction) => {
    if (!featureFlags[feature]) {
      response.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Not found."
        }
      });
      return;
    }

    next();
  };
}
