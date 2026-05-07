import type { NextFunction, Request, Response } from "express";

import { featureFlags } from "../config/featureFlags.js";
import type { FeatureKey } from "../config/featureFlags.js";

export function requireFeature(feature: FeatureKey) {
  return (_req: Request, res: Response, next: NextFunction) => {
    if (!featureFlags[feature]) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Not found." } });
      return;
    }
    next();
  };
}
