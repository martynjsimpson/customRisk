import pino from "pino";

import { getObservabilityBindings } from "../observability/requestContext.js";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "test" ? "silent" : "info"),
  base: undefined,
  mixin: () => getObservabilityBindings()
});
